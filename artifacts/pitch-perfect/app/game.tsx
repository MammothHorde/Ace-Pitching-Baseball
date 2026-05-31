import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  GamePhase,
  PitchOutcome,
  PitchRecord,
  PitchResult,
  PitchType,
  ZoneId,
} from '@/constants/GameTypes';
import {
  calculatePitchOutcome,
  calculatePoints,
  calculateSequenceMultiplier,
  evaluateStrategyReward,
  getCountSituation,
  isPerfectAccuracy,
  isPerfectPower,
  readStrategy,
} from '@/utils/gameLogic';
import { usePitcher } from '@/context/PitcherContext';
import { StadiumBackground } from '@/components/StadiumBackground';
import { BatterScene } from '@/components/BatterScene';
import { BallFlight } from '@/components/BallFlight';
import { StrikeZone } from '@/components/StrikeZone';
import { PowerMeter } from '@/components/PowerMeter';
import { AccuracyMeter } from '@/components/AccuracyMeter';
import { PitchTypeSelector } from '@/components/PitchTypeSelector';
import { GameHUD } from '@/components/GameHUD';
import { PitchResultOverlay } from '@/components/PitchResultOverlay';
import { SequenceBonus } from '@/components/SequenceBonus';
import { CountBanner } from '@/components/CountBanner';

// ─── Layout constants ────────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SCENE_H = Math.min(SCREEN_H * 0.52, 440);
const ZONE_CELL_W = 56;
const ZONE_CELL_H = 30;
const ZONE_W = ZONE_CELL_W * 3;
const ZONE_LEFT = (SCREEN_W - ZONE_W) / 2;
// HUD card ends at ~149px (web) / ~120px (native) — push zone into visible area
const HUD_APPROX = Platform.OS === 'web' ? 149 : 120;
const VISIBLE_H = SCENE_H - HUD_APPROX;
const ZONE_GRID_H = ZONE_CELL_H * 5;              // full 5-row grid height
// Place at catcher-glove level, but clamp so the taller grid never clips off
// the bottom of the (overflow:hidden) scene on short viewports.
const ZONE_TOP = Math.max(
  HUD_APPROX + 4,
  Math.min(HUD_APPROX + VISIBLE_H * 0.30, SCENE_H - ZONE_GRID_H - 8),
);
const BALL_FROM_X = SCREEN_W / 2;
const BALL_FROM_Y = SCENE_H * 0.96;

// 3-wide × 5-tall grid, numbered row-major 1…15.
const ZONE_COL: Record<ZoneId, number> = {
  1:0, 2:1, 3:2, 4:0, 5:1, 6:2, 7:0, 8:1, 9:2, 10:0, 11:1, 12:2, 13:0, 14:1, 15:2,
};
const ZONE_ROW: Record<ZoneId, number> = {
  1:0, 2:0, 3:0, 4:1, 5:1, 6:1, 7:2, 8:2, 9:2, 10:3, 11:3, 12:3, 13:4, 14:4, 15:4,
};

