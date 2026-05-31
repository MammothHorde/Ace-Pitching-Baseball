import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
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
  isPerfectAccuracy,
  isPerfectPower,
} from '@/utils/gameLogic';
import { gestureQualityLabel } from '@/utils/gestureTemplates';
import { usePitcher } from '@/context/PitcherContext';
import { StadiumBackground } from '@/components/StadiumBackground';
import { BatterScene } from '@/components/BatterScene';
import { BallFlight } from '@/components/BallFlight';
import { StrikeZone } from '@/components/StrikeZone';
import { GestureCanvas } from '@/components/GestureCanvas';
import { PitchTypeSelector } from '@/components/PitchTypeSelector';
import { GameHUD } from '@/components/GameHUD';
import { PitchResultOverlay } from '@/components/PitchResultOverlay';
import { SequenceBonus } from '@/components/SequenceBonus';
import { GestureInputPanel } from '@/components/GestureInputPanel';
import { GestureQualityLabel } from '@/components/GestureQualityLabel';

// ─── Layout constants ────────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SCENE_H = Math.min(SCREEN_H * 0.52, 440);
const ZONE_CELL_W = 60;
const ZONE_CELL_H = 40;
const ZONE_W = ZONE_CELL_W * 3;
const ZONE_LEFT = (SCREEN_W - ZONE_W) / 2;
// HUD card ends at ~149px (web) / ~120px (native) — push zone into visible area
const HUD_APPROX = Platform.OS === 'web' ? 149 : 120;
const VISIBLE_H = SCENE_H - HUD_APPROX;
const ZONE_TOP = HUD_APPROX + VISIBLE_H * 0.30;   // catcher-glove level
const BALL_FROM_X = SCREEN_W / 2;
const BALL_FROM_Y = SCENE_H * 0.96;

const ZONE_COL: Record<ZoneId, number> = { 1:0, 2:1, 3:2, 4:0, 5:1, 6:2, 7:0, 8:1, 9:2 };
const ZONE_ROW: Record<ZoneId, number> = { 1:0, 2:0, 3:0, 4:1, 5:1, 6:1, 7:2, 8:2, 9:2 };

