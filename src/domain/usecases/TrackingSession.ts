import type { LocationProvider, ProviderEvent } from '../repositories/LocationProvider';
import type { TrackingServer } from '../repositories/TrackingServer';
import type { Fix, FixSource, Geofence, LogEntry, LogKind } from '../tracking/entities';
import { FixFilter, type RejectReason } from '../tracking/fixFilter';
import { updateZones } from '../tracking/geofence';
import { summarizeTrack, type TrackStats } from '../tracking/trackStats';
import { UploadQueue } from '../tracking/uploadQueue';

export type RejectedFix = Fix & { reason: RejectReason };

export type TrackingSnapshot = {
  source: FixSource;
  status: 'starting' | 'running' | 'stopped';
  online: boolean;
  signalLost: boolean;
  /** Último punto crudo recibido, aceptado o no. */
  lastFix: Fix | null;
  track: Fix[];
  rejected: RejectedFix[];
  stationary: number;
  rawCount: number;
  geofences: Geofence[];
  insideZones: string[];
  stats: TrackStats;
  pending: number;
  sent: number;
  batches: number;
  uploading: boolean;
  log: LogEntry[];
};

type Options = {
  deviceId: string;
  /** Zonas fijas, o 'auto' para crear una alrededor del primer punto. */
  geofences: Geofence[] | 'auto';
  autoGeofenceRadiusM?: number;
  queue?: UploadQueue;
  filter?: FixFilter;
};

const MAX_LOG = 120;
const REASON_LABEL: Record<RejectReason, string> = {
  accuracy: 'Punto descartado por baja precisión',
  jump: 'Punto descartado por salto imposible',
  stationary: 'Sin movimiento',
};

/**
 * Caso de uso principal: el ciclo de una app de rastreo.
 * Posición → filtro → recorrido → geocercas → cola → servidor.
 */
export class TrackingSession {
  private readonly filter: FixFilter;
  private readonly queue: UploadQueue;
  private stopProvider: (() => void) | null = null;
  private listeners = new Set<(s: TrackingSnapshot) => void>();
  private logId = 0;
  private inside = new Set<string>();
  private snapshot: TrackingSnapshot;

  constructor(
    private readonly provider: LocationProvider,
    private readonly server: TrackingServer,
    private readonly options: Options,
  ) {
    this.filter = options.filter ?? new FixFilter();
    this.queue = options.queue ?? new UploadQueue();
    this.snapshot = {
      source: provider.source,
      status: 'stopped',
      online: true,
      signalLost: false,
      lastFix: null,
      track: [],
      rejected: [],
      stationary: 0,
      rawCount: 0,
      geofences: options.geofences === 'auto' ? [] : options.geofences,
      insideZones: [],
      stats: summarizeTrack([]),
      pending: 0,
      sent: 0,
      batches: 0,
      uploading: false,
      log: [],
    };
  }

  getSnapshot(): TrackingSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (s: TrackingSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start(): Promise<void> {
    this.update({ status: 'starting' });
    try {
      this.stopProvider = await this.provider.start((event) => this.handle(event));
      this.update({ status: 'running' });
      this.log('info', this.provider.source === 'simulated' ? 'Recorrido simulado iniciado' : 'GPS del teléfono activado');
    } catch (error) {
      this.update({ status: 'stopped' });
      throw error;
    }
  }

  stop(): void {
    if (this.snapshot.status === 'stopped') return;
    this.stopProvider?.();
    this.stopProvider = null;
    this.update({ status: 'stopped' });
    this.log('info', 'Rastreo detenido');
    void this.flush(true);
  }

  /** Simula activar o apagar los datos móviles del teléfono. */
  setOnline(online: boolean): void {
    if (online === this.snapshot.online) return;
    this.update({ online });
    if (online) {
      this.log('upload', `Conexión recuperada: se envían ${this.queue.size} punto(s) guardados`);
      void this.flush(true);
    } else {
      this.log('upload', 'Sin datos móviles: los puntos se guardan en el teléfono');
    }
  }

  private handle(event: ProviderEvent): void {
    if (event.type === 'finished') {
      this.log('info', 'Fin del recorrido');
      this.stop();
      return;
    }
    if (event.type === 'no-fix') {
      if (!this.snapshot.signalLost) {
        this.update({ signalLost: true });
        this.log('signal', `Sin posición: ${event.reason}`);
      }
      return;
    }
    this.handleFix(event.fix);
  }

  private handleFix(fix: Fix): void {
    const s = this.snapshot;
    if (s.signalLost) {
      this.log('signal', `Señal recuperada${fix.satellitesUsed ? ` con ${fix.satellitesUsed} satélites` : ''}`);
    }

    const decision = this.filter.evaluate(fix);
    const base = { lastFix: fix, rawCount: s.rawCount + 1, signalLost: false };

    if (!decision.accepted) {
      if (decision.reason === 'stationary') {
        this.update({ ...base, stationary: s.stationary + 1 });
      } else {
        this.update({ ...base, rejected: [...s.rejected, { ...fix, reason: decision.reason }] });
        this.log('filter', `${REASON_LABEL[decision.reason]}: ${decision.detail}`);
      }
      return;
    }

    let geofences = s.geofences;
    if (this.options.geofences === 'auto' && geofences.length === 0) {
      geofences = [
        {
          id: 'inicio',
          name: 'Punto de partida',
          center: { latitude: fix.latitude, longitude: fix.longitude },
          radiusM: this.options.autoGeofenceRadiusM ?? 25,
        },
      ];
      this.log('zone', `Geocerca creada: ${geofences[0].radiusM} m alrededor del punto de partida`);
    }

    const zones = updateZones(this.inside, geofences, fix, fix.timestamp);
    this.inside = zones.inside;
    for (const e of zones.events) {
      this.log('zone', `${e.type === 'enter' ? 'Entró a' : 'Salió de'} ${e.zone.name}`);
    }

    const track = [...s.track, fix];
    this.queue.add(fix);
    this.update({
      ...base,
      track,
      geofences,
      insideZones: [...this.inside],
      stats: summarizeTrack(track),
      pending: this.queue.size,
    });
    void this.flush(false);
  }

  private async flush(force: boolean): Promise<void> {
    if (this.snapshot.uploading) return;
    const now = this.snapshot.lastFix?.timestamp ?? Date.now();
    const batch = this.queue.takeBatch(this.snapshot.online, now, force);
    if (!batch) return;

    this.update({ uploading: true, pending: this.queue.size });
    try {
      await this.server.upload(this.options.deviceId, batch);
      this.update({ sent: this.snapshot.sent + batch.length, batches: this.snapshot.batches + 1 });
      this.log('upload', `Lote #${this.snapshot.batches} enviado al servidor: ${batch.length} punto(s)`);
    } catch {
      this.queue.restore(batch);
      this.log('upload', 'Falló el envío; el lote vuelve a la cola');
    } finally {
      this.update({ uploading: false, pending: this.queue.size });
    }
    if (this.queue.size > 0) void this.flush(force || this.snapshot.status === 'stopped');
  }

  private log(kind: LogKind, text: string): void {
    const entry: LogEntry = {
      id: ++this.logId,
      timestamp: this.snapshot.lastFix?.timestamp ?? Date.now(),
      kind,
      text,
    };
    this.update({ log: [entry, ...this.snapshot.log].slice(0, MAX_LOG) });
  }

  private update(patch: Partial<TrackingSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const l of this.listeners) l(this.snapshot);
  }
}
