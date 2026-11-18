import { ExpoLocationProvider } from '../data/providers/ExpoLocationProvider';
import { SimulatedGnssProvider } from '../data/providers/SimulatedGnssProvider';
import { ORIGIN, ROUTE, ROUTE_START, SIMULATED_GEOFENCES } from '../data/providers/simulatedRoute';
import { InMemoryTrackingServer } from '../data/repositories/InMemoryTrackingServer';
import { fromLocal, type LatLon } from '../domain/geo/geo';
import type { FixSource } from '../domain/tracking/entities';
import { TrackingSession } from '../domain/usecases/TrackingSession';

const trackingServer = new InMemoryTrackingServer();

/** Composition root: cablea implementaciones de datos al caso de uso del dominio. */
export function createTrackingSession(source: FixSource): TrackingSession {
  const provider = source === 'simulated' ? new SimulatedGnssProvider() : new ExpoLocationProvider();
  return new TrackingSession(provider, trackingServer, {
    deviceId: `telefono-${source}`,
    geofences: source === 'simulated' ? SIMULATED_GEOFENCES : 'auto',
  });
}

/** Ruta prevista de la simulación, para dibujarla de fondo en el mapa. */
export const PLANNED_ROUTE: LatLon[] = [ROUTE_START, ...ROUTE.map((leg) => leg.to)].map((p) => fromLocal(ORIGIN, p));

/** Geocercas de la simulación, para mostrarlas antes de iniciar. */
export const SIMULATED_ZONES = SIMULATED_GEOFENCES;

/** Posición verdadera del receptor en el laboratorio de satélites. */
export const LAB_RECEIVER: LatLon = ORIGIN;
