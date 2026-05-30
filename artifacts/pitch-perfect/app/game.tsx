import React, { useEffect, useRef, useState } from 'react';
import {
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
  isPerfectAccuracy,
  isPerfectPower,
} from '@/utils/gameLogic';
import { usePitcher } from '@/context/PitcherContext';
import { StadiumBackground } from '@/components/StadiumBackground';
import { StrikeZone } from '@/components/StrikeZone';
import { PowerMeter } from '@/components/PowerMeter';
import { AccuracyMeter } from '@/components/AccuracyMeter';
import { PitchTypeSelector } from '@/components/PitchTypeSelector';
import { GameHUD } from '@/components/GameHUD';
import { PitchResultOverlay } from '@/components/PitchResultOverlay';
import { SequenceBonus } from '@/components/SequenceBonus';

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { profile, recordGameResult } = usePitcher();

  const [phase, setPhase] = useState<GamePhase>('selecting');
  const [inning, setInning] = useState(1);
  const [outs, setOuts] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [balls, setBalls] = useState(0);
  const [score, setScore] = useState(0);
  const [pitchHistory, setPitchHistory] = useState<PitchRecord[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneId | null>(null);
  const [selectedPitch, setSelectedPitch] = useState<PitchType | null>(null);
  const [powerLevel, setPowerLevel] = useState(0);
  const [accuracyPos, setAccuracyPos] = useState(0.5);
  const [lastResult, setLastResult] = useState<PitchResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showInningBreak, setShowInningBreak] = useState(false);
  const [justFinishedInning, setJustFinishedInning] = useState(1);

  // Refs for stale-closure-safe callback access
  const phaseRef = useRef<GamePhase>('selecting');
  const selectedZoneRef = useRef<ZoneId | null>(null);
  const selectedPitchRef = useRef<PitchType | null>(null);
  const strikesRef = useRef(0);
  const ballsRef = useRef(0);
  const outsRef = useRef(0);
  const inningRef = useRef(1);
  const scoreRef = useRef(0);
  const pitchHistoryRef = useRef<PitchRecord[]>([]);
  const powerStartTimeRef = useRef(0);
  const accuracyStartTimeRef = useRef(0);
  const powerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accuracyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedPowerRef = useRef(0);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inningBreakTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const powerFillDuration = 1500 + profile.stats.stamina * 200;
  const accuracyCycleDuration = 600 + profile.stats.accuracy * 100;
  const canPitch = !!selectedZone && !!selectedPitch && phase === 'selecting';
  const { multiplier: seqMult, label: seqLabel } = calculateSequenceMultiplier(pitchHistory);
  const topOffset = (Platform.OS === 'web' ? 67 : insets.top) + 90;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => () => {
    if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);
    if (accuracyIntervalRef.current) clearInterval(accuracyIntervalRef.current);
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    if (inningBreakTimeoutRef.current) clearTimeout(inningBreakTimeoutRef.current);
  }, []);

  // ---- GAME FUNCTIONS ----

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
    resolvePitch(lockedPowerRef.current, accuracyScore);
  }

  function resolvePitch(powerScore: number, accuracyScore: number) {
    const zone = selectedZoneRef.current!;
    const pitchType = selectedPitchRef.current!;
    const currentStrikes = strikesRef.current;
    const currentBalls = ballsRef.current;

    const outcome = calculatePitchOutcome(
      pitchType, zone, powerScore, accuracyScore,
      profile.stats, currentStrikes, currentBalls,
    );

    let newStrikes = currentStrikes;
    let newBalls = currentBalls;
    if (outcome === 'strike_called' || outcome === 'strike_swinging') {
      newStrikes++;
    } else if (outcome === 'foul') {
      if (newStrikes < 2) newStrikes++;
    } else if (outcome === 'ball') {
      newBalls++;
    }

    const isKO = newStrikes >= 3 &&
      (outcome === 'strike_called' || outcome === 'strike_swinging');
    const isKOLooking = isKO && outcome === 'strike_called';
    const isWalk = outcome === 'ball' && newBalls >= 4;

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
    let currentOuts = outsRef.current;
    let batterRetired = false;
    let isOut = false;

    if (newStrikes >= 3) {
      currentOuts++;
      isOut = true;
      batterRetired = true;
    } else if (newBalls >= 4) {
      batterRetired = true;
    } else if (outcome === 'hit') {
      batterRetired = true;
    }

    if (batterRetired) {
      strikesRef.current = 0; setStrikes(0);
      ballsRef.current = 0; setBalls(0);
      if (isOut) { outsRef.current = currentOuts; setOuts(currentOuts); }

      if (currentOuts >= 3 && isOut) {
        if (inningRef.current >= 3) {
          recordGameResult(finalScore);
          router.replace({ pathname: '/results', params: { score: String(finalScore) } });
          return;
        } else {
          setJustFinishedInning(inningRef.current);
          const nextInn = inningRef.current + 1;
          inningRef.current = nextInn; setInning(nextInn);
          outsRef.current = 0; setOuts(0);
          setShowInningBreak(true);
          inningBreakTimeoutRef.current = setTimeout(() => {
            setShowInningBreak(false);
            resetPitch();
          }, 2800);
          return;
        }
      }
    } else {
      strikesRef.current = newStrikes; setStrikes(newStrikes);
      ballsRef.current = newBalls; setBalls(newBalls);
    }
    resetPitch();
  }

  function resetPitch() {
    selectedZoneRef.current = null; setSelectedZone(null);
    selectedPitchRef.current = null; setSelectedPitch(null);
    setPowerLevel(0);
    setAccuracyPos(0.5);
    phaseRef.current = 'selecting';
    setPhase('selecting');
  }

  // PanResponder with ref-forwarding to prevent stale closures
  const _startPowerRef = useRef<() => void>(() => {});
  const _stopPowerRef = useRef<() => void>(() => {});
  _startPowerRef.current = startPower;
  _stopPowerRef.current = stopPower;

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

  // ---- RENDER ----

  return (
    <View style={styles.root}>
      <StadiumBackground />

      <GameHUD
        score={score}
        inning={inning}
        outs={outs}
        strikes={strikes}
        balls={balls}
        sequenceMultiplier={seqMult}
      />

      <View style={[styles.content, { paddingTop: topOffset, paddingBottom: bottomPad + 12 }]}>
        <SequenceBonus multiplier={seqMult} label={seqLabel} />

        <StrikeZone
          selectedZone={selectedZone}
          onSelectZone={zone => {
            if (phase !== 'selecting') return;
            selectedZoneRef.current = zone;
            setSelectedZone(zone);
            Haptics.selectionAsync();
          }}
          disabled={phase !== 'selecting'}
        />

        <PitchTypeSelector
          arsenal={profile.unlockedPitches}
          selectedPitch={selectedPitch}
          onSelectPitch={pitch => {
            if (phase !== 'selecting') return;
            selectedPitchRef.current = pitch;
            setSelectedPitch(pitch);
            Haptics.selectionAsync();
          }}
          disabled={phase !== 'selecting'}
        />

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
                      ? '☝️  Tap a zone in the strike zone above'
                      : '👇  Now choose your pitch type'}
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
              <Text style={styles.resultWaitText}>Getting ready…</Text>
            </View>
          )}
        </View>
      </View>

      {lastResult && (
        <PitchResultOverlay result={lastResult} visible={showResult} />
      )}

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
  content: { flex: 1, gap: 10, justifyContent: 'space-between' },
  controlArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    minHeight: 110,
  },
  pitchZone: { borderRadius: 20, overflow: 'hidden', minHeight: 80 },
  pitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    gap: 10,
    borderRadius: 20,
  },
  pitchBtnText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
  promptBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
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
  meterBox: { backgroundColor: 'rgba(11,30,61,0.85)', borderRadius: 20, padding: 20 },
  accuracyZone: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(11,30,61,0.85)',
    borderRadius: 20,
    padding: 20,
    minHeight: 110,
  },
  resultWait: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  resultWaitText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '600' },
  inningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,30,61,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 80,
    gap: 12,
  },
  inningTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: 1.5 },
  inningNext: { color: 'rgba(255,255,255,0.55)', fontSize: 16, fontWeight: '600' },
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
