import { haversineDistance } from '../geo/geo';
import type { Fix } from './entities';

export type FilterRules = {
  /** Se descartan puntos con un radio de error mayor a este. */
  maxAccuracyM: number;
  /** Velocidad imposible para el vehículo: indica un salto por rebote de señal. */
  maxSpeedMps: number;
  /** Por debajo de esta distancia se considera que no hubo movimiento. */
  minDistanceM: number;
  /** Tras varios saltos seguidos se acepta el punto: el que estaba mal era el anterior. */
  maxConsecutiveJumps: number;
};

export const DEFAULT_RULES: FilterRules = {
  maxAccuracyM: 30,
  maxSpeedMps: 55,
  minDistanceM: 3,
  maxConsecutiveJumps: 3,
};

export type RejectReason = 'accuracy' | 'jump' | 'stationary';

export type FilterDecision =
  | { accepted: true }
  | { accepted: false; reason: RejectReason; detail: string };

/** Decide qué puntos crudos del GPS entran al recorrido. */
export class FixFilter {
  private lastAccepted: Fix | null = null;
  private consecutiveJumps = 0;

  constructor(private readonly rules: FilterRules = DEFAULT_RULES) {}

  evaluate(fix: Fix): FilterDecision {
    const { maxAccuracyM, maxSpeedMps, minDistanceM, maxConsecutiveJumps } = this.rules;

    if (fix.accuracyM !== null && fix.accuracyM > maxAccuracyM) {
      return {
        accepted: false,
        reason: 'accuracy',
        detail: `precisión de ±${Math.round(fix.accuracyM)} m (máx. ${maxAccuracyM} m)`,
      };
    }

    const last = this.lastAccepted;
    if (last) {
      const distance = haversineDistance(last, fix);
      const seconds = (fix.timestamp - last.timestamp) / 1000;
      const speed = seconds > 0 ? distance / seconds : Infinity;

      if (speed > maxSpeedMps && this.consecutiveJumps < maxConsecutiveJumps) {
        this.consecutiveJumps++;
        return {
          accepted: false,
          reason: 'jump',
          detail: `salto de ${Math.round(distance)} m en ${seconds.toFixed(0)} s (${Math.round(speed * 3.6)} km/h)`,
        };
      }
      if (distance < minDistanceM) {
        return { accepted: false, reason: 'stationary', detail: `se movió ${distance.toFixed(1)} m` };
      }
    }

    this.consecutiveJumps = 0;
    this.lastAccepted = fix;
    return { accepted: true };
  }
}
