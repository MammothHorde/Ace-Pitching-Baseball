import React, { useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AccuracyMeterProps {
  /** 0…1 position — used for label text only (low-freq update). */
  position: number;
  /** When false the meter is shown but idle (no live hint). */
  active?: boolean;
  /** Animated.Value (0…1) driving the smooth needle visual each frame. */
  animValue: Animated.Value;
}

const NEEDLE_W = 5;

export function AccuracyMeter({ position, active = true, animValue }: AccuracyMeterProps) {
  const distFromCenter = Math.abs(position - 0.5) * 2;
  const score = 1 - distFromCenter;

  let label = 'MISS';
  let labelColor = '#FF4757';
  if (score >= 0.75)       { label = 'PERFECT!'; labelColor = '#2ED573'; }
  else if (score >= 0.55)  { label = 'GOOD';     labelColor = '#FFCC00'; }
  else if (score >= 0.35)  { label = 'OK';        labelColor = '#FF9800'; }

  // Measure the rendered track width so the pixel-based translateX range is
  // always correct regardless of screen size. Falls back to 0 until first layout.
  const [trackWidth, setTrackWidth] = useState(0);
  const handleLayout = (e: LayoutChangeEvent) =>
    setTrackWidth(e.nativeEvent.layout.width);

  // Map Animated 0…1 → pixel left offset within the track (no React re-render).
  const animatedLeft = trackWidth > 0
    ? animValue.interpolate({ inputRange: [0, 1], outputRange: [0, trackWidth - NEEDLE_W] })
    : animValue;

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.title}>ACCURACY</Text>
        <Text style={[styles.dynamicLabel, { color: labelColor }]}>{label}</Text>
      </View>

      <View style={styles.track} onLayout={handleLayout}>
        <LinearGradient
          colors={['#FF4757', '#FFCC00', '#2ED573', '#FFCC00', '#FF4757']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.goodZone} />
        <View style={styles.perfectZoneBorder} />
        <View style={styles.centerLine} />
        {/* Needle animated via Animated.View — no layout pass per frame. */}
        <Animated.View style={[styles.needle, { left: animatedLeft }]} />
      </View>

      <Text style={styles.hint}>{active ? 'AIM!' : 'Up next…'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', paddingHorizontal: 4 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  dynamicLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  track: {
    height: 32,
    borderRadius: 16,
    overflow: 'visible',
    position: 'relative',
  },
  goodZone: {
    position: 'absolute',
    left: '30%',
    width: '40%',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  perfectZoneBorder: {
    position: 'absolute',
    left: '37.5%',
    width: '25%',
    top: -3,
    bottom: -3,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  needle: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: NEEDLE_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    marginLeft: -2.5,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  hint: {
    color: '#FFCC00',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
