import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { PitchOutcome, PitchResult } from '@/constants/GameTypes';

interface Props {
  result: PitchResult;
  visible: boolean;
}

const OUTCOME_CONFIG: Record<PitchOutcome, { label: string; color: string; sub: string }> = {
  strike_called:   { label: 'STRIKE!', color: '#2ED573', sub: 'Called Strike' },
  strike_swinging: { label: 'STRIKE!', color: '#2ED573', sub: 'Swinging Strike' },
  ball:            { label: 'BALL',    color: '#5AC8FA', sub: 'Outside the Zone' },
  foul:            { label: 'FOUL',    color: '#FFCC00', sub: 'Foul Ball' },
  hit:             { label: 'HIT!',    color: '#FF4757', sub: 'Ball in Play' },
};

export function PitchResultOverlay({ result, visible }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale  = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 7 }),
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.82, duration: 280, useNativeDriver: true }),
      ]).start(() => { scale.setValue(0.5); });
    }
  }, [visible]);

  const cfg = OUTCOME_CONFIG[result.outcome];

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Text style={[styles.big, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={styles.sub}>{cfg.sub}</Text>

        {result.isKO && (
          <View style={[styles.badge, { backgroundColor: cfg.color }]}>
            <Text style={styles.badgeTxt}>
              {result.isKOLooking ? '⚡ STRIKEOUT LOOKING!' : '⚡ STRIKEOUT!'}
            </Text>
          </View>
        )}

        {result.isPayoffPitch && (
          <View style={styles.payoffBadge}>
            <Text style={styles.payoffTxt}>🔥 PAYOFF PITCH WON</Text>
          </View>
        )}

        {result.totalPoints > 0 && (
          <View style={styles.ptsRow}>
            <Text style={styles.ptsVal}>+{result.totalPoints}</Text>
            {result.multiplier > 1.01 && (
              <Text style={styles.mult}>{result.multiplier.toFixed(2)}×</Text>
            )}
          </View>
        )}

        <View style={styles.bonusRow}>
          {result.isPerfectPower && (
            <View style={[styles.chip, { backgroundColor: 'rgba(46,213,115,0.18)' }]}>
              <Text style={[styles.chipTxt, { color: '#2ED573' }]}>PERFECT POWER</Text>
            </View>
          )}
          {result.isPerfectAccuracy && (
            <View style={[styles.chip, { backgroundColor: 'rgba(255,204,0,0.18)' }]}>
              <Text style={[styles.chipTxt, { color: '#FFCC00' }]}>PERFECT AIM</Text>
            </View>
          )}
        </View>

        {result.strategyLabels.length > 0 && (
          <View style={styles.stratRow}>
            {result.strategyLabels.map(l => (
              <View key={l} style={styles.stratChip}>
                <Text style={styles.stratChipTxt}>{l}</Text>
              </View>
            ))}
          </View>
        )}

        {result.sequenceLabel !== '' && (
          <Text style={styles.seqLabel}>{result.sequenceLabel}</Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  card: {
    backgroundColor: 'rgba(22,40,71,0.97)',
    borderRadius: 28,
    paddingHorizontal: 36,
    paddingVertical: 28,
    alignItems: 'center',
    minWidth: 250,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  big:      { fontSize: 52, fontWeight: '900', letterSpacing: 2 },
  sub:      { color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 2, fontWeight: '600' },
  badge:    { marginTop: 10, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  badgeTxt: { color: '#0B1E3D', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  ptsRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  ptsVal:   { color: '#FFCC00', fontSize: 36, fontWeight: '900' },
  mult:     { color: '#FF9800', fontSize: 18, fontWeight: '800' },
  bonusRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  chip:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipTxt:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  payoffBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,71,87,0.22)',
    borderWidth: 1,
    borderColor: '#FF4757',
  },
  payoffTxt: { color: '#FF6B6B', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  stratRow:  { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  stratChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(83,82,237,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(124,123,255,0.5)',
  },
  stratChipTxt: { color: '#9D9CFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  seqLabel: { color: '#FF9800', fontSize: 11, fontWeight: '700', marginTop: 8, letterSpacing: 0.5 },
});
