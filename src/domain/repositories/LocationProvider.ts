import type { Fix, FixSource } from '../tracking/entities';

export type ProviderEvent =
  | { type: 'fix'; fix: Fix }
  | { type: 'no-fix'; reason: string }
  | { type: 'finished' };

/** Puerto: de dónde salen las posiciones (GPS del teléfono o simulación). */
export interface LocationProvider {
  readonly source: FixSource;
  /** Empieza a emitir eventos. Devuelve la función para detenerse. Lanza si no hay permiso. */
  start(onEvent: (event: ProviderEvent) => void): Promise<() => void>;
}
