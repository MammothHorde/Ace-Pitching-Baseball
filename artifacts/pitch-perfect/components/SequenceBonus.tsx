import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  multiplier: number;
  label: string;
}

export function SequenceBonus({ multiplier, label }: Props) {
  if (multiplier <= 1.01) return <View style={styles.placeholder} />;
  return (
    <View style={styles.container}>
      <Text style={styles.mult}>{multiplier.toFixed(2)}×</Text>
      {label !== '' && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { height: 26 },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,152,0,0.18)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.45)',
  },
  mult:  { color: '#FF9800', fontSize: 15, fontWeight: '900' },
  label: { color: 'rgba(255,152,0,0.8)', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});
