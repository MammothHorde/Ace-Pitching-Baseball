import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ZoneId } from '@/constants/GameTypes';

const ZONE_LABELS: Record<ZoneId, string> = {
  1: 'Hi\nIn',  2: 'High',  3: 'Hi\nOut',
  4: 'In',      5: 'Heart', 6: 'Out',
  7: 'Lo\nIn',  8: 'Low',   9: 'Lo\nOut',
};

const ZONE_TYPE: Record<ZoneId, 'corner' | 'edge' | 'center'> = {
  1: 'corner', 2: 'edge',   3: 'corner',
  4: 'edge',   5: 'center', 6: 'edge',
  7: 'corner', 8: 'edge',   9: 'corner',
};

interface StrikeZoneProps {
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
  disabled?: boolean;
}

export function StrikeZone({ selectedZone, onSelectZone, disabled }: StrikeZoneProps) {
  const zones: ZoneId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>TARGET ZONE</Text>
      <View style={styles.grid}>
        {zones.map(zone => {
          const isSelected = selectedZone === zone;
          const type = ZONE_TYPE[zone];
          let bg = 'rgba(22,40,71,0.88)';
          let borderColor = 'rgba(255,255,255,0.15)';
          if (type === 'corner') bg = 'rgba(255,204,0,0.12)';
          if (type === 'center') bg = 'rgba(255,71,87,0.12)';
          if (isSelected) { bg = '#FFCC00'; borderColor = '#FFCC00'; }

          return (
            <TouchableOpacity
              key={zone}
              style={[styles.zone, { backgroundColor: bg, borderColor }]}
              onPress={() => !disabled && onSelectZone(zone)}
              activeOpacity={0.65}
            >
              <Text style={[styles.label, { color: isSelected ? '#0B1E3D' : 'rgba(255,255,255,0.85)' }]}>
                {ZONE_LABELS[zone]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(255,204,0,0.5)' }]} />
          <Text style={styles.legendText}>Corner — harder to hit</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(255,71,87,0.5)' }]} />
          <Text style={styles.legendText}>Heart — easier to hit</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  header: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 216,
    borderWidth: 2,
    borderRadius: 10,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  zone: {
    width: 72,
    height: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '600' },
});
