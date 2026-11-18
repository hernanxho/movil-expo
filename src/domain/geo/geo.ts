/** Coordenada geográfica en grados decimales (WGS84). */
export type LatLon = {
  latitude: number;
  longitude: number;
};

/** Punto en un plano local, en metros: x hacia el este, y hacia el norte. */
export type LocalPoint = {
  x: number;
  y: number;
};

/** Radio medio de la Tierra en metros. */
export const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Distancia sobre la superficie entre dos puntos (fórmula del haversine). */
export function haversineDistance(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rumbo inicial de a hacia b, en grados desde el norte (0–360). */
export function bearing(a: LatLon, b: LatLon): number {
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const Δλ = toRad(b.longitude - a.longitude);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Punto al que se llega saliendo de `from` con un rumbo y una distancia dados. */
export function destination(from: LatLon, bearingDeg: number, distanceM: number): LatLon {
  const δ = distanceM / EARTH_RADIUS_M;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(from.latitude);
  const λ1 = toRad(from.longitude);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 =
    λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { latitude: toDeg(φ2), longitude: ((toDeg(λ2) + 540) % 360) - 180 };
}

/** Proyecta a metros alrededor de un origen (válido para distancias de pocos km). */
export function toLocal(origin: LatLon, p: LatLon): LocalPoint {
  return {
    x: toRad(p.longitude - origin.longitude) * EARTH_RADIUS_M * Math.cos(toRad(origin.latitude)),
    y: toRad(p.latitude - origin.latitude) * EARTH_RADIUS_M,
  };
}

/** Inversa de `toLocal`. */
export function fromLocal(origin: LatLon, p: LocalPoint): LatLon {
  return {
    latitude: origin.latitude + toDeg(p.y / EARTH_RADIUS_M),
    longitude: origin.longitude + toDeg(p.x / (EARTH_RADIUS_M * Math.cos(toRad(origin.latitude)))),
  };
}
