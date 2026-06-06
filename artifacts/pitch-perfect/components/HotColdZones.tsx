import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ─── Batter profiles ─────────────────────────────────────────────────────────
// 9 heat-zone entries per batter, row-major top-left → bottom-right:
//   (0) Up-In    (1) Up-Mid    (2) Up-Away
//   (3) Mid-In   (4) Heart     (5) Mid-Away
//   (6) Down-In  (7) Down-Mid  (8) Down-Away
const LABELS = [
  'Up & In', 'Up & Middle', 'Up & Away',
  'Middle In', 'Heart', 'Middle Away',
  'Down & In', 'Down Middle', 'Down & Away',
] as const;

interface ZoneEntry   { label: string; avg: number }
interface BatterProfile { name: string; scout: string; zones: ZoneEntry[] }

function makeZones(avgs: readonly number[]): ZoneEntry[] {
  return avgs.map((avg, i) => ({ label: LABELS[i], avg }));
}

export const BATTERS: BatterProfile[] = [
  {
    name:  'Big Mac',
    scout: 'Pull hitter — attacks inside pitches',
    zones: makeZones([0.271, 0.244, 0.196, 0.341, 0.318, 0.252, 0.308, 0.267, 0.211]),
  },
  {
    name:  'Slap Jack',
    scout: 'Opposite-field hitter — goes with the pitch away',
    zones: makeZones([0.187, 0.208, 0.249, 0.241, 0.276, 0.321, 0.233, 0.291, 0.336]),
  },
  {
    name:  'High Fly',
    scout: 'High-ball hitter — elevate at your own risk',
    zones: makeZones([0.315, 0.342, 0.298, 0.264, 0.257, 0.248, 0.213, 0.197, 0.178]),
  },
];

// ─── Heat-zone helpers (used by StrikeZone & game.tsx) ───────────────────────
// Strike zone = rows 3-5, cols 3-5 (0-indexed) in the 9×9 pitch grid.
// Zone slot index within the 3×3: (row-3)*3 + (col-3), row-major, top-left → bottom-right.

const HOT_THRESHOLD  = 0.280;
const COLD_THRESHOLD = 0.220;

export function zoneColor(avg: number): string {
  if (avg > HOT_THRESHOLD)  return '#D63031';
  if (avg < COLD_THRESHOLD) return '#0984E3';
  return '#636E72';
}

export function fmtAvg(avg: number): string {
  return avg.toFixed(3).replace('0.', '.');
}

/**
 * Returns the 9 batting averages for the batter in row-major order within the 3×3 strike zone:
 *   [up-in, up-mid, up-away, mid-in, heart, mid-away, down-in, down-mid, down-away]
 * Pass directly to StrikeZone's `heatZoneAvgs` prop — colors are computed from cell position,
 * never from zone IDs, so alignment is guaranteed.
 */
export function getBatterAvgs(batterIndex: number): readonly number[] {
  return BATTERS[batterIndex % BATTERS.length].zones.map(z => z.avg);
}

/**
 * Returns the stat for a given 9×9 ZoneId, or null if it's outside the strike zone.
 * Uses position math (row/col offset) so there is no ID-mapping that can drift.
 */
export function getZoneStat(
  batterIndex: number,
  zoneId: number,
): { label: string; avg: number } | null {
  const col = (zoneId - 1) % 9;
  const row = Math.floor((zoneId - 1) / 9);
  if (col < 3 || col > 5 || row < 3 || row > 5) return null;
  const idx = (row - 3) * 3 + (col - 3);
  return BATTERS[batterIndex % BATTERS.length].zones[idx] ?? null;
}

// ─── Compact info strip ───────────────────────────────────────────────────────
interface Props {
  batterIndex: number;
  selectedZoneId?: number | null;
}

export function HotColdZones({ batterIndex, selectedZoneId }: Props) {
  const batter = BATTERS[batterIndex % BATTERS.length];
  const [lastStat, setLastStat] = useState<{ label: string; avg: number } | null>(null);

  // Update tooltip when selected zone changes
  useEffect(() => {
    if (selectedZoneId != null) {
      const stat = getZoneStat(batterIndex, selectedZoneId);
      if (stat) setLastStat(stat);
    }
  }, [selectedZoneId, batterIndex]);

  // Clear tooltip on batter change
  useEffect(() => { setLastStat(null); }, [batterIndex]);

  const activeStat = selectedZoneId != null
    ? getZoneStat(batterIndex, selectedZoneId)
    : lastStat;

  return (
    <View style={styles.container}>

      {/* Batter identity */}
      <View style={styles.header}>
        <Text style={styles.title}>🔥 HOT &amp; COLD ZONES</Text>
        <Text style={styles.batterName}>{batter.name}</Text>
        <Text style={styles.scoutNote}>{batter.scout}</Text>
      </View>

      {/* Legend + tooltip on one line */}
      <View style={styles.footer}>
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: '#D63031' }]} />
          <Text style={styles.legendText}>Hot</Text>
          <View style={[styles.dot, { backgroundColor: '#636E72' }]} />
          <Text style={styles.legendText}>Avg</Text>
          <View style={[styles.dot, { backgroundColor: '#0984E3' }]} />
          <Text style={styles.legendText}>Cold</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.statText} numberOfLines={1}>
          {activeStat ? (
            <>
              <Text style={styles.statLabel}>{activeStat.label}</Text>
              <Text style={styles.statSep}>  ·  </Text>
              <Text style={[styles.statVal, { color: zoneColor(activeStat.avg) }]}>
                {fmtAvg(activeStat.avg)}
              </Text>
            </>
          ) : (
            <Text style={styles.statHint}>Tap a zone above</Text>
          )}
        </Text>
      </View>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  header:      { alignItems: 'center', gap: 1 },
  title: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  batterName: {
    color: '#FFCC00',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scoutNote: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 10,
    fontStyle: 'italic',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 10,
    marginRight: 2,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  statText: {
    flex: 1,
    fontSize: 11,
    textAlign: 'center',
  },
  statLabel:  { color: '#FFFFFF', fontWeight: '700' },
  statSep:    { color: 'rgba(255,255,255,0.35)' },
  statVal:    { fontWeight: '800' },
  statHint:   { color: 'rgba(255,255,255,0.30)', fontStyle: 'italic' },
});
