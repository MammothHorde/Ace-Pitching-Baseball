import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import type { ZoneId } from '@/constants/GameTypes';

// ─── Zone classification ──────────────────────────────────────────────────────
const PAINTED_CORNERS = new Set<ZoneId>([1, 3, 7, 9]);
const HEART: ZoneId = 5;
const STRIKE_ZONES = new Set<ZoneId>([1, 2, 3, 4, 5, 6, 7, 8, 9]);

// ─── Heat-color helpers ───────────────────────────────────────────────────────
const HOT  = 0.280;
const COLD = 0.220;
function avgToHeatColor(avg: number) {
  if (avg > HOT)  return '#D63031';
  if (avg < COLD) return '#0984E3';
  return '#636E72';
}
function heatBg(c: string) {
  if (c === '#D63031') return 'rgba(214,48,49,0.55)';
  if (c === '#0984E3') return 'rgba(9,132,227,0.52)';
  return 'rgba(99,110,114,0.42)';
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
  disabled?: boolean;
  compact?: boolean;
  cellWidth?: number;
  cellHeight?: number;
  /** 9 batting-average values, zones 1-9 in row-major order (index = zone - 1). */
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
}: Props) {
  const cellW = cellWidth  ?? (compact ? 36 : 52);
  const cellH = cellHeight ?? (compact ? 30 : 44);
  const cornW = Math.round(cellW * 0.72);
  const cornH = cellH;

  // ── Inner 3×3 cell ──────────────────────────────────────────────────────────
  function renderInner(zone: ZoneId) {
    const isSelected = selectedZone === zone;
    let bg: string;

    if (isSelected) {
      bg = '#FFCC00';
    } else if (heatZoneAvgs) {
      const avg = heatZoneAvgs[zone - 1];
      bg = avg !== undefined ? heatBg(avgToHeatColor(avg)) : defaultBg(zone);
    } else {
      bg = defaultBg(zone);
    }

    return (
      <TouchableOpacity
        key={zone}
        style={[styles.innerCell, { width: cellW, height: cellH, backgroundColor: bg }]}
        onPress={() => !disabled && onSelectZone(zone)}
        activeOpacity={0.55}
      >
        {isSelected && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  }

  // ── Corner shadow cell ──────────────────────────────────────────────────────
  function renderCorner(zone: ZoneId) {
    const isSelected = selectedZone === zone;
    return (
      <TouchableOpacity
        key={zone}
        style={[
          styles.cornerCell,
          {
            width: cornW,
            height: cornH,
            backgroundColor: isSelected ? '#FFCC00' : 'rgba(11,30,61,0.55)',
          },
        ]}
        onPress={() => !disabled && onSelectZone(zone)}
        activeOpacity={0.55}
      >
        {isSelected && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  }

  // Layout:
  //   [ left-col: 11 / gap / 13 ]  [ 3×3 box ]  [ right-col: 12 / gap / 14 ]
  return (
    <View style={styles.container}>
      {/* Left corner column */}
      <View style={styles.cornerCol}>
        {renderCorner(11)}
        <View style={{ height: cornH }} />
        {renderCorner(13)}
      </View>

      {/* Inner 3×3 — single green border, no gaps between cells */}
      <View style={styles.szBox}>
        <View style={styles.szRow}>{renderInner(1)}{renderInner(2)}{renderInner(3)}</View>
        <View style={styles.szRow}>{renderInner(4)}{renderInner(5)}{renderInner(6)}</View>
        <View style={styles.szRow}>{renderInner(7)}{renderInner(8)}{renderInner(9)}</View>
      </View>

      {/* Right corner column */}
      <View style={styles.cornerCol}>
        {renderCorner(12)}
        <View style={{ height: cornH }} />
        {renderCorner(14)}
      </View>
    </View>
  );
}

// ── Zone default background ───────────────────────────────────────────────────
function defaultBg(zone: ZoneId): string {
  if (zone === HEART)              return 'rgba(255,71,87,0.28)';
  if (PAINTED_CORNERS.has(zone))   return 'rgba(255,204,0,0.22)';
  return 'rgba(46,213,115,0.18)';
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap: 3,
  },

  // Single green border wrapping all 9 cells — no gaps inside.
  szBox: {
    borderWidth:  2.5,
    borderColor:  'rgba(46,213,115,0.92)',
    borderRadius: 5,
    overflow:     'hidden',
    flexDirection: 'column',
  },
  szRow: {
    flexDirection: 'row',
  },

  // Inner cell — no individual border; rely on the outer szBox border.
  innerCell: {
    alignItems:     'center',
    justifyContent: 'center',
  },

  cornerCol: {
    flexDirection: 'column',
  },
  cornerCell: {
    borderWidth:   1,
    borderColor:   'rgba(255,255,255,0.22)',
    borderStyle:   'dashed',
    borderRadius:  5,
    alignItems:    'center',
    justifyContent: 'center',
  },

  dot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: '#0B1E3D',
  },
});
