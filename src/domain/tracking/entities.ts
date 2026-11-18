import type { LatLon } from '../geo/geo';
import type { Environment } from '../gnss/constellation';

export type FixSource = 'simulated' | 'device';

/** Una posición entregada por el receptor GNSS (un "fix"). */
export type Fix = LatLon & {
  /** Radio de error estimado en metros (lo que Android/iOS llaman accuracy). */
  accuracyM: number | null;
  speedMps: number | null;
  headingDeg: number | null;
  /** Milisegundos desde 1970. */
  timestamp: number;
  satellitesUsed: number | null;
  environment: Environment | null;
};

/** Zona circular que dispara un aviso al entrar o salir (geocerca). */
export type Geofence = {
  id: string;
  name: string;
  center: LatLon;
  radiusM: number;
};

export type ZoneEvent = {
  zone: Geofence;
  type: 'enter' | 'exit';
  timestamp: number;
};

export type LogKind = 'zone' | 'filter' | 'upload' | 'signal' | 'info';

export type LogEntry = {
  id: number;
  timestamp: number;
  kind: LogKind;
  text: string;
};
