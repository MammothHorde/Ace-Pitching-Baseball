import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ZoneId } from '@/constants/GameTypes';

// 5-wide × 5-tall grid, numbered row-major 1…25.
const GRID = 5;
const COL_LABEL = ['IN', 'in', 'MID', 'out', 'OUT'];
const ROW_LABEL = ['HI', 'UP', 'MID', 'LO', 'DN'];

const zoneCol = (z: ZoneId) => (z - 1) % GRID;        // 0 (inside) … 4 (outside)
const zoneRow = (z: ZoneId) => Math.floor((z - 1) / GRID); // 0 (top) … 4 (bottom)

function zoneLabel(z: ZoneId): string {
  const col = zoneCol(z);
  const row = zoneRow(z);
  if (col === 2 && row === 2) return '•'; // dead center
  return `${ROW_LABEL[row]}\n${COL_LABEL[col]}`;
}

function zoneType(z: ZoneId): 'corner' | 'edge' | 'center' {
  const col = zoneCol(z);
  const row = zoneRow(z);
  const colEdge = col === 0 || col === GRID - 1;
  const rowEdge = row === 0 || row === GRID - 1;
  if (colEdge && rowEdge) return 'corner';        // four extreme corners
  if (colEdge || rowEdge) return 'edge';          // rest of the border
  return 'center';                                // inner 3×3 heart region
}

interface StrikeZoneProps {
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function StrikeZone({ selectedZone, onSelectZone, disabled, compact }: StrikeZoneProps) {
  const zones = Array.from({ length: GRID * GRID }, (_, i) => (i + 1) as ZoneId);
  const cellW = compact ? 34 : 48;
  const cellH = compact ? 30 : 44;
  const gridW = cellW * GRID;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {!compact && <Text style={styles.header}>TARGET ZONE</Text>}
      <View style={[styles.grid, { width: gridW }, compact && styles.gridCompact]}>
        {zones.map(zone => {
          const isSelected = selectedZone === zone;
          const type = zoneType(zone);
          let bg = compact ? 'rgba(11,30,61,0.72)' : 'rgba(22,40,71,0.88)';
          let borderColor = compact ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.15)';
          if (type === 'corner') bg = compact ? 'rgba(255,204,0,0.10)' : 'rgba(255,204,0,0.12)';
          if (type === 'center') bg = compact ? 'rgba(255,71,87,0.10)' : 'rgba(255,71,87,0.12)';
          if (isSelected) { bg = '#FFCC00'; borderColor = '#FFCC00'; }

          return (
            <TouchableOpacity
              key={zone}
              style={[
                styles.zone,
                { width: cellW, height: cellH, backgroundColor: bg, borderColor },
              ]}
              onPress={() => !disabled && onSelectZone(zone)}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  compact ? styles.labelCompact : styles.label,
                  { color: isSelected ? '#0B1E3D' : 'rgba(255,255,255,0.75)' },
                ]}
              >
                {compact ? '' : zoneLabel(zone)}
                {compact && isSelected ? '✦' : compact ? '' : ''}
              </Text>
              {compact && isSelected && (
                <View style={styles.selectedDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {!compact && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  containerCompact: {},
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
    borderWidth: 2,
    borderRadius: 10,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  gridCompact: {
    borderWidth: 1.5,
    borderRadius: 8,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  zone: {
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
  labelCompact: {
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0B1E3D',
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
