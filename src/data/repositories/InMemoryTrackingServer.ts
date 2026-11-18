import type { TrackingServer } from '../../domain/repositories/TrackingServer';
import type { Fix } from '../../domain/tracking/entities';

/** Servidor de rastreo simulado: guarda los puntos en memoria tras una pequeña latencia de red. */
export class InMemoryTrackingServer implements TrackingServer {
  private readonly points = new Map<string, Fix[]>();

  constructor(private readonly latencyMs = 250) {}

  async upload(deviceId: string, batch: readonly Fix[]): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    this.points.set(deviceId, [...(this.points.get(deviceId) ?? []), ...batch]);
  }

  received(deviceId: string): readonly Fix[] {
    return this.points.get(deviceId) ?? [];
  }
}