function getZoneCenter(zone: ZoneId) {
  return {
    x: ZONE_LEFT + ZONE_COL[zone] * ZONE_CELL_W + ZONE_CELL_W / 2,
    y: ZONE_TOP  + ZONE_ROW[zone] * ZONE_CELL_H + ZONE_CELL_H / 2,
  };
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { profile, recordGameResult } = usePitcher();

  const [phase, setPhase]                       = useState<GamePhase>('selecting');
  const [inning, setInning]                     = useState(1);
  const [outs, setOuts]                         = useState(0);
  const [strikes, setStrikes]                   = useState(0);
  const [balls, setBalls]                       = useState(0);
  const [score, setScore]                       = useState(0);
  const [pitchHistory, setPitchHistory]         = useState<PitchRecord[]>([]);
  const [selectedZone, setSelectedZone]         = useState<ZoneId | null>(null);
  const [selectedPitch, setSelectedPitch]       = useState<PitchType | null>(null);
  const [lastResult, setLastResult]             = useState<PitchResult | null>(null);
  const [showResult, setShowResult]             = useState(false);
  const [showInningBreak, setShowInningBreak]   = useState(false);
  const [justFinishedInning, setJustFinished]   = useState(1);
  const [showBallFlight, setShowBallFlight]     = useState(false);
  const [ballTarget, setBallTarget]             = useState({ x: SCREEN_W / 2, y: ZONE_TOP + 60 });
  const [batterIndex, setBatterIndex]           = useState(0);
  const [powerLevel, setPowerLevel]             = useState(0);
  const [accuracyPos, setAccuracyPos]           = useState(0.5);

  // Stale-closure-safe refs
  const phaseRef           = useRef<GamePhase>('selecting');
  const selectedZoneRef    = useRef<ZoneId | null>(null);
  const selectedPitchRef   = useRef<PitchType | null>(null);
  const strikesRef         = useRef(0);
  const ballsRef           = useRef(0);
  const outsRef            = useRef(0);
  const inningRef          = useRef(1);
  const scoreRef           = useRef(0);
  const pitchHistoryRef    = useRef<PitchRecord[]>([]);
  const resultTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ballFlightRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inningBreakRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerStartTimeRef    = useRef(0);
  const accuracyStartTimeRef = useRef(0);
  const powerIntervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const accuracyIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedPowerRef       = useRef(0);
  const _startPowerRef       = useRef<() => void>(() => {});
  const _stopPowerRef        = useRef<() => void>(() => {});

  const pitchPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        phaseRef.current === 'selecting' &&
        !!selectedZoneRef.current &&
        !!selectedPitchRef.current,
      onPanResponderGrant: () => _startPowerRef.current(),
      onPanResponderRelease: () => _stopPowerRef.current(),
      onPanResponderTerminate: () => _stopPowerRef.current(),
    }),
  ).current;

  const canPitch = !!selectedZone && !!selectedPitch && phase === 'selecting';
  const { multiplier: seqMult, label: seqLabel } = calculateSequenceMultiplier(pitchHistory);
  const topOffset = (Platform.OS === 'web' ? 67 : insets.top) + 82;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const powerFillDuration    = 1500 + profile.stats.stamina * 200;
  const accuracyCycleDuration = 600 + profile.stats.accuracy * 100;

  useEffect(() => () => {
    if (resultTimeoutRef.current)   clearTimeout(resultTimeoutRef.current);
    if (ballFlightRef.current)      clearTimeout(ballFlightRef.current);
    if (inningBreakRef.current)     clearTimeout(inningBreakRef.current);
    if (powerIntervalRef.current)   clearInterval(powerIntervalRef.current);
    if (accuracyIntervalRef.current) clearInterval(accuracyIntervalRef.current);
  }, []);

  // ─── Pitch flow ──────────────────────────────────────────────────────────

  function startPower() {
    if (
      phaseRef.current !== 'selecting' ||
      !selectedZoneRef.current ||
      !selectedPitchRef.current
    ) return;

    phaseRef.current = 'power';
    setPhase('power');
    setPowerLevel(0);
    powerStartTimeRef.current = Date.now();
    const duration = powerFillDuration;

    powerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - powerStartTimeRef.current;
      const p = Math.min(elapsed / duration, 1);
      setPowerLevel(p);
      if (p >= 1) {
        if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);
        powerIntervalRef.current = null;
        _stopPowerRef.current();
      }
    }, 16);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function stopPower() {
    if (phaseRef.current !== 'power') return;
    if (powerIntervalRef.current) {
      clearInterval(powerIntervalRef.current);
      powerIntervalRef.current = null;
    }
    const elapsed = Date.now() - powerStartTimeRef.current;
    const power = Math.min(elapsed / powerFillDuration, 1);
    lockedPowerRef.current = power;
    setPowerLevel(power);
    startAccuracy();
  }

  function startAccuracy() {
    phaseRef.current = 'accuracy';
    setPhase('accuracy');
    accuracyStartTimeRef.current = Date.now();
    const cycle = accuracyCycleDuration;

    accuracyIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - accuracyStartTimeRef.current;
      const t = (elapsed % cycle) / cycle;
      setAccuracyPos((Math.sin(t * Math.PI * 2) + 1) / 2);
    }, 16);
  }

  function lockAccuracy() {
    if (phaseRef.current !== 'accuracy') return;
    // Block re-entry immediately — taps during the ball-flight window must not
    // queue additional resolvePitch calls.
    phaseRef.current = 'result';
    if (accuracyIntervalRef.current) {
      clearInterval(accuracyIntervalRef.current);
      accuracyIntervalRef.current = null;
    }
    const cycle = accuracyCycleDuration;
    const elapsed = Date.now() - accuracyStartTimeRef.current;
    const t = (elapsed % cycle) / cycle;
    const pos = (Math.sin(t * Math.PI * 2) + 1) / 2;
    const accuracyScore = 1 - Math.abs(pos - 0.5) * 2;
    setAccuracyPos(pos);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const power = lockedPowerRef.current;
    const zone = selectedZoneRef.current!;
    const target = getZoneCenter(zone);
    setBallTarget(target);
    setShowBallFlight(true);
    if (ballFlightRef.current) clearTimeout(ballFlightRef.current);
    ballFlightRef.current = setTimeout(() => {
      setShowBallFlight(false);
      resolvePitch(power, accuracyScore);
    }, 420);
  }

  function resolvePitch(powerScore: number, accuracyScore: number) {
    const zone      = selectedZoneRef.current!;
    const pitchType = selectedPitchRef.current!;
    const curStr    = strikesRef.current;
    const curBalls  = ballsRef.current;

    const history = pitchHistoryRef.current;
    const outcome = calculatePitchOutcome(
      pitchType, zone, powerScore, accuracyScore,
      profile.stats, curStr, curBalls, history,
    );

    let newStrikes = curStr;
    let newBalls   = curBalls;
    if (outcome === 'strike_called' || outcome === 'strike_swinging') newStrikes++;
    else if (outcome === 'foul') { if (newStrikes < 2) newStrikes++; }
    else if (outcome === 'ball') newBalls++;

    const isKO        = newStrikes >= 3 && (outcome === 'strike_called' || outcome === 'strike_swinging');
    const isKOLooking = isKO && outcome === 'strike_called';
    const isWalk      = outcome === 'ball' && newBalls >= 4;

    const strat = readStrategy(pitchType, zone, curBalls, curStr, history);
    const { bonus: stratBonus, labels: stratLabels, isPayoffWin } =
      evaluateStrategyReward(strat, outcome, isKO);

    const { multiplier, label: seq } = calculateSequenceMultiplier(history);
    const { base, bonus, total } = calculatePoints(
      outcome, powerScore, accuracyScore, isKO, isKOLooking, isWalk, multiplier, stratBonus,
    );

    const newScore = scoreRef.current + total;
    scoreRef.current = newScore;
    setScore(newScore);

    const record: PitchRecord = {
      type: pitchType, zone, powerScore, accuracyScore,
      outcome, points: total, bonusMultiplier: multiplier,
    };
    pitchHistoryRef.current = [...pitchHistoryRef.current, record];
    setPitchHistory([...pitchHistoryRef.current]);

    const result: PitchResult = {
      outcome, powerScore, accuracyScore,
      basePoints: base, bonusPoints: bonus,
      multiplier, totalPoints: total,
      isPerfectPower: isPerfectPower(powerScore),
      isPerfectAccuracy: isPerfectAccuracy(accuracyScore),
      isKO, isKOLooking,
      sequenceLabel: seq,
      strategyLabels: stratLabels,
      isPayoffPitch: isPayoffWin,
    };

    phaseRef.current = 'result';
    setPhase('result');
    setLastResult(result);
    setShowResult(true);

    if (isKO) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    resultTimeoutRef.current = setTimeout(() => {
      setShowResult(false);
      setTimeout(() => advanceGameState(outcome, newStrikes, newBalls, newScore), 350);
    }, 1900);
  }

  function advanceGameState(
    outcome: PitchOutcome,
    newStrikes: number,
    newBalls: number,
    finalScore: number,
  ) {
    let currentOuts  = outsRef.current;
    let batterRetired = false;
    let isOut = false;

    if (newStrikes >= 3)                { currentOuts++; isOut = true; batterRetired = true; }
    else if (newBalls >= 4)             { batterRetired = true; }
    else if (outcome === 'hit')         { batterRetired = true; }

    if (batterRetired) {
      strikesRef.current = 0; setStrikes(0);
      ballsRef.current   = 0; setBalls(0);
      if (isOut) { outsRef.current = currentOuts; setOuts(currentOuts); }

      if (currentOuts >= 3 && isOut) {
        if (inningRef.current >= 3) {
          recordGameResult(finalScore);
          router.replace({ pathname: '/results', params: { score: String(finalScore) } });
          return;
        } else {
          setJustFinished(inningRef.current);
          const nextInn = inningRef.current + 1;
          inningRef.current = nextInn; setInning(nextInn);
          outsRef.current = 0; setOuts(0);
          setShowInningBreak(true);
          inningBreakRef.current = setTimeout(() => {
            setShowInningBreak(false);
            resetPitch();
          }, 2800);
          return;
        }
      }
    } else {
      strikesRef.current = newStrikes; setStrikes(newStrikes);
      ballsRef.current   = newBalls;   setBalls(newBalls);
    }
    resetPitch();
  }

  function resetPitch() {
    selectedZoneRef.current  = null; setSelectedZone(null);
    selectedPitchRef.current = null; setSelectedPitch(null);
    phaseRef.current         = 'selecting';
    setPhase('selecting');
    setBatterIndex(Math.floor(Math.random() * 3));
  }

  // PanResponder with ref-forwarding to prevent stale closures
  _startPowerRef.current = startPower;
  _stopPowerRef.current  = stopPower;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StadiumBackground />

      {/* ── SCENE (upper portion) ─────────────────────────── */}
      <View style={[styles.sceneArea, { height: SCENE_H }]}>
        <BatterScene batterIndex={batterIndex} visibleTop={topOffset} />

        {/* Sequence combo badge */}
        <View style={[styles.seqWrap, { top: topOffset + 4 }]}>
          <SequenceBonus multiplier={seqMult} label={seqLabel} />
        </View>

        {/* Strike zone overlay — dims when not in selecting phase */}
        <View style={[
          styles.zoneOverlay,
          {
            top: ZONE_TOP,
            left: ZONE_LEFT,
            width: ZONE_W,
            opacity: phase === 'result' ? 0.35 : 1,
          },
        ]}>
          <StrikeZone
            compact
            selectedZone={selectedZone}
            onSelectZone={zone => {
              if (phase !== 'selecting') return;
              selectedZoneRef.current = zone;
              setSelectedZone(zone);
              Haptics.selectionAsync();
            }}
            disabled={phase !== 'selecting'}
          />
        </View>

        {/* Ball flight animation */}
        <BallFlight
          visible={showBallFlight}
          fromX={BALL_FROM_X}
          fromY={BALL_FROM_Y}
          toX={ballTarget.x}
          toY={ballTarget.y}
        />
      </View>

      {/* ── HUD (top absolute, above scene) ──────────────── */}
      <GameHUD
        score={score}
        inning={inning}
        outs={outs}
        strikes={strikes}
        balls={balls}
        sequenceMultiplier={seqMult}
      />

      {/* ── BOTTOM PANEL ─────────────────────────────────── */}
      <View style={[styles.bottomPanel, { paddingBottom: bottomPad + 8 }]}>
        {/* Count-situation banner — coaches the strategy for the current count */}
        {phase === 'selecting' && (
          <CountBanner situation={getCountSituation(balls, strikes)} />
        )}

        {/* Pitch type selector — shown while selecting */}
        {(phase === 'selecting') && (
          <PitchTypeSelector
            arsenal={profile.unlockedPitches}
            selectedPitch={selectedPitch}
            onSelectPitch={pitch => {
              if (phase !== 'selecting') return;
              selectedPitchRef.current = pitch;
              setSelectedPitch(pitch);
              Haptics.selectionAsync();
            }}
            disabled={false}
          />
        )}

        {/* Control area */}
        <View style={styles.controlArea}>

          {(phase === 'selecting' || phase === 'power') && (
            <View {...pitchPanResponder.panHandlers} style={styles.pitchZone}>
              {phase === 'selecting' && canPitch && (
                <LinearGradient
                  colors={['#FF6B6B', '#FF4757']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pitchBtn}
                >
                  <MaterialCommunityIcons name="baseball" size={26} color="#fff" />
                  <Text style={styles.pitchBtnText}>HOLD TO PITCH</Text>
                </LinearGradient>
              )}
              {phase === 'selecting' && !canPitch && (
                <View style={styles.promptBox}>
                  <Text style={styles.promptText}>
                    {!selectedZone
                      ? '☝️  Tap a zone in the field above'
                      : '👇  Select your pitch type'}
                  </Text>
                </View>
              )}
              {phase === 'power' && (
                <View style={styles.meterBox}>
                  <PowerMeter level={powerLevel} />
                </View>
              )}
            </View>
          )}

          {phase === 'accuracy' && (
            <TouchableOpacity
              style={styles.accuracyZone}
              onPress={lockAccuracy}
              activeOpacity={1}
            >
              <AccuracyMeter position={accuracyPos} />
            </TouchableOpacity>
          )}

          {phase === 'result' && (
            <View style={styles.resultWait}>
              <Text style={styles.resultWaitText}>Next batter up…</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── OVERLAYS ─────────────────────────────────────── */}
      {lastResult && <PitchResultOverlay result={lastResult} visible={showResult} />}


      {showInningBreak && (
        <View style={styles.inningOverlay}>
          <Text style={styles.inningTitle}>END OF INNING {justFinishedInning}</Text>
          <Text style={styles.inningNext}>Inning {inning} coming up…</Text>
          <View style={styles.scorePill}>
            <Text style={styles.scorePillLabel}>SCORE</Text>
            <Text style={styles.scorePillVal}>{score.toLocaleString()}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1E3D' },

  // Scene layer
  sceneArea: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    overflow: 'hidden',
  },
  zoneOverlay:  { position: 'absolute' },
  seqWrap: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 5,
  },

  // Bottom panel
  bottomPanel: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    top: SCENE_H,
    paddingTop: 8,
    paddingHorizontal: 14,
    gap: 8,
    justifyContent: 'space-between',
  },
  controlArea: {
    flex: 1,
    justifyContent: 'center',
  },
  pitchZone: { borderRadius: 20, overflow: 'hidden', minHeight: 80 },
  meterBox: { backgroundColor: 'rgba(11,30,61,0.85)', borderRadius: 20, padding: 20 },
  accuracyZone: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(11,30,61,0.85)',
    borderRadius: 20,
    padding: 20,
    minHeight: 110,
  },
  pitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
    borderRadius: 20,
  },
  pitchBtnText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  promptBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  promptText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultWait: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  resultWaitText: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: 13,
    fontWeight: '600',
  },

  // Inning break overlay
  inningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,30,61,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 80,
    gap: 12,
  },
  inningTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: 1.5 },
  inningNext:  { color: 'rgba(255,255,255,0.55)', fontSize: 16, fontWeight: '600' },
  scorePill: {
    backgroundColor: 'rgba(255,204,0,0.15)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.3)',
    marginTop: 8,
  },
  scorePillLabel: {
    color: 'rgba(255,204,0,0.7)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scorePillVal: { color: '#FFCC00', fontSize: 32, fontWeight: '900' },
});
