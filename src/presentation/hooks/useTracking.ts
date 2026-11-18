import { useCallback, useEffect, useRef, useState } from 'react';

import { createTrackingSession } from '../../di/container';
import type { FixSource } from '../../domain/tracking/entities';
import type { TrackingSession, TrackingSnapshot } from '../../domain/usecases/TrackingSession';

export function useTracking() {
  const [source, setSource] = useState<FixSource>('simulated');
  const [online, setOnlineState] = useState(true);
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const session = useRef<TrackingSession | null>(null);

  useEffect(() => () => session.current?.stop(), []);

  const start = useCallback(async () => {
    session.current?.stop();
    setErrorMessage(null);
    const s = createTrackingSession(source);
    session.current = s;
    s.subscribe(setSnapshot);
    s.setOnline(online);
    setSnapshot(s.getSnapshot());
    try {
      await s.start();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo iniciar el rastreo');
    }
  }, [source, online]);

  const stop = useCallback(() => session.current?.stop(), []);

  const setOnline = useCallback((value: boolean) => {
    setOnlineState(value);
    session.current?.setOnline(value);
  }, []);

  const running = snapshot?.status === 'running' || snapshot?.status === 'starting';

  return { source, setSource, online, setOnline, snapshot, running, errorMessage, start, stop };
}
