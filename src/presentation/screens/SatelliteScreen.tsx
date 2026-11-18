import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Environment, ENVIRONMENT_LABELS, ENVIRONMENT_MASK_DEG } from '../../domain/gnss/constellation';
import { SPEED_OF_LIGHT } from '../../domain/gnss/positioning';
import { Section } from '../components/Section';
import { SegmentedControl } from '../components/SegmentedControl';
import { SkyPlot } from '../components/SkyPlot';
import { StatTiles } from '../components/StatTiles';
import { useSatelliteLab } from '../hooks/useSatelliteLab';
import { colors, mono } from '../theme';

const ENVIRONMENTS = (Object.keys(ENVIRONMENT_LABELS) as Environment[]).map((value) => ({
  value,
  label: ENVIRONMENT_LABELS[value],
}));

function dopQuality(hdop: number): string {
  if (hdop < 2) return 'excelente';
  if (hdop < 5) return 'buena';
  if (hdop < 10) return 'moderada';
  return 'pobre';
}

export function SatelliteScreen() {
  const { environment, setEnvironment, epoch, toggle, remeasure } = useSatelliteLab();
  const used = epoch.readings.filter((r) => r.used);
  const clockKm = (epoch.clockBiasS * SPEED_OF_LIGHT) / 1000;

  return (
    <View style={styles.root}>
      <Section title="¿Cómo sabe el teléfono dónde está?">
        <Step n={1} text="Cada satélite transmite la hora exacta de su reloj atómico y su posición en órbita." />
        <Step n={2} text="El receptor mide cuánto tardó la señal: tiempo × velocidad de la luz = distancia (≈ 67–86 ms)." />
        <Step
          n={3}
          text="Con varias distancias resuelve x, y, z y el error de su propio reloj: por eso necesita 4 satélites o más."
        />
      </Section>

      <SegmentedControl options={ENVIRONMENTS} value={environment} onChange={setEnvironment} />

      <Section title="Cielo del receptor" tag={`${used.length} en uso de ${epoch.sky.length}`}>
        <SkyPlot sky={epoch.sky} readings={epoch.readings} maskDeg={environment === 'open' ? null : ENVIRONMENT_MASK_DEG[environment]} />
        <Text style={styles.caption}>
          Centro = justo encima (90°), borde = horizonte. Zona roja: bloqueada por edificios o el túnel. Ámbar: señal
          rebotada (multitrayecto). Toca un satélite para apagarlo o encenderlo.
        </Text>
        <View style={styles.chips}>
          {epoch.readings.map((r) => (
            <Pressable
              key={r.prn}
              accessibilityRole="button"
              accessibilityState={{ selected: r.used }}
              onPress={() => toggle(r.prn)}
              style={[styles.chip, r.used ? styles.chipOn : styles.chipOff]}
            >
              <Text style={[styles.chipText, r.used && styles.chipTextOn]}>G{String(r.prn).padStart(2, '0')}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Resultado de la trilateración" tag={epoch.solution ? `${epoch.solution.iterations} iteraciones` : undefined}>
        {epoch.position && epoch.dop && epoch.errorM !== null && epoch.accuracyM !== null ? (
          <>
            <Text style={styles.coords}>
              {epoch.position.latitude.toFixed(6)}, {epoch.position.longitude.toFixed(6)}
            </Text>
            <StatTiles
              tiles={[
                {
                  label: 'Error real',
                  value: `${epoch.errorM.toFixed(1)} m`,
                  tone: epoch.errorM > 30 ? 'bad' : epoch.errorM > 10 ? 'warn' : 'normal',
                },
                { label: 'Precisión est.', value: `±${Math.round(epoch.accuracyM)} m` },
                {
                  label: `HDOP · ${dopQuality(epoch.dop.hdop)}`,
                  value: epoch.dop.hdop.toFixed(1),
                  tone: epoch.dop.hdop > 5 ? 'bad' : epoch.dop.hdop > 2 ? 'warn' : 'normal',
                },
              ]}
            />
            <Text style={styles.body}>
              El reloj del receptor estaba desfasado {(epoch.clockBiasS * 1000).toFixed(3)} ms. Sin estimarlo, cada
              distancia tendría un error de <Text style={styles.strong}>{clockKm.toFixed(0)} km</Text>. Como es la
              cuarta incógnita, el cálculo lo resuelve junto con la posición.
            </Text>
            {used.some((r) => r.multipathM > 0) ? (
              <Text style={styles.warning}>
                Una señal llegó rebotada en un edificio (ámbar). El DOP solo mide la geometría, así que no ve ese error:
                por eso las apps además filtran los puntos.
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.error}>{epoch.failure}</Text>
        )}
        <Pressable accessibilityRole="button" style={styles.secondary} onPress={remeasure}>
          <Text style={styles.secondaryLabel}>Nueva medición</Text>
        </Pressable>
      </Section>

      <Section title="Mediciones" tag="pseudodistancias">
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colPrn]}>PRN</Text>
          <Text style={[styles.th, styles.colNum]}>Elev.</Text>
          <Text style={[styles.th, styles.colWide]}>Distancia</Text>
          <Text style={[styles.th, styles.colNum]}>Tiempo</Text>
        </View>
        {epoch.readings.length === 0 ? <Text style={styles.caption}>Ningún satélite a la vista.</Text> : null}
        {epoch.readings.map((r) => (
          <View key={r.prn} style={[styles.tr, !r.used && styles.trOff]}>
            <Text style={[styles.td, styles.colPrn]}>G{String(r.prn).padStart(2, '0')}</Text>
            <Text style={[styles.td, styles.colNum]}>{Math.round(r.elevationDeg)}°</Text>
            <Text style={[styles.td, styles.colWide]}>
              {Math.round(r.rangeM / 1000)
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}{' '}
              km
              {r.multipathM > 0 ? <Text style={styles.multipath}>{`  +${Math.round(r.multipathM)} m rebote`}</Text> : null}
            </Text>
            <Text style={[styles.td, styles.colNum]}>{r.travelTimeMs.toFixed(1)} ms</Text>
          </View>
        ))}
      </Section>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepNumber}>{n}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  step: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 22,
    color: colors.background,
    backgroundColor: colors.teal,
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  strong: {
    color: colors.amber,
    fontWeight: '700',
  },
  caption: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipOn: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  chipOff: {
    borderColor: colors.faint,
  },
  chipText: {
    color: colors.muted,
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextOn: {
    color: colors.background,
  },
  coords: {
    color: colors.text,
    fontFamily: mono,
    fontSize: 15,
  },
  warning: {
    color: colors.amber,
    fontSize: 12.5,
    lineHeight: 18,
  },
  error: {
    color: colors.red,
    fontSize: 13,
    lineHeight: 19,
  },
  secondary: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    color: colors.teal,
    fontSize: 14,
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  th: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  trOff: {
    opacity: 0.4,
  },
  td: {
    color: colors.text,
    fontFamily: mono,
    fontSize: 12,
  },
  colPrn: {
    width: 44,
  },
  colNum: {
    width: 62,
    textAlign: 'right',
  },
  colWide: {
    flex: 1,
    paddingLeft: 12,
  },
  multipath: {
    color: colors.amber,
  },
});
