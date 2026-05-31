import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CountSituation } from '@/constants/GameTypes';

interface Props {
  situation: CountSituation;
}

export function CountBanner({ situation }: Props) {
  const isPayoff = situation.key === 'payoff';
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isPayoff) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 520, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 520, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isPayoff]);

  if (situation.label === '') return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          borderColor: situation.color,
          backgroundColor: `${situation.color}1F`,
          transform: [{ scale: isPayoff ? pulse : 1 }],
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: situation.color }]} />
        <Text style={[styles.label, { color: situation.color }]}>
          {isPayoff ? '🔥 ' : ''}{situation.label}
        </Text>
      </View>
      <Text style={styles.hint}>{situation.hint}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  hint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});
