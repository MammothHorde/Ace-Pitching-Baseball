import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import type { PitchType } from '@/constants/GameTypes';

// ─── Cubic bezier ─────────────────────────────────────────────────────────────
function cbez(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// ─── Pitch profiles ───────────────────────────────────────────────────────────
// cp1 / cp2 are pixel OFFSETS from the 1/3 and 2/3 points along the straight
// from→to line, applied in screen space (positive X = right, positive Y = down).
// This makes the control points view-independent: they shift the ball off the
// line regardless of where from/to actually are on screen.
//
// Real-pitch intuition (RH pitcher, catcher POV looking toward pitcher):
//   Fastball  – nearly straight, slight apparent "rise" vs. gravity
//   Curveball – arcs up-right early, then breaks sharply down to the plate
//   Slider    – sweeps hard glove-side (right), tight downward tilt
//   Changeup  – arm-side fade (left), drops late; looks like FB early
//   Splitter  – straight until ~60%, then falls off a table
//   Cutter    – late glove-side cut (right), faster & tighter than slider
interface PitchProfile {
  cp1x: number; cp1y: number;
  cp2x: number; cp2y: number;
  duration: number;
  glowColor: string;
}

const PROFILES: Record<PitchType, PitchProfile> = {
  fastball:  { cp1x:  0, cp1y:  0,  cp2x:  0, cp2y:  0,  duration: 300, glowColor: '#FFEE88' },
  curveball: { cp1x: 10, cp1y: -58, cp2x: 24, cp2y: -38, duration: 430, glowColor: '#44DDFF' },
  slider:    { cp1x:  8, cp1y:  -8, cp2x: 40, cp2y:  8,  duration: 350, glowColor: '#FF9922' },
  changeup:  { cp1x: -6, cp1y:   8, cp2x:-24, cp2y: 30,  duration: 465, glowColor: '#BB77FF' },
  splitter:  { cp1x:  0, cp1y:   0, cp2x:  4, cp2y: 48,  duration: 375, glowColor: '#55EE99' },
  cutter:    { cp1x:  5, cp1y:  -5, cp2x: 18, cp2y: -2,  duration: 330, glowColor: '#FF5577' },
};

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  visible:   boolean;
  fromX:     number;
  fromY:     number;
  toX:       number;
  toY:       number;
  pitchType?: PitchType;
}

export function BallFlight({
  visible,
  fromX, fromY,
  toX,   toY,
  pitchType = 'fastball',
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const animX    = useRef(new Animated.Value(fromX)).current;
  const animY    = useRef(new Animated.Value(fromY)).current;
  const scale    = useRef(new Animated.Value(1.4)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const anim     = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) {
      anim.current?.stop();
      opacity.setValue(0);
      return;
    }

    const profile = PROFILES[pitchType] ?? PROFILES.fastball;
    const dx = toX - fromX;
    const dy = toY - fromY;

    // Absolute control-point positions along the flight path + per-pitch offset
    const cp1x = fromX + dx / 3        + profile.cp1x;
    const cp1y = fromY + dy / 3        + profile.cp1y;
    const cp2x = fromX + dx * (2 / 3)  + profile.cp2x;
    const cp2y = fromY + dy * (2 / 3)  + profile.cp2y;

    progress.setValue(0);
    animX.setValue(fromX);
    animY.setValue(fromY);
    scale.setValue(1.4);
    opacity.setValue(1);

    // Drive bezier position from a linear 0→1 progress value
    const lid = progress.addListener(({ value: t }) => {
      animX.setValue(cbez(t, fromX, cp1x, cp2x, toX));
      animY.setValue(cbez(t, fromY, cp1y, cp2y, toY));
    });

    anim.current?.stop();
    anim.current = Animated.parallel([
      Animated.timing(progress, {
        toValue:         1,
        duration:        profile.duration,
        easing:          Easing.linear,
        useNativeDriver: false,
      }),
      Animated.timing(scale, {
        toValue:         0.55,
        duration:        profile.duration,
        easing:          Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.delay(profile.duration - 120),
        Animated.timing(opacity, {
          toValue:         0,
          duration:        120,
          useNativeDriver: false,
        }),
      ]),
    ]);

    anim.current.start(() => progress.removeListener(lid));

    return () => {
      anim.current?.stop();
      progress.removeListener(lid);
    };
  }, [visible, fromX, fromY, toX, toY, pitchType]);

  const profile = PROFILES[pitchType] ?? PROFILES.fastball;

  return (
    <Animated.View
      style={[
        styles.ball,
        {
          shadowColor:  profile.glowColor,
          pointerEvents: 'none',
          opacity,
          transform: [
            { translateX: animX },
            { translateY: animY },
            { scale },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ball: {
    position:      'absolute',
    top:           -9,
    left:          -9,
    width:         18,
    height:        18,
    borderRadius:  9,
    backgroundColor: '#FFFFFF',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius:  12,
    elevation:     10,
  },
});
