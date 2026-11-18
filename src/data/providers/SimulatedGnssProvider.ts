import { fromLocal } from '../../domain/geo/geo';
import { ENVIRONMENT_LABELS } from '../../domain/gnss/constellation';
import { createRng, gaussian } from '../../domain/gnss/random';
import { receiverEpoch } from '../../domain/gnss/receiver';
import type { LocationProvider, ProviderEvent } from '../../domain/repositories/LocationProvider';
import { ORIGIN, positionAlongRoute } from './simulatedRoute';

type Options = {
  /** Cada cuánto llega un punto en tiempo real (la simulación avanza 1 s por punto). */
  intervalMs?: number;
  speedMps?: number;
  seed?: number;
};

/**
 * Un vehículo recorre la ruta y, en cada segundo, un receptor GNSS simulado
 * calcula su posición por trilateración con los satélites que tiene a la vista.
 */
export class SimulatedGnssProvider implements LocationProvider {
  readonly source = 'simulated' as const;

  constructor(private readonly options: Options = {}) {}

  async start(onEvent: (event: ProviderEvent) => void): Promise<() => void> {
    const { intervalMs = 500, speedMps = 12, seed = 2026 } = this.options;
    const rng = createRng(seed);
    const startedAt = Date.now();
    let t = 0;
    let clockBiasS = 0.000_42;

    const timer = setInterval(() => {
      t += 1;
      clockBiasS += 2e-9; // el reloj de cuarzo del teléfono se desvía poco a poco
      const at = positionAlongRoute(t * speedMps);
      if (!at) {
        clearInterval(timer);
        onEvent({ type: 'finished' });
        return;
      }
      const truth = fromLocal(ORIGIN, at.point);
      const epoch = receiverEpoch({ truth, tSeconds: t, environment: at.leg.environment, rng, clockBiasS });

      if (!epoch.position) {
        onEvent({
          type: 'no-fix',
          reason: `${ENVIRONMENT_LABELS[at.leg.environment].toLowerCase()}, ${epoch.readings.length} satélite(s) a la vista`,
        });
        return;
      }
      onEvent({
        type: 'fix',
        fix: {
          latitude: epoch.position.latitude,
          longitude: epoch.position.longitude,
          accuracyM: epoch.accuracyM,
          speedMps: Math.max(0, speedMps + gaussian(rng, 0.3)),
          headingDeg: at.headingDeg,
          timestamp: startedAt + t * 1000,
          satellitesUsed: epoch.readings.filter((r) => r.used).length,
          environment: at.leg.environment,
        },
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }
}
