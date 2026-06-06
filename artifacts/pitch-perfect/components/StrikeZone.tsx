import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ZoneId } from '@/constants/GameTypes';

// ─── Grid geometry ────────────────────────────────────────────────────────────
const GRID = 9;

const zoneRow = (z: ZoneId) => Math.floor((z - 1) / GRID);
const zoneCol = (z: ZoneId) => (z - 1) % GRID;

// Strike zone = center 3×3: cols 3-5, rows 3-5 (0-indexed).
const inStrikeZone = (z: ZoneId) =>
  zoneCol(z) >= 3 && zoneCol(z) <= 5 && zoneRow(z) >= 3 && zoneRow(z) <= 5;

type ZoneType = 'ball' | 'edge' | 'corner' | 'center';
function zoneType(z: ZoneId): ZoneType {
  const col = zoneCol(z);
  const row = zoneRow(z);
  if (!inStrikeZone(z)) return 'ball';
  const colEdge = col === 3 || col === 5;
  const rowEdge = row === 3 || row === 5;
  if (col === 4 && row === 4) return 'center';
  if (colEdge && rowEdge)    return 'corner';
  return 'edge';
}

// ─── Heat-color helpers ───────────────────────────────────────────────────────
const HOT_THRESHOLD  = 0.280;
const COLD_THRESHOLD = 0.220;

function avgToHeatColor(avg: number): string {
  if (avg > HOT_THRESHOLD)  return '#D63031';
  if (avg < COLD_THRESHOLD) return '#0984E3';
  return '#636E72';
}

function heatBg(hex: string): string {
  if (hex === '#D63031') return 'rgba(214,48,49,0.52)';
  if (hex === '#0984E3') return 'rgba(9,132,227,0.48)';
  return 'rgba(99,110,114,0.40)';
}
function heatBorder(hex: string): string {
  if (hex === '#D63031') return 'rgba(214,48,49,0.85)';
  if (hex === '#0984E3') return 'rgba(9,132,227,0.85)';
  return 'rgba(99,110,114,0.65)';
}

interface StrikeZoneProps {
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
  disabled?: boolean;
  compact?: boolean;
  cellWidth?: number;
  cellHeight?: number;
  /**
   * 9 batting averages in row-major order within the 3×3 strike zone:
   *   [up-in, up-mid, up-away, mid-in, heart, mid-away, down-in, down-mid, down-away]
   * Colors are derived purely from each cell's position offset (row 3-5, col 3-5),
   * so they are guaranteed to align with the green strike-zone box.
   */
  heatZoneAvgs?: readonly number[];
}

export function StrikeZone({
  selectedZone,
  onSelectZone,
  disabled,
  compact,
  cellWidth,
  cellHeight,
  heatZoneAvgs,
}: StrikeZoneProps) {
  const zones = Array.from({ length: GRID * GRID }, (_, i) => (i + 1) as ZoneId);
  const cellW = cellWidth  ?? (compact ? 34 : 48);
  const cellH = cellHeight ?? (compact ? 30 : 44);
  // Inner grid width: exactly cellW × 9 pixels — no border on this View, so all
  // 9 cells fit per row without any border eating into the available space.
  const gridW = cellW * GRID;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {!compact && <Text style={styles.header}>TARGET ZONE</Text>}

      {/* Outer wrapper: border + rounded corners + overflow clip */}
      <View style={[styles.gridWrapper, compact && styles.gridWrapperCompact]}>
        {/* Inner grid: no border — exactly cellW × 9 content pixels */}
        <View style={[styles.grid, { width: gridW }]}>
          {zones.map(zone => {
            const isSelected = selectedZone === zone;
            const type = zoneType(zone);

            // Compute heat color only for confirmed strike-zone cells.
            let heatColor: string | undefined;
            if (!isSelected && heatZoneAvgs && inStrikeZone(zone)) {
              const szRow = zoneRow(zone) - 3;   // 0, 1, 2
              const szCol = zoneCol(zone) - 3;   // 0, 1, 2
              const idx   = szRow * 3 + szCol;   // 0 – 8
              const avg   = heatZoneAvgs[idx];
              if (avg !== undefined) heatColor = avgToHeatColor(avg);
            }

            let bg = type === 'ball'
              ? (compact ? 'rgba(11,30,61,0.32)' : 'rgba(22,40,71,0.40)')
              : (compact ? 'rgba(46,213,115,0.12)' : 'rgba(46,213,115,0.14)');
            let borderColor = type === 'ball'
              ? (compact ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.10)')
              : (compact ? 'rgba(46,213,115,0.30)' : 'rgba(46,213,115,0.30)');
            if (type === 'corner') bg = compact ? 'rgba(255,204,0,0.16)' : 'rgba(255,204,0,0.18)';
            if (type === 'center') bg = compact ? 'rgba(255,71,87,0.18)' : 'rgba(255,71,87,0.20)';
            if (heatColor) { bg = heatBg(heatColor); borderColor = heatBorder(heatColor); }
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

          {/* Green strike-zone outline — sits on top of cells, no pointer events */}
          <View
            style={[
              styles.strikeBox,
              compact && styles.strikeBoxCompact,
              {
                left:   cellW * 3,
                top:    cellH * 3,
                width:  cellW * 3,
                height: cellH * 3,
              },
            ]}
          />
        </View>
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

// Zone label helper (non-compact mode only)
function zoneLabel(z: ZoneId): string {
  const col = zoneCol(z);
  const row = zoneRow(z);
  if (!inStrikeZone(z)) return '';
  const h = ['HI', 'HI', 'HI', 'MD', 'MD', 'MD', 'LO', 'LO', 'LO'][row] ?? '';
  const v = ['IN', 'MD', 'AW'][col - 3] ?? '';
  if (col === 4 && row === 4) return '♥';
  return `${h}${v}`;
}

const styles = StyleSheet.create({
  container:        { alignItems: 'center' },
  containerCompact: {},
  header: {
    color:         'rgba(255,255,255,0.5)',
    fontSize:      10,
    fontWeight:    '800',
    letterSpacing: 1.5,
    marginBottom:  6,
  },

  // Outer wrapper carries the visual border so the inner grid stays exactly cellW×9 wide.
  gridWrapper: {
    borderWidth:   2,
    borderRadius:  10,
    borderColor:   'rgba(255,255,255,0.25)',
    overflow:      'hidden',
  },
  gridWrapperCompact: {
    borderWidth:   1.5,
    borderRadius:  8,
    borderColor:   'rgba(255,255,255,0.35)',
  },

  // Inner grid: no border, exact width → always 9 cells per row.
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
  },

  zone: {
    borderWidth:      1,
    alignItems:       'center',
    justifyContent:   'center',
  },
  label: {
    fontSize:      9,
    fontWeight:    '800',
    textAlign:     'center',
    letterSpacing: 0.2,
  },
  labelCompact: {
    fontSize:   8,
    fontWeight: '900',
    textAlign:  'center',
  },
  selectedDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    backgroundColor: '#0B1E3D',
  },
  strikeBox: {
    position:        'absolute',
    pointerEvents:   'none',
    borderWidth:     2.5,
    borderColor:     '#2ED573',
    borderRadius:    4,
    backgroundColor: 'transparent',
  },
  strikeBoxCompact: {
    borderWidth: 2,
    borderColor: 'rgba(46,213,115,0.95)',
  },
  legend: {
    flexDirection: 'row',
    gap:           14,
    marginTop:     6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '600' },
});
