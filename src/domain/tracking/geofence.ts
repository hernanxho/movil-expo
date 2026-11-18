import { haversineDistance, type LatLon } from '../geo/geo';
import type { Geofence, ZoneEvent } from './entities';

/** Margen para salir de una zona: evita avisos repetidos cuando el punto oscila en el borde. */
export const EXIT_MARGIN_M = 5;

/** Compara la posición con cada geocerca y devuelve las entradas y salidas. */
export function updateZones(
  inside: ReadonlySet<string>,
  fences: readonly Geofence[],
  position: LatLon,
  timestamp: number,
): { inside: Set<string>; events: ZoneEvent[] } {
  const next = new Set(inside);
  const events: ZoneEvent[] = [];
  for (const zone of fences) {
    const d = haversineDistance(zone.center, position);
    const wasInside = inside.has(zone.id);
    if (!wasInside && d <= zone.radiusM) {
      next.add(zone.id);
      events.push({ zone, type: 'enter', timestamp });
    } else if (wasInside && d > zone.radiusM + EXIT_MARGIN_M) {
      next.delete(zone.id);
      events.push({ zone, type: 'exit', timestamp });
    }
  }
  return { inside: next, events };
}
