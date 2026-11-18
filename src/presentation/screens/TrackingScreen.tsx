import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { PLANNED_ROUTE, SIMULATED_ZONES } from '../../di/container';
import { ENVIRONMENT_LABELS } from '../../domain/gnss/constellation';
import type { FixSource } from '../../domain/tracking/entities';
import { EventLegend, EventLog } from '../components/EventLog';
import { RouteMap } from '../components/RouteMap';
import { Section } from '../components/Section';
import { SegmentedControl } from '../components/SegmentedControl';
import { StatTiles } from '../components/StatTiles';
import { useTracking } from '../hooks/useTracking';
import { colors, formatMeters, mono } from '../theme';

const SOURCES: ReadonlyArray<{ value: FixSource; label: string }> = [
  { value: 'simulated', label: 'Recorrido simulado' },
  { value: 'device', label: 'GPS del teléfono' },
];

export function TrackingScreen() {
  const { source, setSource, online, setOnline, snapshot, running, errorMessage, start, stop } = useTracking();
  // Al cambiar de fuente se deja de mostrar la sesión anterior.
  const s = snapshot && snapshot.source === source ? snapshot : null;
  const last = s?.lastFix ?? null;
  const accuracy = last?.accuracyM ?? null;

  return (
    <View style={styles.root}>
      <SegmentedControl options={SOURCES} value={source} onChange={setSource} disabled={running} />
      <Text style={styles.hint}>
        {source === 'simulated'
          ? 'Un vehículo recorre la zona. Cada punto lo calcula un receptor GNSS simulado con los satélites que alcanza a ver.'
          : 'Usa la ubicación real del teléfono. Al primer punto se crea una geocerca de 25 m: aléjate para ver el aviso de salida.'}
      </Text>

      <Pressable
        accessibilityRole="button"
        style={[styles.button, running && styles.buttonStop]}
        onPress={() => {
          if (running) stop();
          else void start();
        }}
      >
        {s?.status === 'starting' ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.buttonLabel}>{running ? 'Detener rastreo' : 'Iniciar rastreo'}</Text>
        )}
      </Pressable>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Section
        title="Mapa"
        tag={s?.signalLost ? 'SIN SEÑAL' : last?.environment ? ENVIRONMENT_LABELS[last.environment] : undefined}
      >
        <RouteMap
          track={s?.track ?? []}
          rejected={s?.rejected ?? []}
          geofences={s ? s.geofences : source === 'simulated' ? SIMULATED_ZONES : []}
          insideZones={s?.insideZones ?? []}
          lastFix={last}
          plannedRoute={source === 'simulated' ? PLANNED_ROUTE : undefined}
        />
        <View style={styles.mapLegend}>
          <Legend color={colors.teal} label="Recorrido" />
          <Legend color={colors.red} label="Descartado" />
          <Legend color={colors.blue} label="Posición ± precisión" />
          <Legend color={colors.violet} label="Geocerca" />
        </View>
      </Section>

      <Section title="Último punto recibido" tag={last?.satellitesUsed ? `${last.satellitesUsed} satélites` : undefined}>
        <Text style={styles.coords}>
          {last ? `${last.latitude.toFixed(6)}, ${last.longitude.toFixed(6)}` : '—, —'}
        </Text>
        <StatTiles
          tiles={[
            {
              label: 'Precisión',
              value: accuracy !== null ? `±${Math.round(accuracy)} m` : '—',
              tone: accuracy === null ? 'normal' : accuracy > 30 ? 'bad' : accuracy > 12 ? 'warn' : 'normal',
            },
            {
              label: 'Velocidad',
              value: last?.speedMps !== null && last?.speedMps !== undefined ? `${Math.round(last.speedMps * 3.6)} km/h` : '—',
            },
            { label: 'Distancia', value: s ? formatMeters(s.stats.distanceM) : '—' },
            { label: 'Puntos', value: s ? `${s.track.length}/${s.rawCount}` : '—' },
          ]}
        />
        <Text style={styles.caption}>
          Puntos aceptados / recibidos. {s ? `${s.rejected.length} descartados, ${s.stationary} sin movimiento.` : ''}
        </Text>
      </Section>

      <Section title="Envío al servidor" tag={s?.uploading ? 'enviando…' : undefined}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Datos móviles</Text>
            <Text style={styles.caption}>Apágalos para ver cómo los puntos esperan en el teléfono.</Text>
          </View>
          <Switch
            value={online}
            onValueChange={setOnline}
            trackColor={{ true: colors.teal, false: colors.cardRaised }}
            thumbColor={colors.text}
          />
        </View>
        <StatTiles
          tiles={[
            { label: 'En cola', value: String(s?.pending ?? 0), tone: (s?.pending ?? 0) > 10 ? 'warn' : 'normal' },
            { label: 'En el servidor', value: String(s?.sent ?? 0) },
            { label: 'Lotes', value: String(s?.batches ?? 0) },
          ]}
        />
      </Section>

      <Section title="Eventos" tag="más reciente arriba">
        <EventLegend />
        <EventLog entries={s?.log ?? []} />
      </Section>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  button: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
  },
  buttonStop: {
    backgroundColor: colors.amber,
  },
  buttonLabel: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: colors.red,
    fontSize: 13,
  },
  mapLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    color: colors.muted,
    fontSize: 11,
  },
  coords: {
    color: colors.text,
    fontFamily: mono,
    fontSize: 15,
  },
  caption: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
