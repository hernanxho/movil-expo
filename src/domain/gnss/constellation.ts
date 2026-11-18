import type { LatLon } from '../geo/geo';
import { enuBasis, geodeticToEcef } from './coordinates';
import { add, dot, norm, scale, type Vec3 } from './linalg';

/** Radio de la órbita de los satélites GPS (~20 200 km de altura). */
export const GPS_ORBIT_RADIUS_M = 26_560_000;

export type Satellite = {
  prn: number;
  azimuthDeg: number;
  elevationDeg: number;
  /** Posición ECEF: la que el satélite transmite en sus efemérides. */
  position: Vec3;
};

/** Entorno del receptor: decide qué satélites tienen línea de vista. */
export type Environment = 'open' | 'urban' | 'tunnel';

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  open: 'Cielo abierto',
  urban: 'Cañón urbano',
  tunnel: 'Túnel',
};

/** Elevación mínima para tener línea de vista en cada entorno. */
export const ENVIRONMENT_MASK_DEG: Record<Environment, number> = {
  open: 10,
  urban: 45,
  tunnel: 90,
};

/** Cielo de ejemplo: PRN, azimut y elevación en t = 0. */
const SKY: ReadonlyArray<[number, number, number]> = [
  [2, 40, 78],
  [5, 130, 66],
  [7, 250, 60],
  [9, 320, 56],
  [13, 200, 53],
  [15, 75, 35],
  [18, 165, 28],
  [21, 290, 22],
  [24, 10, 15],
  [27, 220, 12],
  [30, 110, 7],
];

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Ubica en ECEF un satélite que se ve con cierto azimut y elevación, sobre la órbita GPS. */
function placeSatellite(receiver: LatLon, azimuthDeg: number, elevationDeg: number): Vec3 {
  const r = geodeticToEcef(receiver);
  const { east, north, up } = enuBasis(receiver);
  const az = toRad(azimuthDeg);
  const el = toRad(elevationDeg);
  const u = add(
    add(scale(east, Math.cos(el) * Math.sin(az)), scale(north, Math.cos(el) * Math.cos(az))),
    scale(up, Math.sin(el)),
  );
  const b = dot(r, u);
  const t = -b + Math.sqrt(b * b - norm(r) ** 2 + GPS_ORBIT_RADIUS_M ** 2);
  return add(r, scale(u, t));
}

/** Satélites sobre el horizonte en el instante t (segundos). Se mueven despacio por el cielo. */
export function skyAt(receiver: LatLon, tSeconds: number): Satellite[] {
  return SKY.map(([prn, az, el]) => {
    const azimuthDeg = (az + tSeconds * 0.004) % 360;
    const elevationDeg = el + 4 * Math.sin(tSeconds / 900 + prn);
    return { prn, azimuthDeg, elevationDeg, position: placeSatellite(receiver, azimuthDeg, elevationDeg) };
  }).filter((s) => s.elevationDeg > 0);
}

/** Satélites con línea de vista según el entorno. */
export function visibleIn(environment: Environment, sky: Satellite[]): Satellite[] {
  if (environment !== 'tunnel') return sky.filter((s) => s.elevationDeg >= ENVIRONMENT_MASK_DEG[environment]);
  // En la entrada del túnel apenas se alcanzan a ver los dos satélites más altos.
  return [...sky].sort((a, b) => b.elevationDeg - a.elevationDeg).slice(0, 2);
}
