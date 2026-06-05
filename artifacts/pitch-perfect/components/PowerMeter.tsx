import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PowerMeterProps {
  /** 0…1 power level — used for label text only (low-freq update). */
  level: number;
  /** When false the meter is shown but idle/locked (no live animation). */
  active?: boolean;
  /** Animated.Value (0…1) driving the smooth bar visual each frame. */
  animValue: Animated.Value;
}

const TRACK_H = 152;

export function PowerMeter({ level, active = true, animValue }: PowerMeterProps) {
  const isPerfect = level >= 0.60 && level <= 0.88;
  const isWeak = level < 0.30;
  const isMax = level > 0.92;
  const pct = Math.round(level * 100);

  let barColors: [string, string] = ['#FFCC00', '#F39C12'];
  let valueColor = '#FFCC00';
  if (isWeak)    { barColors = ['#FF6B6B', '#FF4757']; valueColor = '#FF6B6B'; }
  else if (isPerfect) { barColors = ['#2ED573', '#00B894']; valueColor = '#2ED573'; }
  else if (isMax) { barColors = ['#FF4757', '#C0392B']; valueColor = '#FF4757'; }

  // Pin the fill bar to the track's bottom using transform-only animation so
  // no layout pass is needed per frame (compatible with useNativeDriver: true
  // if ever switched). translateY shifts the center of the full-height bar
  // downward so its bottom edge always sits at TRACK_H regardless of scale.
  const translateY = animValue.interpolate({ inputRange: [0, 1], outputRange: [TRACK_H / 2, 0] });

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>POWER</Text>

      <View style={styles.track}>
        {/* Perfect band overlay: 60 %–88 % from the bottom. */}
        <View style={styles.perfectZone} />

        {/* Full-height fill scaled + translated by Animated — zero React re-renders. */}
        <Animated.View style={[styles.fillWrap, { transform: [{ translateY }, { scaleY: animValue }] }]}>
          <LinearGradient
            colors={barColors}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.cap, { opacity: active ? 1 : 0.5 }]} />
        </Animated.View>
      </View>

      <Text style={[styles.pct, { color: valueColor }]}>{pct}%</Text>
    </View>
  );
}

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
    top: 0,
    height: TRACK_H,
    overflow: 'hidden',
  },
  cap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  pct: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
    minWidth: 40,
    textAlign: 'center',
  },
});
