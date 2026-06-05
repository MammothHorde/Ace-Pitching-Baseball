import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');
const SCENE_H = Math.min(SH * 0.52, 440);

// Jersey palettes keyed by batterIndex — keeps a little variety between batters.
const TEAMS = [
  { jersey: '#C8202F', dark: '#8E1620', helmet: '#C8202F' }, // red
  { jersey: '#1A2F6B', dark: '#11204D', helmet: '#1A2F6B' }, // blue
  { jersey: '#1F6B3A', dark: '#155029', helmet: '#1F6B3A' }, // green
];

export interface FieldSceneHandle {
  /** Batter takes a cut at the pitch. */
  swing: () => void;
  /** Catcher's mitt pops as the ball is received. */
  catchBall: () => void;
  /** Umpire makes a call once the pitch is decided. */
  umpireCall: (call: 'strike' | 'ball' | 'out') => void;
}

interface Props {
  batterIndex?: number;
}

// ─── Batter (left side, side-on, facing the plate) ──────────────────────────
function Batter({ swingV, team }: { swingV: Animated.Value; team: typeof TEAMS[number] }) {
  // Arms + bat rotate around the lead shoulder. Drawn pointing straight up;
  // rest sits cocked back, the swing carries it down and through toward the plate.
  const rotate = swingV.interpolate({ inputRange: [0, 1], outputRange: ['-22deg', '124deg'] });
  const lean = swingV.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '7deg'] });

  return (
    <View style={{ width: 92, height: 150 }}>
      <Svg width={92} height={150} viewBox="0 0 92 150">
        {/* Back leg */}
        <Path d="M44 86 L40 118 L34 138 L44 140 L50 120 L52 92 Z" fill="#F2F2F2" />
        <Path d="M30 137 L46 137 L46 144 L28 144 Z" fill="#1B2433" />
        {/* Front leg */}
        <Path d="M52 88 L60 118 L70 136 L60 140 L52 120 L48 92 Z" fill="#FFFFFF" />
        <Path d="M58 136 L74 136 L76 143 L56 143 Z" fill="#1B2433" />
        {/* Pelvis */}
        <Path d="M40 78 L56 78 L58 94 L38 94 Z" fill="#FFFFFF" />
      </Svg>

      {/* Torso + head — leans slightly into the cut */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 48 - 60,
          top: 78 - 120,
          width: 120,
          height: 120,
          transform: [{ rotate: lean }],
        }}
      >
        <Svg width={120} height={120} viewBox="0 0 120 120">
          {/* shoulder pivot maps to (60,98) here */}
          <Path d="M49 62 L71 62 L72 98 L48 98 Z" fill={team.jersey} />
          <Path d="M49 62 L71 62 L71 76 L49 76 Z" fill={team.dark} opacity={0.3} />
          <Rect x="56" y="52" width="7" height="9" fill="#E8B58C" />
          <Circle cx="60" cy="45" r="10" fill="#E8B58C" />
          <Path d="M49 43 A11 11 0 0 1 71 43 L71 46 L49 46 Z" fill={team.helmet} />
          <Path d="M69 42 L78 44 L78 48 L69 46 Z" fill={team.helmet} />
        </Svg>
      </Animated.View>

      {/* Arms + bat — pivot at lead shoulder (48,48) */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 48 - 80,
          top: 48 - 80,
          width: 160,
          height: 160,
          transform: [{ rotate }],
        }}
      >
        <Svg width={160} height={160} viewBox="0 0 160 160">
          {/* shoulder pivot = (80,80); arm + bat point up */}
          <Path d="M74 80 L86 80 L85 58 L75 58 Z" fill={team.jersey} />
          <Path d="M75 58 L85 58 L84 36 L76 36 Z" fill="#E8B58C" />
          <Circle cx="80" cy="34" r="6" fill="#3A2A1A" />
          <Path d="M77 36 L83 36 L88 -26 L72 -26 Z" fill="#C68A3E" />
          <Ellipse cx="80" cy="-26" rx="8" ry="4" fill="#A9722C" />
          <Rect x="74" y="34" width="12" height="6" rx="2" fill="#A9722C" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Catcher (centre, crouched, back to camera) ─────────────────────────────
