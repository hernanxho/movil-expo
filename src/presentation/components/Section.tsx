import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, mono } from '../theme';

type Props = {
  title: string;
  tag?: string;
  children: ReactNode;
};

/** Tarjeta con título y una etiqueta corta a la derecha. */
export function Section({ title, tag, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {tag ? <Text style={styles.tag}>{tag}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  tag: {
    color: colors.teal,
    fontFamily: mono,
    fontSize: 11,
  },
});
