import { useCallback, useMemo, useState } from 'react';

import { LAB_RECEIVER } from '../../di/container';
import type { Environment } from '../../domain/gnss/constellation';
import { createRng } from '../../domain/gnss/random';
import { receiverEpoch } from '../../domain/gnss/receiver';

/** Estado del laboratorio: entorno, satélites apagados a mano y una semilla para el ruido. */
export function useSatelliteLab() {
  const [environment, setEnvironmentState] = useState<Environment>('open');
  const [excluded, setExcluded] = useState<ReadonlySet<number>>(new Set());
  const [seed, setSeed] = useState(1);

  const epoch = useMemo(() => {
    const rng = createRng(seed);
    // Un reloj de cuarzo barato puede estar desfasado fracciones de milisegundo.
    const clockBiasS = (0.2 + rng() * 0.8) / 1000;
    return receiverEpoch({
      truth: LAB_RECEIVER,
      tSeconds: 0,
      environment,
      rng,
      clockBiasS,
      excludedPrns: excluded,
    });
  }, [environment, excluded, seed]);

  const setEnvironment = useCallback((value: Environment) => {
    setEnvironmentState(value);
    setExcluded(new Set());
  }, []);

  const toggle = useCallback((prn: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(prn)) next.delete(prn);
      else next.add(prn);
      return next;
    });
  }, []);

  const remeasure = useCallback(() => setSeed((s) => s + 1), []);

  return { environment, setEnvironment, epoch, toggle, remeasure, truth: LAB_RECEIVER };
}
