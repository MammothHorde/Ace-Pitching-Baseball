import { PitchType, ZoneId, PitchOutcome, PitcherStats, PitchRecord, CountSituation } from '@/constants/GameTypes';
import { getZoneStat, HOT_THRESHOLD } from '@/components/HotColdZones';

export const PITCH_INFO: Record<PitchType, {
  name: string;
  shortName: string;
  color: string;
  description: string;
  speedRating: number;
  movementRating: number;
}> = {
  fastball:  { name: 'Fastball',  shortName: 'FB',  color: '#FF4757', description: 'Pure heat',      speedRating: 5, movementRating: 1 },
  curveball: { name: 'Curveball', shortName: 'CB',  color: '#5352ED', description: 'Big drop',       speedRating: 2, movementRating: 5 },
  slider:    { name: 'Slider',    shortName: 'SL',  color: '#1E90FF', description: 'Sharp break',    speedRating: 3, movementRating: 4 },
  changeup:  { name: 'Changeup',  shortName: 'CH',  color: '#2ED573', description: 'Off-speed',      speedRating: 2, movementRating: 2 },
  splitter:  { name: 'Splitter',  shortName: 'SPL', color: '#FF6348', description: 'Late dive',      speedRating: 3, movementRating: 5 },
  cutter:    { name: 'Cutter',    shortName: 'CUT', color: '#FFCC00', description: 'Cut fastball',   speedRating: 4, movementRating: 3 },
};

export const UPGRADE_COSTS: number[] = [150, 250, 400, 600, 900, 1300, 1800, 2500, 3500, 5000];

export const PITCH_UNLOCK_COSTS: Record<PitchType, number> = {
  fastball:  0,
  curveball: 0,
  slider:    500,
  changeup:  800,
  splitter:  1200,
  cutter:    1500,
};

export function getAvailablePoints(profile: { lifetimePoints: number; spentPoints: number }): number {
  return profile.lifetimePoints - profile.spentPoints;
}

// ─── MLB 13-Zone system ──────────────────────────────────────────────────────
//
// Inner 3×3 strike zone — zones 1-9 (row-major, left→right, top→bottom):
//   1  2  3   (upper tier)
//   4  5  6   (middle tier)
//   7  8  9   (lower tier)
//
// Corner shadow zones — just outside the strike zone corners:
//   11 = upper-inside   12 = upper-away
//   13 = lower-inside   14 = lower-away
//
// Strategy model:
//   • Heart (5) most hittable; painted corners (1,3,7,9) nastiest strike.
//   • Down & away (9) is the premium pitcher's spot.
//   • Corner shadows (11-14) are ball zones — force a chase or take the walk.

// Zones in the actual strike zone (taken pitch here = called strike).
export const STRIKE_ZONE  = new Set<ZoneId>([1, 2, 3, 4, 5, 6, 7, 8, 9]);

// Painted corners of the 3×3 — hardest spots to barrel.
export const CORNER_ZONES = new Set<ZoneId>([1, 3, 7, 9]);

// Dead center — most hittable.
export const HEART_ZONE: ZoneId = 5;

// Non-corner edges of the 3×3.
export const EDGE_ZONES   = new Set<ZoneId>([2, 4, 6, 8]);

// High pitches (top row of SZ + top corner shadows).
export const HIGH_ZONES   = new Set<ZoneId>([1, 2, 3, 11, 12]);

// Low pitches (bottom row of SZ + bottom corner shadows).
export const LOW_ZONES    = new Set<ZoneId>([7, 8, 9, 13, 14]);

// Down & away — the single best pitcher's spot (lower-away corner of SZ).
const DOWN_AND_AWAY: ZoneId = 9;

export function isInStrikeZone(zone: ZoneId): boolean {
  return STRIKE_ZONE.has(zone);
}

const OFFSPEED_PITCHES = new Set<PitchType>(['curveball', 'slider', 'changeup', 'splitter']);

export function isOffspeed(p: PitchType): boolean {
  return OFFSPEED_PITCHES.has(p);
}

function isStrikeOutcome(o: PitchOutcome): boolean {
  return o === 'strike_called' || o === 'strike_swinging';
}

