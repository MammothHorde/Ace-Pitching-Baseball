import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface GameHUDProps {
  score: number;
  inning: number;
  outs: number;
  strikes: number;
  balls: number;
  sequenceMultiplier: number;
}

function SmallDot({ filled, color }: { filled: boolean; color: string }) {
  return (
    <View style={{
      width: 11, height: 11, borderRadius: 6,
      backgroundColor: filled ? color : 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderColor: filled ? color : 'rgba(255,255,255,0.25)',
      marginHorizontal: 1.5,
    }} />
  );
}

export function GameHUD({ score, inning, outs, strikes, balls, sequenceMultiplier }: GameHUDProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad + 6 }]}>
      <View style={styles.hud}>
        <View style={styles.block}>
          <Text style={styles.label}>SCORE</Text>
          <Text style={styles.scoreVal}>{score.toLocaleString()}</Text>
          {sequenceMultiplier > 1.01 && (
            <View style={styles.multPill}>
              <Text style={styles.multText}>{sequenceMultiplier.toFixed(2)}×</Text>
            </View>
          )}
        </View>

        <View style={styles.centerBlock}>
          <Text style={styles.inningText}>INN {inning}/1</Text>
          <View style={styles.dotsRow}>
            <SmallDot filled={outs >= 1} color="#FFCC00" />
            <SmallDot filled={outs >= 2} color="#FFCC00" />
            <SmallDot filled={outs >= 3} color="#FFCC00" />
          </View>
          <Text style={styles.outsLabel}>OUTS</Text>
        </View>

        <View style={styles.rightBlock}>
          <View style={styles.countPill}>
            <Text style={styles.countBalls}>{balls}</Text>
            <Text style={styles.countSep}>-</Text>
            <Text style={styles.countStrikes}>{strikes}</Text>
          </View>
          <Text style={styles.label}>B - S</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.exitBtn}>
            <MaterialCommunityIcons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 10,
  },
  hud: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11,30,61,0.88)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  block: { flex: 1, alignItems: 'flex-start' },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  scoreVal: { color: '#FFCC00', fontSize: 20, fontWeight: '900', lineHeight: 24 },
  multPill: {
    backgroundColor: 'rgba(255,152,0,0.22)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 1,
  },
  multText: { color: '#FF9800', fontSize: 10, fontWeight: '900' },
  centerBlock: { flex: 1, alignItems: 'center' },
  inningText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  dotsRow: { flexDirection: 'row', marginTop: 4 },
  outsLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 7, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  rightBlock: { flex: 1, alignItems: 'flex-end', gap: 2 },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  countBalls: { color: '#5AC8FA', fontSize: 18, fontWeight: '900' },
  countSep: { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '600' },
  countStrikes: { color: '#FF4757', fontSize: 18, fontWeight: '900' },
  exitBtn: { marginTop: 4 },
});
