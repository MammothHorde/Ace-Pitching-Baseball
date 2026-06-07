import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ZoneId } from '@/constants/GameTypes';

// ─── Zone classification ──────────────────────────────────────────────────────
// Inner 3×3 strike zone: zones 1-9 (row-major, left→right, top→bottom)
// Corner shadow ball zones: 11 (upper-inside), 12 (upper-away),
//                           13 (lower-inside), 14 (lower-away)
const STRIKE_ZONES  = new Set<ZoneId>([1, 2, 3, 4, 5, 6, 7, 8, 9]);
const PAINTED_CORNERS = new Set<ZoneId>([1, 3, 7, 9]);
const HEART: ZoneId = 5;

type CellKind = 'heart' | 'corner' | 'edge' | 'shadow';
function cellKind(z: ZoneId): CellKind {
  if (!STRIKE_ZONES.has(z))   return 'shadow';
  if (z === HEART)             return 'heart';
  if (PAINTED_CORNERS.has(z)) return 'corner';
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

// ─── Props ────────────────────────────────────────────────────────────────────
interface StrikeZoneProps {
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
  disabled?: boolean;
  compact?: boolean;
  cellWidth?: number;
  cellHeight?: number;
  /**
   * 9 batting averages in row-major order for zones 1-9:
   *   index 0 = zone 1 (up-in) … index 8 = zone 9 (down-away)
   */
  heatZoneAvgs?: readonly number[];
}

// ─── Component ───────────────────────────────────────────────────────────────
export function StrikeZone({
  selectedZone,
  onSelectZone,
  disabled,
  compact,
  cellWidth,
  cellHeight,
  heatZoneAvgs,
}: StrikeZoneProps) {
  const cellW = cellWidth  ?? (compact ? 46 : 60);
  const cellH = cellHeight ?? (compact ? 38 : 50);
  // Corner shadow zones are slightly narrower than the inner cells.
  const cornW = Math.round(cellW * 0.72);
  const cornH = cellH;

  function renderCell(zone: ZoneId) {
    const isSelected = selectedZone === zone;
    const kind = cellKind(zone);
    const isShadow = kind === 'shadow';
    const w = isShadow ? cornW : cellW;
    const h = isShadow ? cornH : cellH;

    let bg: string;
    let borderColor: string;
    let borderStyle: 'solid' | 'dashed' = 'solid';

    switch (kind) {
      case 'heart':
        bg = 'rgba(255,71,87,0.22)';
        borderColor = 'rgba(255,71,87,0.45)';
        break;
      case 'corner':
        bg = 'rgba(255,204,0,0.18)';
        borderColor = 'rgba(255,204,0,0.50)';
        break;
      case 'edge':
        bg = 'rgba(46,213,115,0.14)';
        borderColor = 'rgba(46,213,115,0.35)';
        break;
      default: // shadow
        bg = 'rgba(11,30,61,0.45)';
        borderColor = 'rgba(255,255,255,0.20)';
        borderStyle = 'dashed';
    }

    // Heat overlay on strike-zone cells (zones 1-9) when not selected.
    if (!isSelected && heatZoneAvgs && STRIKE_ZONES.has(zone)) {
      const avg = heatZoneAvgs[zone - 1]; // zones 1-9 → indices 0-8
      if (avg !== undefined) {
        const hc = avgToHeatColor(avg);
        bg = heatBg(hc);
        borderColor = heatBorder(hc);
        borderStyle = 'solid';
      }
    }

    if (isSelected) {
      bg = '#FFCC00';
      borderColor = '#FFAA00';
      borderStyle = 'solid';
    }

    return (
      <TouchableOpacity
        key={zone}
        style={[
          styles.cell,
          {
            width: w,
            height: h,
            backgroundColor: bg,
            borderColor,
            borderStyle,
            borderRadius: isShadow ? 6 : 3,
          },
        ]}
        onPress={() => !disabled && onSelectZone(zone)}
        activeOpacity={0.55}
      >
        {compact
          ? isSelected && <View style={styles.selectedDot} />
          : null
        }
      </TouchableOpacity>
    );
  }

  // ── Layout:
  // Row 1: [11] [1][2][3] [12]
  // Row 2: spacer [4][5][6] spacer
  // Row 3: [13] [7][8][9] [14]
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {/* Row 1 */}
        <View style={styles.row}>
          {renderCell(11)}
          <View style={styles.szRow}>
            {renderCell(1)}{renderCell(2)}{renderCell(3)}
          </View>
          {renderCell(12)}
        </View>

        {/* Row 2 — no corner zones, use spacers to keep alignment */}
        <View style={styles.row}>
          <View style={{ width: cornW, height: cornH }} />
          <View style={styles.szRow}>
            {renderCell(4)}{renderCell(5)}{renderCell(6)}
          </View>
          <View style={{ width: cornW, height: cornH }} />
        </View>

        {/* Row 3 */}
        <View style={styles.row}>
          {renderCell(13)}
          <View style={styles.szRow}>
            {renderCell(7)}{renderCell(8)}{renderCell(9)}
          </View>
          {renderCell(14)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },

  grid: {
    flexDirection: 'column',
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap: 3,
  },

  // The inner 3×3 block gets the green strike-zone border.
  szRow: {
    flexDirection: 'row',
    borderWidth:   2.5,
    borderColor:   'rgba(46,213,115,0.90)',
    borderRadius:  5,
    overflow:      'hidden',
  },

  cell: {
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },

  selectedDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: '#0B1E3D',
  },
});