/** Classifies the current count into a strategic situation the UI can surface. */
export function getCountSituation(balls: number, strikes: number): CountSituation {
  if (balls === 3 && strikes === 2) {
    return {
      key: 'payoff',
      label: 'PAYOFF PITCH',
      hint: 'Full count — best pitch, best spot. No room for error.',
      color: '#FF4757',
    };
  }
  if (strikes === 2) {
    return {
      key: 'pitchers_count',
      label: "PITCHER'S COUNT",
      hint: 'Ahead in the count — paint a corner and put him away.',
      color: '#2ED573',
    };
  }
  if (balls === 3 || (balls === 2 && strikes === 0)) {
    return {
      key: 'hitters_count',
      label: "HITTER'S COUNT",
      hint: "He's sitting fastball — pitch backwards to fool him.",
      color: '#FF9800',
    };
  }
  if (balls === 0 && strikes === 0) {
    return {
      key: 'first_pitch',
      label: 'FIRST PITCH',
      hint: 'Get ahead — establish the strike zone.',
      color: '#5AC8FA',
    };
  }
  return { key: 'neutral', label: '', hint: '', color: '#FFFFFF' };
}

/** True if the previous pitch tunnels into the current one (same look, diverging). */
function isTunnelPair(prev: PitchRecord, curType: PitchType, curZone: ZoneId): boolean {
  const speedChange = isOffspeed(prev.type) !== isOffspeed(curType);
  const prevHigh = HIGH_ZONES.has(prev.zone);
  const prevLow  = LOW_ZONES.has(prev.zone);
  const curHigh  = HIGH_ZONES.has(curZone);
  const curLow   = LOW_ZONES.has(curZone);
  return speedChange && ((prevHigh && curLow) || (prevLow && curHigh));
}

/** True if this pitch would be the 3rd identical pitch type in a row. */
function isPredictable(history: PitchRecord[], curType: PitchType): boolean {
  if (history.length < 2) return false;
  return history.slice(-2).every(p => p.type === curType);
}

export interface StrategyEval {
  situation: CountSituation;
  backwards: boolean;
  tunnel: boolean;
  predictable: boolean;
  paintedCorner: boolean;
  downAndAway: boolean;
}

/** Pure read of the strategy context — no randomness. */
export function readStrategy(
  pitchType: PitchType,
  zone: ZoneId,
  balls: number,
  strikes: number,
  history: PitchRecord[],
): StrategyEval {
  const situation = getCountSituation(balls, strikes);
  const prev = history.length > 0 ? history[history.length - 1] : null;
  return {
    situation,
    backwards: situation.key === 'hitters_count' && isOffspeed(pitchType),
    tunnel: prev ? isTunnelPair(prev, pitchType, zone) : false,
    predictable: isPredictable(history, pitchType),
    paintedCorner: CORNER_ZONES.has(zone),
    downAndAway: zone === DOWN_AND_AWAY,
  };
}

export function calculatePitchOutcome(
  pitchType: PitchType,
  zone: ZoneId,
  powerScore: number,
  accuracyScore: number,
  stats: PitcherStats,
  strikes: number,
  balls: number,
  history: PitchRecord[] = [],
  batterIndex: number = 0,
): PitchOutcome {
  const acc = Math.pow(Math.max(0, accuracyScore), 0.6);

  if (acc < 0.20) return 'ball';
  if (powerScore < 0.06) return 'hit';

  const strat = readStrategy(pitchType, zone, balls, strikes, history);

  let swingProb = 0.42;
  if (strikes === 2) swingProb += 0.22;
  if (balls === 3)   swingProb -= 0.12;
  if (strikes === 0 && balls === 0) swingProb -= 0.06;
  if (balls === 3 && strikes === 2) swingProb += 0.12;
  if (strikes === 1 && balls === 0) swingProb -= 0.04;
  if (CORNER_ZONES.has(zone)) swingProb -= 0.12;
  if (zone === HEART_ZONE)    swingProb += 0.12;
  if (HIGH_ZONES.has(zone))   swingProb += 0.04;
  if (LOW_ZONES.has(zone))    swingProb -= 0.04;
  // Corner shadow zones (11-14) are off the plate — hitter takes unless 2 strikes.
  if (!STRIKE_ZONE.has(zone)) swingProb -= strikes === 2 ? 0.10 : 0.24;
  if (acc < 0.45) swingProb -= 0.10;
  if (acc > 0.80) swingProb += 0.06;
  if (strat.predictable) swingProb += 0.08;
  if (strat.backwards)   swingProb -= 0.08;

  swingProb = Math.max(0.05, Math.min(0.88, swingProb));
  const didSwing = Math.random() < swingProb;

  if (didSwing) {
    let contactProb = 0.50;
    contactProb -= Math.max(0, (0.45 - Math.abs(powerScore - 0.60))) * 0.18;
    contactProb -= acc * 0.14;
    if (pitchType === 'curveball' || pitchType === 'slider') contactProb -= 0.07 + stats.spin * 0.007;
    if (pitchType === 'splitter')  contactProb -= 0.10 + stats.spin * 0.008;
    if (pitchType === 'changeup')  contactProb -= 0.04;
    if (pitchType === 'fastball')  contactProb -= stats.speed * 0.005;
    if (pitchType === 'cutter')    contactProb -= 0.05 + stats.spin * 0.004;
    if (strikes === 2) contactProb += 0.12;
    if (strikes === 0 && balls === 0) contactProb += 0.04;
    if (zone === HEART_ZONE)      contactProb += 0.10;
    if (EDGE_ZONES.has(zone))     contactProb -= 0.04;
    if (!STRIKE_ZONE.has(zone))   contactProb -= 0.10;
    if (strat.paintedCorner)      contactProb -= 0.08;
    if (strat.downAndAway)        contactProb -= 0.04;
    if (strat.backwards) contactProb -= 0.10;
    if (strat.tunnel)    contactProb -= 0.10;
    if (strat.predictable) contactProb += 0.12;
    // Hot zone bonus: +0.10 when pitch lands in batter's hot zone
    const zoneStat = getZoneStat(batterIndex, zone);
    if (zoneStat && zoneStat.avg > HOT_THRESHOLD) contactProb += 0.10;
    contactProb = Math.max(0.04, Math.min(0.74, contactProb));

    if (Math.random() < contactProb) {
      return Math.random() < 0.32 ? 'foul' : 'hit';
    }
    return 'strike_swinging';
  } else {
    if (!STRIKE_ZONE.has(zone)) return 'ball';
    return acc > 0.45 ? 'strike_called' : 'ball';
  }
}

