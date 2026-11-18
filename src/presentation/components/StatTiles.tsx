import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type Tile = { label: string; value: string; tone?: 'normal' | 'warn' | 'bad' };

/** Indicadores numéricos: en fila si son hasta tres, en cuadrícula 2×2 si son más. */
export function StatTiles({ tiles }: { tiles: Tile[] }) {
  const grid = tiles.length > 3;
  return (
    <View style={styles.row}>
      {tiles.map((t) => (
        <View key={t.label} style={[styles.tile, grid && styles.half]}>
          <Text
            style={[styles.value, t.tone === 'warn' && styles.warn, t.tone === 'bad' && styles.bad]}
            numberOfLines={1}
          >
            {t.value}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            {t.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flex: 1,
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.cardRaised,
  },
  half: {
    flexBasis: '40%',
  },
  value: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  warn: {
    color: colors.amber,
  },
  bad: {
    color: colors.red,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
  },
});
