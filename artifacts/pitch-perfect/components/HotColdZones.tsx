import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ─── Batter profiles ─────────────────────────────────────────────────────────
// Each batter has 9 zone entries (row-major, top-left → bottom-right):
//   (1) Up-In    (2) Up-Mid    (3) Up-Away
//   (4) Mid-In   (5) Heart     (6) Mid-Away
//   (7) Down-In  (8) Down-Mid  (9) Down-Away

const LABELS = [
  'Up & In', 'Up & Middle', 'Up & Away',
  'Middle In', 'Heart', 'Middle Away',
  'Down & In', 'Down Middle', 'Down & Away',
] as const;

interface ZoneEntry { id: number; label: string; avg: number }
interface BatterProfile { name: string; scout: string; zones: ZoneEntry[] }

function makeZones(avgs: readonly number[]): ZoneEntry[] {
  return avgs.map((avg, i) => ({ id: i + 1, label: LABELS[i], avg }));
}

const BATTERS: BatterProfile[] = [
  {
    name:  'Big Mac',
    scout: 'Pull hitter — attacks inside pitches',
    zones: makeZones([0.271, 0.244, 0.196, 0.341, 0.318, 0.252, 0.308, 0.267, 0.211]),
    //                up-in   up-mid  up-away  mid-in  heart  mid-away  dn-in   dn-mid  dn-away
    // Hot inside (mid-in .341, heart .318, dn-in .308); cold up-away & down-away
  },
  {
    name:  'Slap Jack',
    scout: 'Opposite-field hitter — goes with the pitch away',
    zones: makeZones([0.187, 0.208, 0.249, 0.241, 0.276, 0.321, 0.233, 0.291, 0.336]),
    // Cold up & in (up-in .187, up-mid .208); hot away & down-away (.321, .336)
  },
  {
    name:  'High Fly',
    scout: 'High-ball hitter — elevate at your own risk',
    zones: makeZones([0.315, 0.342, 0.298, 0.264, 0.257, 0.248, 0.213, 0.197, 0.178]),
    // Hot entire top row (.315/.342/.298); cold low row (.213/.197/.178)
  },
];

// ─── Thresholds & helpers ─────────────────────────────────────────────────────
const HOT_THRESHOLD  = 0.280;
const COLD_THRESHOLD = 0.220;

function zoneColor(avg: number): string {
  if (avg > HOT_THRESHOLD)  return '#D63031';
  if (avg < COLD_THRESHOLD) return '#0984E3';
  return '#636E72';
}

function fmtAvg(avg: number): string {
  return avg.toFixed(3).replace('0.', '.');
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props { batterIndex: number }

export function HotColdZones({ batterIndex }: Props) {
  const batter = BATTERS[batterIndex % BATTERS.length];
  const [activeId, setActiveId] = useState<number | null>(null);

  // Clear tooltip whenever a new batter steps up
  useEffect(() => { setActiveId(null); }, [batterIndex]);

  const active = batter.zones.find(z => z.id === activeId) ?? null;

  const rows = [
    batter.zones.slice(0, 3),
    batter.zones.slice(3, 6),
    batter.zones.slice(6, 9),
  ];

  return (
    <View style={styles.container}>

      {/* Header — batter name + scouting note */}
      <View style={styles.header}>
        <Text style={styles.title}>🔥 HOT &amp; COLD ZONES</Text>
        <Text style={styles.batterName}>{batter.name}</Text>
        <Text style={styles.scoutNote}>{batter.scout}</Text>
      </View>

      {/* Grid + legend side-by-side */}
      <View style={styles.body}>

        {/* 3 × 3 color grid */}
        <View style={styles.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map(zone => {
                const color    = zoneColor(zone.avg);
                const isActive = activeId === zone.id;
                return (
                  <TouchableOpacity
                    key={zone.id}
                    style={[styles.cell, { backgroundColor: color }, isActive && styles.cellActive]}
                    onPress={() => setActiveId(prev => (prev === zone.id ? null : zone.id))}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cellAvg}>{fmtAvg(zone.avg)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend column */}
        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#D63031' }]} />
            <Text style={styles.legendText}>Hot{'\n'}(&gt;.280)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#636E72' }]} />
            <Text style={styles.legendText}>Avg</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: '#0984E3' }]} />
            <Text style={styles.legendText}>Cold{'\n'}(&lt;.220)</Text>
          </View>
        </View>

      </View>

      {/* Tooltip bar */}
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
const CELL_SIZE = 44;
const CELL_GAP  = 4;

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },

  header:      { alignItems: 'center', gap: 2 },
  title: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  batterName: {
    color: '#FFCC00',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  scoutNote: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  body: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  grid: {
    gap: CELL_GAP,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 2,
  },
  row:  { flexDirection: 'row', gap: CELL_GAP },
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

  legend:    { gap: 10, alignItems: 'flex-start' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    lineHeight: 13,
  },

  infoBar: { height: 18, justifyContent: 'center', alignItems: 'center' },
  infoText: { fontSize: 12, textAlign: 'center' },
  infoLabel: { color: '#FFFFFF', fontWeight: '700' },
  infoDivider: { color: 'rgba(255,255,255,0.4)' },
  infoPre: { color: 'rgba(255,255,255,0.7)' },
  infoVal: { fontWeight: '800' },
  infoHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontStyle: 'italic',
  },
});
