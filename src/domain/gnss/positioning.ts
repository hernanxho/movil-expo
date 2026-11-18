import { invert, multiply, norm, sub, transpose, type Matrix, type Vec3 } from './linalg';

export const SPEED_OF_LIGHT = 299_792_458;

export type Measurement = {
  prn: number;
  satellite: Vec3;
  /** Distancia "medida": tiempo de viaje × c, contaminada por el error del reloj y el ruido. */
  pseudorange: number;
};

export type Solution = {
  ecef: Vec3;
  /** Error del reloj del receptor expresado en metros (sesgo × c). */
  clockBiasM: number;
  iterations: number;
  /** Diferencia típica entre lo medido y lo que predice la solución. */
  residualRmsM: number;
};

export class InsufficientSatellitesError extends Error {
  constructor(count: number) {
    super(
      `Hay ${count} satélite(s). Se necesitan al menos 4: tres incógnitas de posición (x, y, z) y una del reloj.`,
    );
    this.name = 'InsufficientSatellitesError';
  }
}

/** Pseudodistancia que mediría un receptor en `receiver` con un reloj desfasado `clockBiasS`. */
export function pseudorange(receiver: Vec3, satellite: Vec3, clockBiasS: number, errorM = 0): number {
  return norm(sub(satellite, receiver)) + clockBiasS * SPEED_OF_LIGHT + errorM;
}

/**
 * Trilateración por mínimos cuadrados (Gauss-Newton).
 * Incógnitas: x, y, z del receptor y su error de reloj b.
 * Modelo: ρᵢ = |sᵢ − r| + b. Se linealiza alrededor de la estimación actual y se corrige hasta converger.
 */
export function solvePosition(measurements: Measurement[], maxIterations = 12): Solution {
  if (measurements.length < 4) throw new InsufficientSatellitesError(measurements.length);

  let x: [number, number, number, number] = [0, 0, 0, 0];
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    const r: Vec3 = [x[0], x[1], x[2]];
    const H: Matrix = [];
    const residuals: Matrix = [];
    for (const m of measurements) {
      const los = sub(m.satellite, r);
      const d = norm(los);
      H.push([-los[0] / d, -los[1] / d, -los[2] / d, 1]);
      residuals.push([m.pseudorange - (d + x[3])]);
    }
    const Ht = transpose(H);
    const inv = invert(multiply(Ht, H));
    if (!inv) throw new Error('La geometría de los satélites no permite resolver la posición.');
    const delta = multiply(multiply(inv, Ht), residuals).map((row) => row[0]);
    x = [x[0] + delta[0], x[1] + delta[1], x[2] + delta[2], x[3] + delta[3]];
    if (Math.hypot(delta[0], delta[1], delta[2], delta[3]) < 1e-4) break;
  }

  const ecef: Vec3 = [x[0], x[1], x[2]];
  const residualRmsM = Math.sqrt(
    measurements.reduce((sum, m) => sum + (m.pseudorange - norm(sub(m.satellite, ecef)) - x[3]) ** 2, 0) /
      measurements.length,
  );
  return { ecef, clockBiasM: x[3], iterations, residualRmsM };
}

export type Dop = { gdop: number; pdop: number; hdop: number; vdop: number; tdop: number };

/**
 * Dilución de la precisión: cuánto amplifica la geometría de los satélites el error de medida.
 * Satélites repartidos por todo el cielo → DOP bajo; agrupados → DOP alto.
 */
export function dilutionOfPrecision(
  satellites: ReadonlyArray<{ azimuthDeg: number; elevationDeg: number }>,
): Dop | null {
  if (satellites.length < 4) return null;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const G = satellites.map(({ azimuthDeg, elevationDeg }) => {
    const az = toRad(azimuthDeg);
    const el = toRad(elevationDeg);
    return [-Math.cos(el) * Math.sin(az), -Math.cos(el) * Math.cos(az), -Math.sin(el), 1];
  });
  const Q = invert(multiply(transpose(G), G));
  if (!Q) return null;
  return {
    gdop: Math.sqrt(Q[0][0] + Q[1][1] + Q[2][2] + Q[3][3]),
    pdop: Math.sqrt(Q[0][0] + Q[1][1] + Q[2][2]),
    hdop: Math.sqrt(Q[0][0] + Q[1][1]),
    vdop: Math.sqrt(Q[2][2]),
    tdop: Math.sqrt(Q[3][3]),
  };
}
