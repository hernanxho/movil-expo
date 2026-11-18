import * as Location from 'expo-location';

import type { LocationProvider, ProviderEvent } from '../../domain/repositories/LocationProvider';

/**
 * GPS real del teléfono. El sistema operativo combina GNSS con Wi-Fi y antenas
 * celulares (Fused Location en Android, Core Location en iOS) y entrega el resultado.
 */
export class ExpoLocationProvider implements LocationProvider {
  readonly source = 'device' as const;

  async start(onEvent: (event: ProviderEvent) => void): Promise<() => void> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      throw new Error('Permiso de ubicación denegado. Actívalo en los ajustes del teléfono.');
    }

    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      ({ coords, timestamp }) => {
        onEvent({
          type: 'fix',
          fix: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracyM: coords.accuracy ?? null,
            speedMps: coords.speed !== null && coords.speed >= 0 ? coords.speed : null,
            headingDeg: coords.heading !== null && coords.heading >= 0 ? coords.heading : null,
            timestamp,
            satellitesUsed: null,
            environment: null,
          },
        });
      },
      (reason) => onEvent({ type: 'no-fix', reason }),
    );

    return () => subscription.remove();
  }
}