function Catcher({ mittV }: { mittV: Animated.Value }) {
  const mittY = mittV.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const mittScale = mittV.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });

  return (
    <View style={{ width: 104, height: 104 }}>
      <Svg width={104} height={104} viewBox="0 0 104 104">
        {/* Shins / feet spread in the crouch */}
        <Path d="M22 78 L14 98 L30 98 L34 80 Z" fill="#243A6B" />
        <Path d="M82 78 L90 98 L70 98 L70 80 Z" fill="#243A6B" />
        <Ellipse cx="20" cy="99" rx="11" ry="4" fill="#11204D" />
        <Ellipse cx="84" cy="99" rx="11" ry="4" fill="#11204D" />
        {/* Seat / pelvis low in the crouch */}
        <Path d="M30 64 L74 64 L78 84 L26 84 Z" fill="#2E4A86" />
        {/* Back (chest protector seen from behind) */}
        <Path d="M30 34 Q52 24 74 34 L72 66 L32 66 Z" fill="#3258A8" />
        <Path d="M37 40 L67 40 L66 62 L38 62 Z" fill="#23427E" opacity={0.6} />
        {/* Shoulders */}
        <Circle cx="32" cy="36" r="10" fill="#3258A8" />
        <Circle cx="72" cy="36" r="10" fill="#3258A8" />
        {/* Right arm down to the ground */}
        <Path d="M74 40 L82 60 L76 64 L68 46 Z" fill="#3258A8" />
        {/* Glove arm (sleeve only — mitt animates separately) */}
        <Path d="M30 40 L18 46 L14 40 L28 34 Z" fill="#3258A8" />
        {/* Helmet (back) */}
        <Circle cx="52" cy="24" r="13" fill="#1B2C52" />
        <Path d="M40 22 L64 22 L62 32 L42 32 Z" fill="#13203D" />
      </Svg>

      {/* Mitt — pops up and out as the pitch is received */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 2,
          top: 27,
          width: 28,
          height: 28,
          transform: [{ translateY: mittY }, { scale: mittScale }],
        }}
      >
        <Svg width={28} height={28} viewBox="0 0 28 28">
          <Circle cx="13" cy="14" r="12" fill="#7A4A1E" />
          <Circle cx="13" cy="14" r="7" fill="#9A6228" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Umpire (foreground centre, crouched, back to camera) ───────────────────
function Umpire({
  punchV,
  spreadV,
}: {
  punchV: Animated.Value;
  spreadV: Animated.Value;
}) {
  const punchRot = punchV.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-112deg'] });
  const leftSpread = spreadV.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-34deg'] });
  const rightSpread = spreadV.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '34deg'] });

  return (
    <View style={{ width: 132, height: 150 }}>
      <Svg width={132} height={150} viewBox="0 0 132 150">
        {/* Legs / shoes spread wide in the crouch */}
        <Path d="M40 96 L28 138 L46 138 L54 100 Z" fill="#5B6470" />
        <Path d="M92 96 L104 138 L86 138 L78 100 Z" fill="#5B6470" />
        <Path d="M24 136 L50 136 L50 146 L22 146 Z" fill="#15181F" />
        <Path d="M82 136 L108 136 L110 146 L80 146 Z" fill="#15181F" />
        {/* Hips */}
        <Path d="M40 86 L92 86 L96 108 L36 108 Z" fill="#5B6470" />
        {/* Torso (dark umpire shirt, back) */}
        <Path d="M38 46 Q66 36 94 46 L92 90 L40 90 Z" fill="#222A3B" />
        <Path d="M52 50 L80 50 L78 86 L54 86 Z" fill="#1A2030" opacity={0.6} />
        {/* Shoulders */}
        <Circle cx="40" cy="48" r="12" fill="#222A3B" />
        <Circle cx="92" cy="48" r="12" fill="#222A3B" />
        {/* Head + cap */}
        <Circle cx="66" cy="32" r="15" fill="#222A3B" />
        <Path d="M51 30 A15 15 0 0 1 81 30 L81 32 L51 32 Z" fill="#161B28" />
      </Svg>

      {/* Left arm — pivot at left shoulder (40,50) */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 40 - 50,
          top: 50 - 50,
          width: 100,
          height: 100,
          transform: [{ rotate: leftSpread }],
        }}
      >
        <Svg width={100} height={100} viewBox="0 0 100 100">
          {/* pivot = (50,50), arm hangs down-left */}
          <Path d="M44 50 L56 50 L50 80 L38 80 Z" fill="#222A3B" />
          <Circle cx="44" cy="82" r="7" fill="#E8B58C" />
        </Svg>
      </Animated.View>

      {/* Right arm — punches up for strike/out, spreads out on a ball */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 92 - 50,
          top: 50 - 50,
          width: 100,
          height: 100,
          transform: [{ rotate: punchRot }, { rotate: rightSpread }],
        }}
      >
        <Svg width={100} height={100} viewBox="0 0 100 100">
          {/* pivot = (50,50), arm hangs down-right */}
          <Path d="M44 50 L56 50 L62 80 L50 80 Z" fill="#222A3B" />
          <Circle cx="56" cy="82" r="7" fill="#E8B58C" />
        </Svg>
      </Animated.View>
    </View>
  );
}

