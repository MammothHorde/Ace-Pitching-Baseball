import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { PitchOutcome } from '@/constants/GameTypes';

const { width: SW, height: SH } = Dimensions.get('window');
const SCENE_H = Math.min(SH * 0.52, 440);

const IMG_W = SW;
const IMG_H = IMG_W / 0.75;
const IMG_TOP = -((IMG_H - SCENE_H) / 2) + 20;

const BATTERS = [
  require('@/assets/images/batter_1.png'),
  require('@/assets/images/batter_2.png'),
  require('@/assets/images/batter_3.png'),
];

// Bat shape: barrel on left, handle/knob on right
const BAT_W = 112;
const BAT_H = 14;
// Center of bat in scene — sits at roughly the contact zone
const BAT_CX = SW * 0.47;
const BAT_CY = SCENE_H * 0.54;

interface Props {
  batterIndex?: number;
  /** Not used for layout — kept for API compat */
  visibleTop?: number;
  /** Outcome of the most-recently resolved pitch */
  outcome?: PitchOutcome | null;
  /** Increments with each resolved pitch to retrigger the animation */
  animTrigger?: number;
}

export function BatterScene({ batterIndex = 0, outcome, animTrigger = 0 }: Props) {
  // ── animation values ────────────────────────────────────────────────────────
  const bodyRotate  = useRef(new Animated.Value(0)).current;
  const bodyShiftX  = useRef(new Animated.Value(0)).current;
  const batProgress = useRef(new Animated.Value(0)).current;
  const batOpacity  = useRef(new Animated.Value(0)).current;
  // Idle stance: gentle vertical breathe
  const idleY       = useRef(new Animated.Value(0)).current;
  const idleRef     = useRef<Animated.CompositeAnimation | null>(null);

  const startIdle = useCallback(() => {
    idleRef.current?.stop();
    idleRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(idleY, { toValue: -2.5, duration: 1500, useNativeDriver: true }),
        Animated.timing(idleY, { toValue: 0,    duration: 1500, useNativeDriver: true }),
      ]),
    );
    idleRef.current.start();
  }, [idleY]);

  // Start idle on mount
  useEffect(() => {
    startIdle();
    return () => idleRef.current?.stop();
  }, [startIdle]);

  // Reset animations when a new batter steps in
  useEffect(() => {
    idleRef.current?.stop();
    bodyRotate.setValue(0);
    bodyShiftX.setValue(0);
    batOpacity.setValue(0);
    batProgress.setValue(0);
    idleY.setValue(0);
    startIdle();
  }, [batterIndex]);

  // React to each resolved pitch
  useEffect(() => {
    if (animTrigger === 0 || !outcome) return;

    const isSwing = outcome === 'hit' || outcome === 'foul' || outcome === 'strike_swinging';
    const isHit   = outcome === 'hit' || outcome === 'foul';

    idleRef.current?.stop();
    idleY.setValue(0);

    if (isSwing) {
      // Full swing — body leans through contact, bat arc fires
      const swingMs   = isHit ? 245 : 185;
      const leanAngle = isHit ? 4   : 7;
      const leanShift = isHit ? 4   : 9;

      Animated.parallel([
        // Body lean forward during swing
        Animated.sequence([
          Animated.timing(bodyRotate, { toValue: leanAngle,  duration: swingMs, useNativeDriver: true }),
          Animated.spring (bodyRotate, { toValue: 0, tension: 80, friction: 8,  useNativeDriver: true }),
        ]),
        // Slight weight shift toward pitcher
        Animated.sequence([
          Animated.timing(bodyShiftX, { toValue: leanShift,  duration: swingMs, useNativeDriver: true }),
          Animated.spring (bodyShiftX, { toValue: 0, tension: 80, friction: 8,  useNativeDriver: true }),
        ]),
        // Bat sweeps through the zone then fades
        Animated.sequence([
          Animated.timing(batOpacity,  { toValue: 1,  duration: 55,           useNativeDriver: true }),
          Animated.timing(batProgress, { toValue: 1,  duration: swingMs + 90, useNativeDriver: true }),
          Animated.timing(batOpacity,  { toValue: 0,  duration: 310,          useNativeDriver: true }),
        ]),
      ]).start(() => {
        batProgress.setValue(0);
        startIdle();
      });
    } else {
      // Take pitch — slight lean back (watching it go by), then settle
      Animated.sequence([
        Animated.timing(bodyRotate, { toValue: -3, duration: 145, useNativeDriver: true }),
        Animated.spring (bodyRotate, { toValue: 0, tension: 90, friction: 9, useNativeDriver: true }),
      ]).start(() => startIdle());
    }
  }, [animTrigger]);

  // ── interpolations ──────────────────────────────────────────────────────────

  const bodyRotateDeg = bodyRotate.interpolate({
    inputRange: [-10, 0, 10],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  // Bat arc: loaded (+35°) → contact (−4°) → follow-through (−56°)
  // Barrel starts upper-left (loaded stance), sweeps down-left (follow-through)
  const batRotateDeg = batProgress.interpolate({
    inputRange: [0, 0.38, 1],
    outputRange: ['35deg', '-4deg', '-56deg'],
  });
  // Bat drifts left as it sweeps through the zone
  const batTx = batProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [16, -20],
  });
  // Bat drops slightly through the level swing plane
  const batTy = batProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [-10, 0, 10],
  });

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {/* Batter image — breathes at idle, leans on swing/take */}
      <Animated.Image
        source={BATTERS[batterIndex % BATTERS.length]}
        style={[
          styles.scene,
          {
            top: IMG_TOP,
            transform: [
              { translateY: idleY },
              { rotate: bodyRotateDeg },
              { translateX: bodyShiftX },
            ],
          },
        ]}
        resizeMode="stretch"
      />

      {/* Bat overlay — only visible during a swing */}
      <Animated.View
        style={[
          styles.bat,
          {
            left:    BAT_CX - BAT_W / 2,
            top:     BAT_CY - BAT_H / 2,
            opacity: batOpacity,
            transform: [
              { translateX: batTx },
              { translateY: batTy },
              { rotate: batRotateDeg },
            ],
          },
        ]}
      >
        <Svg width={BAT_W} height={BAT_H}>
          {/* Barrel end cap */}
          <Circle cx={7} cy={BAT_H / 2} r={6.5} fill="rgba(215,162,58,0.97)" />
          {/* Barrel body */}
          <Rect
            x={5} y={1} width={66} height={BAT_H - 2} rx={5}
            fill="rgba(215,162,58,0.97)"
            stroke="rgba(0,0,0,0.25)" strokeWidth={0.6}
          />
          {/* Taper toward handle */}
          <Rect
            x={67} y={3} width={20} height={BAT_H - 6} rx={2}
            fill="rgba(178,122,42,0.94)"
            stroke="rgba(0,0,0,0.2)" strokeWidth={0.5}
          />
          {/* Handle */}
          <Rect
            x={83} y={BAT_H / 2 - 3} width={24} height={6} rx={2}
            fill="rgba(145,92,32,0.92)"
          />
          {/* Knob */}
          <Circle cx={BAT_W - 5} cy={BAT_H / 2} r={5} fill="rgba(110,68,22,0.95)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    position: 'absolute',
    left: 0,
    width: IMG_W,
    height: IMG_H,
  },
  bat: {
    position: 'absolute',
    width: BAT_W,
    height: BAT_H,
  },
});
