import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface Props {
  label: string;
  visible: boolean;
}

const LABEL_CONFIG: Record<string, { color: string; sub: string }> = {
  'Perfect!': { color: '#2ED573', sub: 'Flawless gesture' },
  'Good':     { color: '#FFCC00', sub: 'Solid delivery' },
  'Wild!':    { color: '#FF4757', sub: 'Off target' },
};

export function GestureQualityLabel({ label, visible }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.5);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 130, friction: 7 }),
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.82, duration: 220, useNativeDriver: true }),
      ]).start(() => scale.setValue(0.5));
    }
  }, [visible]);

  const cfg = LABEL_CONFIG[label] ?? { color: '#FFFFFF', sub: '' };

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Text style={[styles.label, { color: cfg.color }]}>{label}</Text>
        {cfg.sub ? <Text style={styles.sub}>{cfg.sub}</Text> : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 55,
  },
  card: {
    backgroundColor: 'rgba(22,40,71,0.95)',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  label: { fontSize: 46, fontWeight: '900', letterSpacing: 1.5 },
  sub:   { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600', marginTop: 4 },
});
