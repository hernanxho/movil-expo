import { StyleSheet, Text, View } from 'react-native';

import type { LogEntry, LogKind } from '../../domain/tracking/entities';
import { colors, formatClock, mono } from '../theme';

const KIND_COLOR: Record<LogKind, string> = {
  zone: colors.violet,
  filter: colors.red,
  upload: colors.blue,
  signal: colors.amber,
  info: colors.teal,
};

export function EventLog({ entries, limit = 14 }: { entries: LogEntry[]; limit?: number }) {
  if (entries.length === 0) {
    return <Text style={styles.empty}>Todavía no hay eventos.</Text>;
  }
  return (
    <View style={styles.list}>
      {entries.slice(0, limit).map((e) => (
        <View key={e.id} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: KIND_COLOR[e.kind] }]} />
          <Text style={styles.time}>{formatClock(e.timestamp)}</Text>
          <Text style={styles.text}>{e.text}</Text>
        </View>
      ))}
    </View>
  );
}

export function EventLegend() {
  const items: [LogKind, string][] = [
    ['zone', 'Geocerca'],
    ['filter', 'Filtro'],
    ['signal', 'Señal'],
    ['upload', 'Servidor'],
  ];
  return (
    <View style={styles.legend}>
      {items.map(([kind, label]) => (
        <View key={kind} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: KIND_COLOR[kind] }]} />
          <Text style={styles.legendText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 5,
  },
  time: {
    color: colors.faint,
    fontFamily: mono,
    fontSize: 11,
    marginTop: 1,
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: 12.5,
    lineHeight: 17,
  },
  empty: {
    color: colors.muted,
    fontSize: 13,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    color: colors.muted,
    fontSize: 11,
  },
});