function getZoneCenter(zone: ZoneId) {
  return {
    x: ZONE_LEFT + ZONE_COL[zone] * ZONE_CELL_W + ZONE_CELL_W / 2,
    y: ZONE_TOP  + ZONE_ROW[zone] * ZONE_CELL_H + ZONE_CELL_H / 2,
  };
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { profile, pitchingStyle, recordGameResult } = usePitcher();

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
  const [gestureLabel, setGestureLabel]         = useState('');
  const [showGestureLabel, setShowGestureLabel] = useState(false);

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

  const canPitch = !!selectedZone && !!selectedPitch && phase === 'selecting';
  const { multiplier: seqMult, label: seqLabel } = calculateSequenceMultiplier(pitchHistory);
  const topOffset = (Platform.OS === 'web' ? 67 : insets.top) + 82;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const isTotalControl = pitchingStyle === 'total_control';

  useEffect(() => () => {
    if (resultTimeoutRef.current)   clearTimeout(resultTimeoutRef.current);
    if (ballFlightRef.current)      clearTimeout(ballFlightRef.current);
    if (inningBreakRef.current)     clearTimeout(inningBreakRef.current);
  }, []);

  // ─── Pitch flow ──────────────────────────────────────────────────────────

  function startGesture() {
    if (!selectedZoneRef.current || !selectedPitchRef.current) return;
    phaseRef.current = 'gesture';
    setPhase('gesture');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // Classic mode: GestureCanvas calls back with (power, accuracy)
  function handleCanvasComplete(power: number, accuracy: number) {
    const zone = selectedZoneRef.current!;
    const target = getZoneCenter(zone);
    setBallTarget(target);
    setShowBallFlight(true);
    ballFlightRef.current = setTimeout(() => {
      setShowBallFlight(false);
      resolvePitch(power, accuracy);
    }, 420);
  }

  // Total Control mode: GestureInputPanel calls back with gestureScore
  const handleTCGestureComplete = useCallback(
    ({ gestureScore }: { gestureScore: number; speedPxPerMs: number }) => {
      if (phaseRef.current !== 'selecting') return;

      phaseRef.current = 'gesture';
      setPhase('gesture');

      const label = gestureQualityLabel(gestureScore);
      setGestureLabel(label);
      setShowGestureLabel(true);

      // Also trigger ball flight for visual continuity
      const zone = selectedZoneRef.current!;
      if (zone) {
        const target = getZoneCenter(zone);
        setBallTarget(target);
        setShowBallFlight(true);
      }

      Haptics.impactAsync(
        gestureScore >= 0.78
          ? Haptics.ImpactFeedbackStyle.Heavy
          : gestureScore >= 0.50
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );

      setTimeout(() => {
        setShowGestureLabel(false);
        setShowBallFlight(false);
        setTimeout(() => resolvePitch(gestureScore, gestureScore), 200);
      }, 900);
    },
    [],
  );

  function resolvePitch(powerScore: number, accuracyScore: number) {
    const zone      = selectedZoneRef.current!;
    const pitchType = selectedPitchRef.current!;
    const curStr    = strikesRef.current;
    const curBalls  = ballsRef.current;

    const outcome = calculatePitchOutcome(
      pitchType, zone, powerScore, accuracyScore,
      profile.stats, curStr, curBalls,
    );

    let newStrikes = curStr;
    let newBalls   = curBalls;
    if (outcome === 'strike_called' || outcome === 'strike_swinging') newStrikes++;
    else if (outcome === 'foul') { if (newStrikes < 2) newStrikes++; }
    else if (outcome === 'ball') newBalls++;

    const isKO        = newStrikes >= 3 && (outcome === 'strike_called' || outcome === 'strike_swinging');
    const isKOLooking = isKO && outcome === 'strike_called';
    const isWalk      = outcome === 'ball' && newBalls >= 4;

    const { multiplier, label: seq } = calculateSequenceMultiplier(pitchHistoryRef.current);
    const { base, bonus, total } = calculatePoints(
      outcome, powerScore, accuracyScore, isKO, isKOLooking, isWalk, multiplier,
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

  // ─── Render ──────────────────────────────────────────────────────────────

  const showClassicControls = !isTotalControl;
  const showGestureControls = isTotalControl;

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

          {/* ── CLASSIC MODE ── */}
          {showClassicControls && phase === 'selecting' && canPitch && (
            <TouchableOpacity
              onPress={startGesture}
              activeOpacity={0.82}
            >
              <LinearGradient
                colors={['#FF6B6B', '#FF4757']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pitchBtn}
              >
                <MaterialCommunityIcons name="gesture-swipe-down" size={24} color="#fff" />
                <Text style={styles.pitchBtnText}>DRAW TO PITCH</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {showClassicControls && phase === 'selecting' && !canPitch && (
            <View style={styles.promptBox}>
              <Text style={styles.promptText}>
                {!selectedZone
                  ? '☝️  Tap a zone in the field above'
                  : '👇  Select your pitch type'}
              </Text>
            </View>
          )}

          {showClassicControls && phase === 'gesture' && selectedPitch && (
            <GestureCanvas
              pitchType={selectedPitch}
              onComplete={handleCanvasComplete}
            />
          )}

          {/* ── TOTAL CONTROL MODE ── */}
          {showGestureControls && phase === 'selecting' && (
            <>
              {canPitch ? (
                <GestureInputPanel
                  pitchType={selectedPitch!}
                  enabled={true}
                  onGestureComplete={handleTCGestureComplete}
                />
              ) : (
                <View style={styles.promptBox}>
                  <Text style={styles.promptText}>
                    {!selectedZone
                      ? '☝️  Tap a zone in the field above'
                      : '👇  Now choose your pitch type'}
                  </Text>
                </View>
              )}
            </>
          )}

          {showGestureControls && phase === 'gesture' && (
            <View style={styles.resultWait}>
              <Text style={styles.resultWaitText}>Delivering…</Text>
            </View>
          )}

          {/* ── SHARED ── */}
          {phase === 'result' && (
            <View style={styles.resultWait}>
              <Text style={styles.resultWaitText}>Next batter up…</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── OVERLAYS ─────────────────────────────────────── */}
      {lastResult && <PitchResultOverlay result={lastResult} visible={showResult} />}

      <GestureQualityLabel label={gestureLabel} visible={showGestureLabel} />

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
