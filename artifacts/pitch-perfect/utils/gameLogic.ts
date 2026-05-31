import { PitchType, ZoneId, PitchOutcome, PitcherStats, PitchRecord, CountSituation } from '@/constants/GameTypes';

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

// ─── Real-baseball strategy model ───────────────────────────────────────────
//
// Three dimensions of pitching strategy from the research:
//   • Location — the heart of the plate is dangerous; corners/edges are safe;
//     down & away is the single best spot.
//   • Speed    — fastballs set the table; offspeed disrupts timing; "pitching
//     backwards" (offspeed when a hitter is sitting fastball) is devastating.
//   • Sequence — never be predictable; tunnel pitches off the same look;
//     the count dictates the plan, peaking at the 3-2 "payoff pitch".

// 5-wide × 5-tall pitch grid (25 cells, numbered row-major top→bottom). The
// inner 3×3 (cells 7-9, 12-14, 17-19) is the actual STRIKE ZONE; the outer ring
// is out of the zone — a taken pitch there is a ball.
//    1  2  3  4  5   (top — out of zone)
//    6 [7  8  9]10
//   11[12 13 14]15   (middle — 13 is dead center)
//   16[17 18 19]20
//   21 22 23 24 25   (bottom — out of zone)
const ZONE_GRID = 5;
const zCol = (z: ZoneId) => (z - 1) % ZONE_GRID;        // 0 (inside) … 4 (outside)
const zRow = (z: ZoneId) => Math.floor((z - 1) / ZONE_GRID); // 0 (top) … 4 (bottom)
const ALL_ZONES = Array.from({ length: ZONE_GRID * ZONE_GRID }, (_, i) => (i + 1) as ZoneId);

// Inner 3×3 = the strike zone (columns 1-3, rows 1-3).
const inStrikeZone = (z: ZoneId) =>
  zCol(z) >= 1 && zCol(z) <= 3 && zRow(z) >= 1 && zRow(z) <= 3;
// Corner of the strike zone — the "painted" edge, the nastiest strike to hit.
const isZoneCorner = (z: ZoneId) =>
  inStrikeZone(z) && (zCol(z) === 1 || zCol(z) === 3) && (zRow(z) === 1 || zRow(z) === 3);

export const STRIKE_ZONE  = new Set<ZoneId>(ALL_ZONES.filter(inStrikeZone)); // 7-9,12-14,17-19
export const CORNER_ZONES = new Set<ZoneId>(ALL_ZONES.filter(isZoneCorner)); // 7, 9, 17, 19
export const HEART_ZONE: ZoneId = 13; // dead center — most hittable
// Non-corner edges of the strike zone (still strikes, a touch tougher to barrel).
export const EDGE_ZONES   = new Set<ZoneId>(
  ALL_ZONES.filter(z => inStrikeZone(z) && !isZoneCorner(z) && z !== HEART_ZONE), // 8, 12, 14, 18
);
export const HIGH_ZONES  = new Set<ZoneId>(ALL_ZONES.filter(z => zRow(z) <= 1)); // top two tiers
export const LOW_ZONES   = new Set<ZoneId>(ALL_ZONES.filter(z => zRow(z) >= 3)); // bottom two tiers
const DOWN_AND_AWAY: ZoneId = 19; // low-outside corner of the strike zone — premium spot

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

/** Pure read of the strategy context — no randomness. Used by both the
 *  outcome model (to bias contact) and the scoring model (to award bonuses). */
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
): PitchOutcome {
  if (accuracyScore < 0.15) return 'ball';
  if (powerScore < 0.12) return 'hit';

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
  // Pitches off the plate (outside the 3×3 zone) get taken — unless 2 strikes
  // forces the hitter to protect and chase.
  if (!STRIKE_ZONE.has(zone)) swingProb -= strikes === 2 ? 0.10 : 0.24;
  if (accuracyScore < 0.4)  swingProb -= 0.10;
  if (accuracyScore > 0.75) swingProb += 0.06;
  // A predictable hitter sits on the pitch and ambushes it.
  if (strat.predictable) swingProb += 0.08;
  // Pitching backwards freezes the hitter — he's gearing up for a fastball.
  if (strat.backwards)   swingProb -= 0.08;

  swingProb = Math.max(0.05, Math.min(0.88, swingProb));
  const didSwing = Math.random() < swingProb;

  if (didSwing) {
    let contactProb = 0.40;
    contactProb -= Math.max(0, (0.30 - Math.abs(powerScore - 0.70))) * 0.20;
    contactProb -= accuracyScore * 0.14;
    if (pitchType === 'curveball' || pitchType === 'slider') contactProb -= 0.07 + stats.spin * 0.007;
    if (pitchType === 'splitter')  contactProb -= 0.10 + stats.spin * 0.008;
    if (pitchType === 'changeup')  contactProb -= 0.04;
    if (pitchType === 'fastball')  contactProb -= stats.speed * 0.005;
    if (pitchType === 'cutter')    contactProb -= 0.05 + stats.spin * 0.004;
    if (strikes === 2) contactProb += 0.12;
    if (strikes === 0 && balls === 0) contactProb += 0.04;
    // Location: the heart of the plate is hammered; edges and corners are safer.
    if (zone === HEART_ZONE)      contactProb += 0.10;
    if (EDGE_ZONES.has(zone))     contactProb -= 0.04;
    // Chasing a pitch out of the zone is hard to square up.
    if (!STRIKE_ZONE.has(zone))   contactProb -= 0.10;
    if (strat.paintedCorner)      contactProb -= 0.08;
    if (strat.downAndAway)        contactProb -= 0.04;
    // Deception bonuses make the hitter miss.
    if (strat.backwards) contactProb -= 0.10;
    if (strat.tunnel)    contactProb -= 0.10;
    // Predictability lets the hitter barrel it up.
    if (strat.predictable) contactProb += 0.12;
    contactProb = Math.max(0.04, Math.min(0.74, contactProb));

    if (Math.random() < contactProb) {
      return Math.random() < 0.32 ? 'foul' : 'hit';
    }
    return 'strike_swinging';
  } else {
    // Took the pitch: only the inner 3×3 can be a called strike; off the plate
    // (or a missed spot) is a ball.
    if (!STRIKE_ZONE.has(zone)) return 'ball';
    return accuracyScore > 0.32 ? 'strike_called' : 'ball';
  }
}

/** Awards flat strategy bonuses (post-multiplier) and the labels to surface. */
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
  const getQuadrant = (z: ZoneId): string => {
    const col = zCol(z); // 0 (inside) … 4 (outside)
    const row = zRow(z); // 0 (top) … 4 (bottom)
    if (col <= 1) return 'inside';
    if (col >= 3) return 'outside';
    return row <= 1 ? 'high' : 'low';
  };
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
  return accuracy >= 0.80;
}
