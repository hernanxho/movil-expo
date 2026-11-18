import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedControl } from '../presentation/components/SegmentedControl';
import { SatelliteScreen } from '../presentation/screens/SatelliteScreen';
import { TrackingScreen } from '../presentation/screens/TrackingScreen';
import { colors } from '../presentation/theme';

type Tab = 'tracking' | 'satellites';

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'tracking', label: 'Rastreo' },
  { value: 'satellites', label: 'Satélites' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('tracking');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
    >
      <View>
        <Text style={styles.title}>Rumbo</Text>
        <Text style={styles.subtitle}>Cómo funciona una aplicación de rastreo satelital, de los satélites al servidor.</Text>
      </View>

      <SegmentedControl options={TABS} value={tab} onChange={setTab} />

      {/* Las dos pestañas quedan montadas: el rastreo sigue corriendo al cambiar de pestaña. */}
      <View style={tab === 'tracking' ? undefined : styles.hidden}>
        <TrackingScreen />
      </View>
      <View style={tab === 'satellites' ? undefined : styles.hidden}>
        <SatelliteScreen />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: 14,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  hidden: {
    display: 'none',
  },
});
