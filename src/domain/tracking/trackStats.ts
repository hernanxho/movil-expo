import { haversineDistance } from '../geo/geo';
import type { Fix } from './entities';

export type TrackStats = {
  distanceM: number;
  durationS: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
};

/** Distancia, duración y velocidades calculadas a partir de los puntos aceptados. */
export function summarizeTrack(points: readonly Fix[]): TrackStats {
  let distanceM = 0;
  let maxSpeedMps = 0;
  for (let i = 1; i < points.length; i++) {
    const d = haversineDistance(points[i - 1], points[i]);
    const s = (points[i].timestamp - points[i - 1].timestamp) / 1000;
    distanceM += d;
    // El receptor mide la velocidad por efecto Doppler, más estable que dividir dos posiciones con ruido.
    const reported = points[i].speedMps;
    if (reported !== null) maxSpeedMps = Math.max(maxSpeedMps, reported);
    else if (s > 0) maxSpeedMps = Math.max(maxSpeedMps, d / s);
  }
  const durationS = points.length > 1 ? (points[points.length - 1].timestamp - points[0].timestamp) / 1000 : 0;
  return {
    distanceM,
    durationS,
    avgSpeedKmh: durationS > 0 ? (distanceM / durationS) * 3.6 : 0,
    maxSpeedKmh: maxSpeedMps * 3.6,
  };
}