export const FieldScene = forwardRef<FieldSceneHandle, Props>(
  ({ batterIndex = 0 }, ref) => {
    const team = TEAMS[batterIndex % TEAMS.length];

    const swingV = useRef(new Animated.Value(0)).current;
    const mittV = useRef(new Animated.Value(0)).current;
    const punchV = useRef(new Animated.Value(0)).current;
    const spreadV = useRef(new Animated.Value(0)).current;

    useImperativeHandle(ref, () => ({
      swing() {
        swingV.stopAnimation();
        Animated.sequence([
          Animated.timing(swingV, {
            toValue: 1,
            duration: 165,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(swingV, {
            toValue: 0,
            duration: 430,
            delay: 110,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ]).start();
      },
      catchBall() {
        mittV.stopAnimation();
        Animated.sequence([
          Animated.timing(mittV, {
            toValue: 1,
            duration: 90,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(mittV, {
            toValue: 0,
            duration: 280,
            delay: 80,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }),
        ]).start();
      },
      umpireCall(call) {
        const v = call === 'ball' ? spreadV : punchV;
        const peak = call === 'out' ? 1 : call === 'strike' ? 0.85 : 1;
        v.stopAnimation();
        Animated.sequence([
          Animated.timing(v, {
            toValue: peak,
            duration: 140,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: false,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 420,
            delay: call === 'out' ? 280 : 170,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }),
        ]).start();
      },
    }));

    // Field positions, derived once from screen size.
    const layout = useMemo(() => {
      const cx = SW / 2;
      return {
        batter: { left: cx - 152, top: SCENE_H - 170 },
        catcher: { left: cx - 52, top: SCENE_H * 0.40 },
        umpire: { left: cx - 66, top: SCENE_H - 150 },
      };
    }, []);

    return (
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        {/* Field — drawn only in the lower portion so the stadium/crowd
            backdrop still shows through up top. */}
        <Svg
          width={SW}
          height={SCENE_H}
          viewBox={`0 0 ${SW} ${SCENE_H}`}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <SvgGradient id="grass" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3E8E3F" />
              <Stop offset="1" stopColor="#2F7233" />
            </SvgGradient>
          </Defs>
          {/* Outfield wall + grass */}
          <Rect x={0} y={SCENE_H * 0.34} width={SW} height={SCENE_H * 0.04} fill="#16314F" />
          <Rect x={0} y={SCENE_H * 0.38} width={SW} height={SCENE_H * 0.62} fill="url(#grass)" />
          {/* Mowed stripe */}
          <Rect x={0} y={SCENE_H * 0.5} width={SW} height={SCENE_H * 0.12} fill="#3A8639" opacity={0.4} />
          {/* Dirt home-plate circle */}
          <Ellipse cx={SW / 2} cy={SCENE_H * 0.92} rx={SW * 0.62} ry={SCENE_H * 0.34} fill="#B5763E" />
          <Ellipse cx={SW / 2} cy={SCENE_H * 0.92} rx={SW * 0.45} ry={SCENE_H * 0.24} fill="#A56A36" opacity={0.45} />
          {/* Batter's box outline */}
          <Path
            d={`M${SW / 2 - 70} ${SCENE_H * 0.72} L${SW / 2 + 70} ${SCENE_H * 0.72} L${SW / 2 + 86} ${SCENE_H * 0.99} L${SW / 2 - 86} ${SCENE_H * 0.99} Z`}
            stroke="#F4F1EA"
            strokeWidth={3}
            fill="none"
            opacity={0.8}
          />
          {/* Home plate */}
          <Path
            d={`M${SW / 2 - 14} ${SCENE_H * 0.84} L${SW / 2 + 14} ${SCENE_H * 0.84} L${SW / 2 + 14} ${SCENE_H * 0.88} L${SW / 2} ${SCENE_H * 0.91} L${SW / 2 - 14} ${SCENE_H * 0.88} Z`}
            fill="#F4F1EA"
          />
        </Svg>

        <View style={[styles.actor, layout.catcher]}>
          <Catcher mittV={mittV} />
        </View>
        <View style={[styles.actor, layout.batter]}>
          <Batter swingV={swingV} team={team} />
        </View>
        <View style={[styles.actor, layout.umpire]}>
          <Umpire punchV={punchV} spreadV={spreadV} />
        </View>
      </View>
    );
  },
);

FieldScene.displayName = 'FieldScene';

const styles = StyleSheet.create({
  actor: { position: 'absolute' },
});
