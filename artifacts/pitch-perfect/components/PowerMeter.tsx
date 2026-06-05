import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PowerMeterProps {
  /** 0…1 power level (oscillates up/down the y-axis while active). */
  level: number;
  /** When false the meter is shown but idle/locked (no live animation). */
  active?: boolean;
}

export function PowerMeter({ level, active = true }: PowerMeterProps) {
  const isPerfect = level >= 0.60 && level <= 0.88;
  const isWeak = level < 0.30;
  const isMax = level > 0.92;
  const pct = Math.round(level * 100);

  let barColors: [string, string] = ['#FFCC00', '#F39C12'];
  let valueColor = '#FFCC00';
  if (isWeak) { barColors = ['#FF6B6B', '#FF4757']; valueColor = '#FF6B6B'; }
  else if (isPerfect) { barColors = ['#2ED573', '#00B894']; valueColor = '#2ED573'; }
  else if (isMax) { barColors = ['#FF4757', '#C0392B']; valueColor = '#FF4757'; }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>POWER</Text>

      <View style={styles.track}>
        {/* Perfect band: 60%–88% measured from the bottom. */}
        <View style={styles.perfectZone} />
        {/* Fill rises from the bottom; its height tracks the live level. */}
        <View style={[styles.fillWrap, { height: `${pct}%` }]}>
          <LinearGradient
            colors={barColors}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.cap, { backgroundColor: '#FFFFFF', opacity: active ? 1 : 0.5 }]} />
        </View>
      </View>

      <Text style={[styles.pct, { color: valueColor }]}>{pct}%</Text>
    </View>
  );
}

const TRACK_H = 152;

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', width: 58 },
  title: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  track: {
    width: 34,
    height: TRACK_H,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 17,
    overflow: 'hidden',
    position: 'relative',
  },
  perfectZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '60%',
    height: '28%',
    backgroundColor: 'rgba(46,213,115,0.14)',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: 'rgba(46,213,115,0.5)',
  },
  fillWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 17,
    overflow: 'hidden',
  },
  cap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
  pct: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
    minWidth: 40,
    textAlign: 'center',
  },
});
