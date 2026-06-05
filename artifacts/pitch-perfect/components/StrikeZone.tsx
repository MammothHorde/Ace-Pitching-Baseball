import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ZoneId } from '@/constants/GameTypes';

// 9-wide × 9-tall grid, numbered row-major 1…81.
const GRID = 9;
const COL_LABEL = ['', '', '', 'IN', 'MID', 'OUT', '', '', ''];
const ROW_LABEL = ['', '', '', 'HI', 'MID', 'LO', '', '', ''];

const zoneCol = (z: ZoneId) => (z - 1) % GRID;        // 0 (inside) … 8 (outside)
const zoneRow = (z: ZoneId) => Math.floor((z - 1) / GRID); // 0 (top) … 8 (bottom)

// Center 3×3 (cols 3-5, rows 3-5) is the actual strike zone; everything outside
// that center block is out of the zone (ball territory).
const inStrikeZone = (z: ZoneId) =>
  zoneCol(z) >= 3 && zoneCol(z) <= 5 && zoneRow(z) >= 3 && zoneRow(z) <= 5;

function zoneLabel(z: ZoneId): string {
  const col = zoneCol(z);
  const row = zoneRow(z);
  if (col === 4 && row === 4) return '•'; // dead center
  return `${ROW_LABEL[row]}\n${COL_LABEL[col]}`;
}

function zoneType(z: ZoneId): 'corner' | 'edge' | 'center' | 'ball' {
  if (!inStrikeZone(z)) return 'ball';            // outside the center — off the plate
  const col = zoneCol(z);
  const row = zoneRow(z);
  const colEdge = col === 3 || col === 5;
  const rowEdge = row === 3 || row === 5;
  if (colEdge && rowEdge) return 'corner';        // strike-zone corners (paint)
  if (col === 4 && row === 4) return 'center';     // dead center — heart
  return 'edge';                                  // strike-zone edges
}

interface StrikeZoneProps {
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Override cell width — keep in sync with game.tsx ball targeting. */
  cellWidth?: number;
  /** Override cell height — keep in sync with game.tsx ball targeting. */
  cellHeight?: number;
}

export function StrikeZone({
  selectedZone,
  onSelectZone,
  disabled,
  compact,
  cellWidth,
  cellHeight,
}: StrikeZoneProps) {
  const zones = Array.from({ length: GRID * GRID }, (_, i) => (i + 1) as ZoneId);
  const cellW = cellWidth ?? (compact ? 34 : 48);
  const cellH = cellHeight ?? (compact ? 30 : 44);
  const gridW = cellW * GRID;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {!compact && <Text style={styles.header}>TARGET ZONE</Text>}
      <View style={[styles.grid, { width: gridW }, compact && styles.gridCompact]}>
        {zones.map(zone => {
          const isSelected = selectedZone === zone;
          const type = zoneType(zone);
          // Out-of-zone (ball) cells read dim; strike-zone cells read brighter.
          let bg = type === 'ball'
            ? (compact ? 'rgba(11,30,61,0.32)' : 'rgba(22,40,71,0.40)')
            : (compact ? 'rgba(46,213,115,0.12)' : 'rgba(46,213,115,0.14)');
          let borderColor = type === 'ball'
            ? (compact ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.10)')
            : (compact ? 'rgba(46,213,115,0.30)' : 'rgba(46,213,115,0.30)');
          if (type === 'corner') bg = compact ? 'rgba(255,204,0,0.16)' : 'rgba(255,204,0,0.18)';
          if (type === 'center') bg = compact ? 'rgba(255,71,87,0.18)' : 'rgba(255,71,87,0.20)';
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
        {/* Highlighted strike zone — the center 3×3 box (cols 3-5, rows 3-5) */}
        <View
          style={[
            styles.strikeBox,
            compact && styles.strikeBoxCompact,
            {
              left: cellW * 3,
              top: cellH * 3,
              width: cellW * 3,
              height: cellH * 3,
            },
          ]}
        />
      </View>
      {!compact && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(46,213,115,0.6)' }]} />
            <Text style={styles.legendText}>Strike zone</Text>
          </View>
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
  strikeBox: {
    position: 'absolute',
    pointerEvents: 'none',
    borderWidth: 2.5,
    borderColor: '#2ED573',
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  strikeBoxCompact: {
    borderWidth: 2,
    borderColor: 'rgba(46,213,115,0.95)',
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
