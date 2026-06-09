import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { PitchType } from '@/constants/GameTypes';
import { PITCH_INFO } from '@/utils/gameLogic';

interface Props {
  visible: boolean;
  pitchType: PitchType;
  mph: number;
}

export function SpeedBanner({ visible, pitchType, mph }: Props) {
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(40);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 180,
          friction: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 40,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const info = PITCH_INFO[pitchType];

  return (
    <Animated.View
      style={[styles.wrap, { opacity, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <View style={[styles.bar, { borderLeftColor: info.color }]}>
        <Text style={[styles.pitchName, { color: info.color }]}>
          {info.shortName}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.mph}>{mph}</Text>
        <Text style={styles.mphLabel}>MPH</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8,16,36,0.88)',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 7,
    gap: 10,
    borderLeftWidth: 3,
  },
  pitchName: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  mph: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  mphLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginTop: 4,
  },
});
