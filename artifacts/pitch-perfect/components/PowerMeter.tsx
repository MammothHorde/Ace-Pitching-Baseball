import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PowerMeterProps {
  level: number;
}

export function PowerMeter({ level }: PowerMeterProps) {
  const isPerfect = level >= 0.60 && level <= 0.88;
  const isWeak = level < 0.30;
  const isMax = level > 0.92;
  const pct = Math.round(level * 100);

  let barColors: [string, string] = ['#FFCC00', '#F39C12'];
  let label = 'BUILDING...';
  let labelColor = '#FFCC00';

  if (isWeak) { barColors = ['#FF6B6B', '#FF4757']; label = 'TOO WEAK'; labelColor = '#FF6B6B'; }
  else if (isPerfect) { barColors = ['#2ED573', '#00B894']; label = '✦ PERFECT ZONE ✦'; labelColor = '#2ED573'; }
  else if (isMax) { barColors = ['#FF4757', '#C0392B']; label = 'MAXED OUT!'; labelColor = '#FF4757'; }

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.title}>POWER</Text>
        <Text style={[styles.dynamicLabel, { color: labelColor }]}>{label}</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={styles.perfectZoneBg} />
        <View style={[styles.fillWrap, { width: `${pct}%` }]}>
          <LinearGradient
            colors={barColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={[styles.tickMark, { left: '60%' }]} />
        <View style={[styles.tickMark, { left: '88%' }]} />
      </View>
      <Text style={styles.hint}>Hold anywhere · release in the green zone</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', paddingHorizontal: 4 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  dynamicLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  pct: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  track: {
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  perfectZoneBg: {
    position: 'absolute',
    left: '60%',
    width: '28%',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(46,213,115,0.12)',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(46,213,115,0.45)',
  },
  fillWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tickMark: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: 2,
    backgroundColor: 'rgba(46,213,115,0.7)',
    borderRadius: 1,
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.3,
  },
});
