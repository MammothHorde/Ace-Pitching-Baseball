import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

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
import { useAudio } from '@/context/AudioContext';
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
import { HotColdZones, getHeatMap } from '@/components/HotColdZones';

// ─── Layout constants ────────────────────────────────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SCENE_H = Math.min(SCREEN_H * 0.52, 440);
const ZONE_GRID = 9;
const BASE_CELL_W = 24;
const BASE_CELL_H = 21;
// HUD card ends at ~149px (web) / ~120px (native) — push zone into visible area
const HUD_APPROX = Platform.OS === 'web' ? 149 : 120;
const VISIBLE_H = SCENE_H - HUD_APPROX;
const BALL_FROM_X = SCREEN_W / 2;
const BALL_FROM_Y = SCENE_H * 0.96;

// 9-wide × 9-tall grid, numbered row-major 1…81.
const zoneCol = (zone: ZoneId) => (zone - 1) % ZONE_GRID;        // 0 … 8
const zoneRow = (zone: ZoneId) => Math.floor((zone - 1) / ZONE_GRID); // 0 … 8

// Difficulty 0…1 → grid geometry. Easier = bigger zone, harder = smaller zone.
// The cell size MUST match what StrikeZone renders (passed as props) so the
// ball-flight target stays aligned with the tapped cell.
function zoneGeometry(difficulty: number) {
  const scale = 1.25 - 0.47 * difficulty;          // 1.25 (easy) … 0.78 (hard)
  const cellW = Math.round(BASE_CELL_W * scale);
  const cellH = Math.round(BASE_CELL_H * scale);
  const zoneW = cellW * ZONE_GRID;
  const zoneLeft = (SCREEN_W - zoneW) / 2;
  const gridH = cellH * ZONE_GRID;
  // Clamp so the grid never clips off the bottom of the (overflow:hidden) scene:
  // cap the top so the bottom stays on-screen, then floor it at 8px.
  const topDesired = HUD_APPROX + VISIBLE_H * 0.30;
  const topMax = Math.max(8, SCENE_H - gridH - 8);
  const zoneTop = Math.max(8, Math.min(topDesired, topMax));
  return { cellW, cellH, zoneW, zoneLeft, zoneTop };
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { profile, recordGameResult, settings } = usePitcher();
  const { playSfx, playSfxIn } = useAudio();

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
  const [ballTarget, setBallTarget]             = useState({ x: SCREEN_W / 2, y: SCENE_H * 0.4 });
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
  const _lockPowerRef        = useRef<() => void>(() => {});
  const _lockAccuracyRef     = useRef<() => void>(() => {});

  // Single screen-level touch handler. Children (zone grid, pitch selector,
  // HUD buttons) claim the responder first via bubbling, so selection taps
  // still work; contact on any other area is routed here by phase.
  const screenPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        const p = phaseRef.current;
        return p === 'power' || p === 'accuracy';
      },
      onPanResponderGrant: () => {
        const p = phaseRef.current;
        if (p === 'power') _lockPowerRef.current();
        else if (p === 'accuracy') _lockAccuracyRef.current();
      },
    }),
  ).current;

  const canPitch = !!selectedZone && !!selectedPitch && phase === 'selecting';
  const { multiplier: seqMult, label: seqLabel } = calculateSequenceMultiplier(pitchHistory);
  const topOffset = (Platform.OS === 'web' ? 67 : insets.top) + 82;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const diffSpeedMult        = 1.4 - 0.85 * settings.difficulty;  // 1.4 easy … 0.55 hard
  const meterSlowdown         = 1.25;  // global 20% slower meters (period ×1.25)
  const powerCycleDuration    = (820 + profile.stats.stamina * 90) * diffSpeedMult * meterSlowdown;
  const accuracyCycleDuration = (600 + profile.stats.accuracy * 100) * diffSpeedMult * meterSlowdown;

  const { cellW, cellH, zoneW, zoneLeft, zoneTop } = useMemo(
    () => zoneGeometry(settings.difficulty),
    [settings.difficulty],
  );

  function getZoneCenter(zone: ZoneId) {
    return {
      x: zoneLeft + zoneCol(zone) * cellW + cellW / 2,
      y: zoneTop  + zoneRow(zone) * cellH + cellH / 2,
    };
  }

  useEffect(() => () => {
    if (resultTimeoutRef.current)   clearTimeout(resultTimeoutRef.current);
    if (ballFlightRef.current)      clearTimeout(ballFlightRef.current);
    if (inningBreakRef.current)     clearTimeout(inningBreakRef.current);
    if (powerIntervalRef.current)   clearInterval(powerIntervalRef.current);
    if (accuracyIntervalRef.current) clearInterval(accuracyIntervalRef.current);
  }, []);

  // Once both a zone and a pitch type are chosen, kick off the power meter
  // automatically — no extra tap needed to start it.
  useEffect(() => {
    if (phase === 'selecting' && selectedZone && selectedPitch) {
      startPower();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedZone, selectedPitch]);

  // ─── Pitch flow ──────────────────────────────────────────────────────────

  // Power is a vertical meter that bounces up and down the y-axis. The player
  // taps once to start it oscillating, then taps again to lock it — ideally
  // inside the green perfect band.
  function powerAt(elapsed: number) {
    const t = (elapsed % powerCycleDuration) / powerCycleDuration;
    // Start at the bottom (0), then rise → fall → rise…
    return (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  }

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

    if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);
    powerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - powerStartTimeRef.current;
      setPowerLevel(powerAt(elapsed));
    }, 16);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function lockPower() {
    if (phaseRef.current !== 'power') return;
    if (powerIntervalRef.current) {
      clearInterval(powerIntervalRef.current);
      powerIntervalRef.current = null;
    }
    const power = powerAt(Date.now() - powerStartTimeRef.current);
    lockedPowerRef.current = power;
    setPowerLevel(power);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startAccuracy();
  }

  function startAccuracy() {
    phaseRef.current = 'accuracy';
    setPhase('accuracy');
    accuracyStartTimeRef.current = Date.now();
    const cycle = accuracyCycleDuration;

    if (accuracyIntervalRef.current) clearInterval(accuracyIntervalRef.current);
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
    // Raw linear score drives the on-screen meter AND the perfect-range bonus,
    // so the displayed perfect zone always matches the reward. Forgiveness for
    // off-center needles is applied separately inside calculatePitchOutcome.
    const accuracyScore = 1 - Math.abs(pos - 0.5) * 2;
    setAccuracyPos(pos);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const power = lockedPowerRef.current;
    const zone = selectedZoneRef.current!;
    const target = getZoneCenter(zone);
    setBallTarget(target);
    setShowBallFlight(true);
    playSfx('throw');
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

    // Layered audio: (1) the immediate catch/contact sound, (2) the umpire's
    // call shortly after, (3) the crowd reaction last.
    const isStrike = outcome === 'strike_called' || outcome === 'strike_swinging';
    if (isStrike) playSfx('mitt');
    else if (outcome === 'ball') playSfx('mitt');
    else if (outcome === 'hit' || outcome === 'foul') playSfx('hit');

    const UMP = 280; // ms after the catch, so the call lands cleanly
    if (isKO) {
      playSfxIn('umpStrikeout', UMP);
      playSfxIn('cheer', UMP + 420);          // home crowd roars for the K
    } else if (isStrike) {
      playSfxIn(newStrikes === 1 ? 'umpStrike1' : 'umpStrike2', UMP);
      if (Math.random() < 0.4) playSfxIn('cheer', UMP + 380);
    } else if (outcome === 'ball') {
      playSfxIn('umpBall', UMP);
      if (isWalk && Math.random() < 0.7) playSfxIn('boo', UMP + 380);
    } else if (outcome === 'hit') {
      if (Math.random() < 0.6) playSfxIn('boo', 220); // batter got one off the pitcher
    }

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
      if (isOut) {
        outsRef.current = currentOuts; setOuts(currentOuts);
        setBatterIndex(currentOuts % 3);
      }

      if (currentOuts >= 3 && isOut) {
        if (inningRef.current >= 1) {
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
  }

  // PanResponder with ref-forwarding to prevent stale closures
  _lockPowerRef.current    = lockPower;
  _lockAccuracyRef.current = lockAccuracy;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.root} {...screenPanResponder.panHandlers}>
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
            top: zoneTop,
            left: zoneLeft,
            width: zoneW,
            opacity: phase === 'result' ? 0.35 : 1,
          },
        ]}>
          <StrikeZone
            compact
            cellWidth={cellW}
            cellHeight={cellH}
            selectedZone={selectedZone}
            onSelectZone={zone => {
              if (phase !== 'selecting') return;
              selectedZoneRef.current = zone;
              setSelectedZone(zone);
              Haptics.selectionAsync();
            }}
            disabled={phase !== 'selecting'}
            heatMap={getHeatMap(batterIndex)}
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

        {/* Pre-selection guidance prompt — sits directly above the pitch type selector */}
        {phase === 'selecting' && !canPitch && (
          <View style={styles.pitchZone}>
            <View style={styles.promptBox}>
              <Text style={styles.promptText}>
                {!selectedZone
                  ? '☝️  Tap a zone in the field above'
                  : '👇  Select your pitch type'}
              </Text>
            </View>
          </View>
        )}

        {/* Pitch type selector — now just below the prompt text box */}
        {phase === 'selecting' && (
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

          {/* Batter hot/cold zones — compact strip; tooltip driven by selected zone */}
          {phase === 'selecting' && (
            <HotColdZones batterIndex={batterIndex} selectedZoneId={selectedZone} />
          )}

          {(phase === 'power' || phase === 'accuracy') && (
            <View>
              <View style={styles.metersRow}>
                <View style={phase === 'power' ? undefined : styles.meterIdle}>
                  <PowerMeter level={powerLevel} active={phase === 'power'} />
                </View>
                <View style={[styles.accuracyCol, phase === 'accuracy' ? undefined : styles.meterIdle]}>
                  <AccuracyMeter position={accuracyPos} active={phase === 'accuracy'} />
                </View>
              </View>
              <Text style={styles.phaseHint}>
                {phase === 'power'
                  ? 'TAP to lock POWER — stop it in the green zone'
                  : 'TAP to lock ACCURACY — center the needle'}
              </Text>
            </View>
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
  pitchZone: { borderRadius: 20, overflow: 'hidden' },
  metersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: 'rgba(11,30,61,0.85)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  accuracyCol: { flex: 1 },
  meterIdle: { opacity: 0.4 },
  phaseHint: {
    color: '#FFCC00',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  promptBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
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