/** Awards flat strategy bonuses and the labels to surface. */
export function evaluateStrategyReward(
  strat: StrategyEval,
  outcome: PitchOutcome,
  isKO: boolean,
): { bonus: number; labels: string[]; isPayoffWin: boolean } {
  const labels: string[] = [];
  let bonus = 0;
  const success = isStrikeOutcome(outcome);
  const isPayoffWin = strat.situation.key === 'payoff' && success;

  if (success && strat.paintedCorner) {
    if (strat.downAndAway) { bonus += 60; labels.push('DOWN & AWAY'); }
    else                   { bonus += 40; labels.push('PAINTED THE CORNER'); }
  }
  if (success && strat.backwards) { bonus += 60; labels.push('PITCHING BACKWARDS'); }
  if (success && strat.tunnel)    { bonus += 50; labels.push('TUNNEL'); }

  if (isPayoffWin) {
    bonus += isKO ? 200 : 120;
    labels.push(isKO ? 'PAYOFF PITCH WIN!' : 'PAYOFF PITCH');
  }

  return { bonus, labels, isPayoffWin };
}

export function calculateSequenceMultiplier(history: PitchRecord[]): { multiplier: number; label: string } {
  if (history.length < 2) return { multiplier: 1.0, label: '' };

  const recent = history.slice(-5);
  const types = new Set(recent.map(p => p.type));

  // Map each zone to one of 8 location buckets for diversity counting.
  const QUAD: Partial<Record<ZoneId, string>> = {
    11: 'hi-in',  1: 'hi-in',  2: 'hi-mid',  3: 'hi-out', 12: 'hi-out',
                  4: 'md-in',  5: 'md-mid',  6: 'md-out',
    13: 'lo-in',  7: 'lo-in',  8: 'lo-mid',  9: 'lo-out', 14: 'lo-out',
  };
  const getQuadrant = (z: ZoneId) => QUAD[z] ?? 'md-mid';
  const locations = new Set(recent.map(p => getQuadrant(p.zone)));

  let multiplier = 1.0;
  const labels: string[] = [];

  if (types.size >= 4) { multiplier += 0.50; labels.push('ELITE MIX'); }
  else if (types.size >= 3) { multiplier += 0.30; labels.push('POWER MIX'); }
  else if (types.size >= 2) { multiplier += 0.15; labels.push('MIX'); }

  if (locations.size >= 3) { multiplier += 0.20; labels.push('FULL ZONE'); }
  else if (locations.size >= 2) multiplier += 0.10;

  const allStrikes = recent.length >= 3 && recent.every(
    p => p.outcome === 'strike_called' || p.outcome === 'strike_swinging' || p.outcome === 'foul',
  );
  if (allStrikes) { multiplier += 0.25; labels.push('HOT STREAK'); }

  multiplier = Math.min(multiplier, 3.0);
  multiplier = Math.round(multiplier * 100) / 100;
  return { multiplier, label: labels.join(' + ') };
}

