import { PitchType, ZoneId, PitchOutcome, PitcherStats, PitchRecord } from '@/constants/GameTypes';

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

export function calculatePitchOutcome(
  pitchType: PitchType,
  zone: ZoneId,
  powerScore: number,
  accuracyScore: number,
  stats: PitcherStats,
  strikes: number,
  balls: number,
): PitchOutcome {
  if (accuracyScore < 0.15) return 'ball';
  if (powerScore < 0.12) return 'hit';

  const edgeZones = new Set<number>([1, 3, 7, 9]);
  const highZones = new Set<number>([1, 2, 3]);
  const lowZones  = new Set<number>([7, 8, 9]);

  let swingProb = 0.42;
  if (strikes === 2) swingProb += 0.22;
  if (balls === 3)   swingProb -= 0.12;
  if (strikes === 0 && balls === 0) swingProb -= 0.06;
  if (balls === 3 && strikes === 2) swingProb += 0.12;
  if (strikes === 1 && balls === 0) swingProb -= 0.04;
  if (edgeZones.has(zone)) swingProb -= 0.12;
  if (zone === 5)           swingProb += 0.12;
  if (highZones.has(zone))  swingProb += 0.04;
  if (lowZones.has(zone))   swingProb -= 0.04;
  if (accuracyScore < 0.4)  swingProb -= 0.10;
  if (accuracyScore > 0.75) swingProb += 0.06;

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
    contactProb = Math.max(0.04, Math.min(0.72, contactProb));

    if (Math.random() < contactProb) {
      return Math.random() < 0.32 ? 'foul' : 'hit';
    }
    return 'strike_swinging';
  } else {
    return accuracyScore > 0.32 ? 'strike_called' : 'ball';
  }
}

export function calculateSequenceMultiplier(history: PitchRecord[]): { multiplier: number; label: string } {
  if (history.length < 2) return { multiplier: 1.0, label: '' };

  const recent = history.slice(-5);
  const types = new Set(recent.map(p => p.type));
  const getQuadrant = (z: ZoneId): string => {
    if ([1, 4, 7].includes(z)) return 'inside';
    if ([3, 6, 9].includes(z)) return 'outside';
    if ([1, 2, 3].includes(z)) return 'high';
    return 'low';
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
