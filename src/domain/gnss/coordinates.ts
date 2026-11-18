import type { LatLon } from '../geo/geo';
import { dot, norm, sub, type Vec3 } from './linalg';

/** Elipsoide WGS84, el que usa GPS. */
const A = 6_378_137;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Latitud, longitud y altura → coordenadas cartesianas centradas en la Tierra (ECEF). */
export function geodeticToEcef(p: LatLon, heightM = 0): Vec3 {
  const φ = toRad(p.latitude);
  const λ = toRad(p.longitude);
  const n = A / Math.sqrt(1 - E2 * Math.sin(φ) ** 2);
  return [
    (n + heightM) * Math.cos(φ) * Math.cos(λ),
    (n + heightM) * Math.cos(φ) * Math.sin(λ),
    (n * (1 - E2) + heightM) * Math.sin(φ),
  ];
}

/** ECEF → latitud, longitud y altura. */
export function ecefToGeodetic([x, y, z]: Vec3): LatLon & { heightM: number } {
  const λ = Math.atan2(y, x);
  const p = Math.hypot(x, y);
  let φ = Math.atan2(z, p * (1 - E2));
  let h = 0;
  for (let i = 0; i < 8; i++) {
    const n = A / Math.sqrt(1 - E2 * Math.sin(φ) ** 2);
    h = p / Math.cos(φ) - n;
    φ = Math.atan2(z, p * (1 - (E2 * n) / (n + h)));
  }
  return { latitude: toDeg(φ), longitude: toDeg(λ), heightM: h };
}

/** Vectores unitarios este, norte y arriba en un punto de la superficie. */
export function enuBasis(p: LatLon): { east: Vec3; north: Vec3; up: Vec3 } {
  const φ = toRad(p.latitude);
  const λ = toRad(p.longitude);
  return {
    east: [-Math.sin(λ), Math.cos(λ), 0],
    north: [-Math.sin(φ) * Math.cos(λ), -Math.sin(φ) * Math.sin(λ), Math.cos(φ)],
    up: [Math.cos(φ) * Math.cos(λ), Math.cos(φ) * Math.sin(λ), Math.sin(φ)],
  };
}

/** Azimut y elevación de un satélite vistos desde el receptor. */
export function azimuthElevation(
  receiver: LatLon,
  receiverEcef: Vec3,
  satellite: Vec3,
): { azimuthDeg: number; elevationDeg: number } {
  const los = sub(satellite, receiverEcef);
  const d = norm(los);
  const { east, north, up } = enuBasis(receiver);
  const e = dot(los, east) / d;
  const n = dot(los, north) / d;
  const u = dot(los, up) / d;
  return {
    azimuthDeg: (toDeg(Math.atan2(e, n)) + 360) % 360,
    elevationDeg: toDeg(Math.asin(u)),
  };
}
