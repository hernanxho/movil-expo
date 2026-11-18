import { fromLocal, type LatLon, type LocalPoint } from '../../domain/geo/geo';
import type { Environment } from '../../domain/gnss/constellation';
import type { Geofence } from '../../domain/tracking/entities';

/** Centro de referencia de la simulación: Universidad del Norte, Barranquilla. */
export const ORIGIN: LatLon = { latitude: 11.0192, longitude: -74.8505 };

export type RouteLeg = {
  to: LocalPoint;
  environment: Environment;
  label: string;
};

/** Recorrido en metros respecto al origen (x: este, y: norte). Cada tramo tiene su entorno. */
export const ROUTE_START: LocalPoint = { x: -650, y: 420 };

export const ROUTE: RouteLeg[] = [
  { to: { x: -300, y: 420 }, environment: 'open', label: 'Avenida' },
  { to: { x: -300, y: 150 }, environment: 'open', label: 'Parqueadero' },
  { to: { x: -80, y: 40 }, environment: 'urban', label: 'Entre edificios' },
  { to: { x: 120, y: -120 }, environment: 'open', label: 'Campus' },
  { to: { x: 420, y: -120 }, environment: 'open', label: 'Vía principal' },
  { to: { x: 420, y: 60 }, environment: 'tunnel', label: 'Paso subterráneo' },
  { to: { x: 420, y: 300 }, environment: 'urban', label: 'Zona de torres' },
  { to: { x: -100, y: 380 }, environment: 'open', label: 'Regreso' },
];

export const SIMULATED_GEOFENCES: Geofence[] = [
  { id: 'campus', name: 'Campus', center: fromLocal(ORIGIN, { x: 0, y: 0 }), radiusM: 200 },
  { id: 'parqueadero', name: 'Parqueadero', center: fromLocal(ORIGIN, { x: -300, y: 300 }), radiusM: 50 },
  { id: 'destino', name: 'Destino', center: fromLocal(ORIGIN, { x: -100, y: 380 }), radiusM: 40 },
];

export type RoutePosition = {
  point: LocalPoint;
  headingDeg: number;
  leg: RouteLeg;
};

/** Posición sobre el recorrido después de avanzar `distanceM`; null si ya terminó. */
export function positionAlongRoute(distanceM: number): RoutePosition | null {
  let from = ROUTE_START;
  let remaining = distanceM;
  for (const leg of ROUTE) {
    const dx = leg.to.x - from.x;
    const dy = leg.to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (remaining <= length) {
      const k = remaining / length;
      return {
        point: { x: from.x + dx * k, y: from.y + dy * k },
        headingDeg: ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360,
        leg,
      };
    }
    remaining -= length;
    from = leg.to;
  }
  return null;
}
