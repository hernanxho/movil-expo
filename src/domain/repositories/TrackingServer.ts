import type { Fix } from '../tracking/entities';

/** Puerto: el servidor de la plataforma de rastreo que recibe los puntos. */
export interface TrackingServer {
  upload(deviceId: string, batch: readonly Fix[]): Promise<void>;
}
