import { haversineDistance, type LatLon } from '../geo/geo';
import { type Environment, type Satellite, skyAt, visibleIn } from './constellation';
import { ecefToGeodetic, geodeticToEcef } from './coordinates';
import { norm, sub } from './linalg';
import {
  dilutionOfPrecision,
  type Dop,
  pseudorange,
  SPEED_OF_LIGHT,
  solvePosition,
  type Solution,
} from './positioning';
import { gaussian, type Rng } from './random';

/** Error típico de cada pseudodistancia (ruido + atmósfera + órbita), en metros. */
export const RANGE_ERROR_SIGMA_M = 3;

export type SatelliteReading = Satellite & {
  used: boolean;
  rangeM: number;
  travelTimeMs: number;
  /** Camino extra de una señal rebotada en un edificio. */
  multipathM: number;
};

export type ReceiverEpoch = {
  environment: Environment;
  sky: Satellite[];
  readings: SatelliteReading[];
  clockBiasS: number;
  solution: Solution | null;
  position: (LatLon & { heightM: number }) | null;
  dop: Dop | null;
  /** Radio estimado de error horizontal (lo que un teléfono reporta como "accuracy"). */
  accuracyM: number | null;
  /** Error real frente a la posición verdadera (solo se conoce porque es una simulación). */
  errorM: number | null;
  failure: string | null;
};

type EpochInput = {
  truth: LatLon;
  tSeconds: number;
  environment: Environment;
  rng: Rng;
  clockBiasS: number;
  excludedPrns?: ReadonlySet<number>;
};

/** Simula lo que hace el chip GNSS en un instante: medir pseudodistancias y trilaterar. */
export function receiverEpoch({
  truth,
  tSeconds,
  environment,
  rng,
  clockBiasS,
  excludedPrns = new Set(),
}: EpochInput): ReceiverEpoch {
  const sky = skyAt(truth, tSeconds);
  const inView = visibleIn(environment, sky).map((s) => s.prn);
  const truthEcef = geodeticToEcef(truth);

  // En el cañón urbano una señal a veces llega rebotada en un edificio y recorre más camino.
  const reflected = environment === 'urban' && rng() < 0.35 ? inView[Math.floor(rng() * inView.length)] : null;

  const readings: SatelliteReading[] = sky
    .filter((s) => inView.includes(s.prn))
    .map((s) => {
      const rangeM = norm(sub(s.position, truthEcef));
      return {
        ...s,
        used: !excludedPrns.has(s.prn),
        rangeM,
        travelTimeMs: (rangeM / SPEED_OF_LIGHT) * 1000,
        multipathM: s.prn === reflected ? 80 + rng() * 170 : 0,
      };
    });

  const used = readings.filter((r) => r.used);
  const base = { environment, sky, readings, clockBiasS };

  try {
    const solution = solvePosition(
      used.map((r) => ({
        prn: r.prn,
        satellite: r.position,
        pseudorange: pseudorange(truthEcef, r.position, clockBiasS, gaussian(rng, RANGE_ERROR_SIGMA_M) + r.multipathM),
      })),
    );
    const position = ecefToGeodetic(solution.ecef);
    const dop = dilutionOfPrecision(used);
    const accuracyM = dop ? dop.hdop * Math.max(RANGE_ERROR_SIGMA_M, solution.residualRmsM) : null;
    return {
      ...base,
      solution,
      position,
      dop,
      accuracyM,
      errorM: haversineDistance(truth, position),
      failure: null,
    };
  } catch (error) {
    return {
      ...base,
      solution: null,
      position: null,
      dop: null,
      accuracyM: null,
      errorM: null,
      failure: error instanceof Error ? error.message : 'No se pudo calcular la posición',
    };
  }
}