export function calculatePoints(
  outcome: PitchOutcome,
  powerScore: number,
  accuracyScore: number,
  isKO: boolean,
  isKOLooking: boolean,
  isWalk: boolean,
  multiplier: number,
  strategyBonus: number = 0,
): { base: number; bonus: number; total: number } {
  let base = 0;
  let bonus = 0;
  switch (outcome) {
    case 'strike_called':   base = 75;  break;
    case 'strike_swinging': base = 100; break;
    case 'foul':            base = 30;  break;
    case 'ball':            base = 0;   break;
    case 'hit':             base = 0;   break;
  }
  if (isPerfectPower(powerScore) && outcome !== 'ball' && outcome !== 'hit') bonus += 50;
  if (isPerfectAccuracy(accuracyScore) && outcome !== 'ball' && outcome !== 'hit') bonus += 75;
  if (isKO) { bonus += 250; if (isKOLooking) bonus += 100; }
  if (isWalk) bonus -= 75;
  bonus += strategyBonus;
  const baseWithMult = Math.round(base * multiplier);
  const total = Math.max(0, baseWithMult + bonus);
  return { base: baseWithMult, bonus, total };
}

export function isPerfectPower(power: number): boolean {
  return power >= 0.60 && power <= 0.88;
}

export function isPerfectAccuracy(accuracy: number): boolean {
  return accuracy >= 0.75;
}

const PITCH_SPEED_RANGES: Record<PitchType, { base: number; range: number }> = {
  fastball:  { base: 86, range: 16 },
  cutter:    { base: 82, range: 12 },
  slider:    { base: 78, range: 12 },
  splitter:  { base: 80, range: 10 },
  changeup:  { base: 72, range: 12 },
  curveball: { base: 68, range: 14 },
};

/**
 * Returns a realistic pitch speed in mph.
 * Power score (0–1) drives 60 % of the range; the pitcher's speed stat (1–10) drives 40 %.
 */
export function calculatePitchSpeed(
  pitchType: PitchType,
  powerScore: number,
  speedStat: number,
): number {
  const { base, range } = PITCH_SPEED_RANGES[pitchType];
  const statFactor  = (Math.max(1, Math.min(10, speedStat)) - 1) / 9;
  const mph = base + range * (powerScore * 0.6 + statFactor * 0.4);
  return Math.round(mph);
}

export type RunnerAdvanceOutcome = {
  runners: [boolean, boolean, boolean];
  lead: number;
  blownSave: boolean;
};

/**
 * Advances baserunners in Closer mode based on pitch outcome.
 * Single model: each runner shifts +1 base; runners scoring from 3rd reduce the lead.
 * Walk: force-advances all occupied bases, adds runner to 1st.
 * Strikeout/foul/called-strike: no runner movement.
 */
export function advanceRunners(
  runners: [boolean, boolean, boolean],
  outcome: PitchOutcome,
  lead: number,
): RunnerAdvanceOutcome {
  if (outcome === 'strike_called' || outcome === 'strike_swinging' || outcome === 'foul') {
    return { runners: [...runners] as [boolean, boolean, boolean], lead, blownSave: false };
  }

  const [on1, on2, on3] = runners;
  let newLead = lead;

  if (outcome === 'ball') {
    // Walk: force-advance only through occupied chain
    // Batter goes to 1st; each occupied base advances if forced
    const force2 = on1;          // runner on 1st forced to 2nd
    const force3 = on1 && on2;   // runner on 2nd forced to 3rd (only if 1st also occupied)
    const scores  = on1 && on2 && on3; // runner on 3rd scores (only if bases loaded)
    if (scores) newLead = lead - 1;
    const r1 = true;
    const r2 = force2 ? true : on2;
    const r3 = force3 ? true : on3;
    return { runners: [r1, r2, r3], lead: newLead, blownSave: newLead <= 0 };
  }

  if (outcome === 'hit') {
    // Single: all runners advance one base; runner from 3rd scores
    if (on3) newLead = lead - 1;
    const r1 = true;   // batter reaches 1st
    const r2 = on1;    // old 1st advances to 2nd
    const r3 = on2;    // old 2nd advances to 3rd
    // old 3rd scores (handled above)
    return { runners: [r1, r2, r3], lead: newLead, blownSave: newLead <= 0 };
  }

  return { runners: [...runners] as [boolean, boolean, boolean], lead, blownSave: false };
}
