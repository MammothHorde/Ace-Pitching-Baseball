import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ─── Mock data ───────────────────────────────────────────────────────────────
// 9 cells mapped to the standard strike zone, row-major top-left → bottom-right.
//   TL  TC  TR      (1) (2) (3)
//   ML  MC  MR  →   (4) (5) (6)
//   BL  BC  BR      (7) (8) (9)
const ZONE_DATA = [
  { id: 1, label: 'Up & In',      avg: 0.241 },
  { id: 2, label: 'Up & Middle',  avg: 0.198 },
  { id: 3, label: 'Up & Away',    avg: 0.215 },
  { id: 4, label: 'Middle In',    avg: 0.312 },
  { id: 5, label: 'Heart',        avg: 0.334 },
  { id: 6, label: 'Middle Away',  avg: 0.267 },
  { id: 7, label: 'Down & In',    avg: 0.289 },
  { id: 8, label: 'Down Middle',  avg: 0.255 },
  { id: 9, label: 'Down & Away',  avg: 0.191 },
] as const;

// ─── Thresholds ──────────────────────────────────────────────────────────────
const HOT_THRESHOLD  = 0.280; // > .280 → red
const COLD_THRESHOLD = 0.220; // < .220 → blue

function zoneColor(avg: number): string {
  if (avg > HOT_THRESHOLD)  return '#D63031'; // hot
  if (avg < COLD_THRESHOLD) return '#0984E3'; // cold
  return '#636E72';                            // average
}

function fmtAvg(avg: number): string {
  return avg.toFixed(3).replace('0.', '.');
}

// ─── Component ───────────────────────────────────────────────────────────────
export function HotColdZones() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = ZONE_DATA.find(z => z.id === activeId) ?? null;

  const handlePress = (id: number) => {
    setActiveId(prev => (prev === id ? null : id));
  };

  const rows = [
    ZONE_DATA.slice(0, 3),
    ZONE_DATA.slice(3, 6),
    ZONE_DATA.slice(6, 9),
  ];

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔥 BATTER HOT &amp; COLD ZONES</Text>
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: '#D63031' }]} />
          <Text style={styles.legendText}>Hot (&gt;.280)</Text>
          <View style={[styles.dot, { backgroundColor: '#636E72' }]} />
          <Text style={styles.legendText}>Avg</Text>
          <View style={[styles.dot, { backgroundColor: '#0984E3' }]} />
          <Text style={styles.legendText}>Cold (&lt;.220)</Text>
        </View>
      </View>

      {/* 3 × 3 grid */}
      <View style={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map(zone => {
              const color   = zoneColor(zone.avg);
              const isActive = activeId === zone.id;
              return (
                <TouchableOpacity
                  key={zone.id}
                  style={[
                    styles.cell,
                    { backgroundColor: color },
                    isActive && styles.cellActive,
                  ]}
                  onPress={() => handlePress(zone.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.cellAvg}>{fmtAvg(zone.avg)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Info bar — tooltip on tap */}
      <View style={styles.infoBar}>
        {active ? (
          <Text style={styles.infoText} numberOfLines={1}>
            <Text style={styles.infoLabel}>{active.label}</Text>
            <Text style={styles.infoDivider}>  ·  </Text>
            <Text style={styles.infoPre}>Batting Avg: </Text>
            <Text style={[styles.infoVal, { color: zoneColor(active.avg) }]}>
              {fmtAvg(active.avg)}
            </Text>
          </Text>
        ) : (
          <Text style={styles.infoHint}>Tap a zone to see the stat</Text>
        )}
      </View>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const CELL_SIZE = 46;
const CELL_GAP  = 4;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },

  // Header
  header: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    marginRight: 4,
  },

  // Grid
  grid: {
    gap: CELL_GAP,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  row: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  cellActive: {
    borderWidth: 2.5,
    borderColor: '#FFCC00',
  },
  cellAvg: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Info bar
  infoBar: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
  },
  infoLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  infoDivider: {
    color: 'rgba(255,255,255,0.4)',
  },
  infoPre: {
    color: 'rgba(255,255,255,0.7)',
  },
  infoVal: {
    fontWeight: '800',
  },
  infoHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontStyle: 'italic',
  },
});
