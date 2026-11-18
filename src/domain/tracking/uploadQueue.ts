import type { Fix } from './entities';

/**
 * Cola "guardar y reenviar": los puntos se acumulan en el teléfono y se envían por lotes.
 * Enviar de a uno gastaría batería y datos; sin cobertura, nada se pierde.
 */
export class UploadQueue {
  private pending: Fix[] = [];
  private oldestPendingAt: number | null = null;

  constructor(
    readonly batchSize = 5,
    readonly maxWaitMs = 10_000,
  ) {}

  get size(): number {
    return this.pending.length;
  }

  add(fix: Fix): void {
    if (this.pending.length === 0) this.oldestPendingAt = fix.timestamp;
    this.pending.push(fix);
  }

  /** Toma un lote si hay conexión y ya es momento de enviar; si no, devuelve null. */
  takeBatch(online: boolean, now: number, force = false): Fix[] | null {
    if (!online || this.pending.length === 0) return null;
    const waited = this.oldestPendingAt !== null && now - this.oldestPendingAt >= this.maxWaitMs;
    if (!force && !waited && this.pending.length < this.batchSize) return null;

    const batch = force ? this.pending : this.pending.slice(0, this.batchSize);
    this.pending = force ? [] : this.pending.slice(batch.length);
    this.oldestPendingAt = this.pending[0]?.timestamp ?? null;
    return batch;
  }

  /** Devuelve a la cola un lote que no se pudo enviar. */
  restore(batch: Fix[]): void {
    this.pending = [...batch, ...this.pending];
    this.oldestPendingAt = this.pending[0]?.timestamp ?? null;
  }
}
