export type PitchType = 'fastball' | 'curveball' | 'slider' | 'changeup' | 'splitter' | 'cutter';
export type ZoneId =
  | 1  | 2  | 3  | 4  | 5
  | 6  | 7  | 8  | 9  | 10
  | 11 | 12 | 13 | 14 | 15
  | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25;
export type GamePhase = 'selecting' | 'power' | 'accuracy' | 'result' | 'inning_break' | 'game_over';
export type PitchOutcome = 'strike_called' | 'strike_swinging' | 'ball' | 'foul' | 'hit';
export type PitchingStyle = 'classic' | 'total_control';

export type CountSituationKey =
  | 'first_pitch'
  | 'pitchers_count'
  | 'hitters_count'
  | 'payoff'
  | 'neutral';

export interface CountSituation {
  key: CountSituationKey;
  label: string;
  hint: string;
  color: string;
}

export interface PitchRecord {
  type: PitchType;
  zone: ZoneId;
  powerScore: number;
  accuracyScore: number;
  outcome: PitchOutcome;
  points: number;
  bonusMultiplier: number;
}

export interface PitcherStats {
  speed: number;
  accuracy: number;
  stamina: number;
  spin: number;
}

export interface PitcherProfile {
  name: string;
  level: number;
  gamesPlayed: number;
  highScore: number;
  lifetimePoints: number;
  spentPoints: number;
  stats: PitcherStats;
  unlockedPitches: PitchType[];
  statUpgradeCounts: Record<keyof PitcherStats, number>;
  pitchingStyle?: PitchingStyle;
}

export interface PitchResult {
  outcome: PitchOutcome;
  powerScore: number;
  accuracyScore: number;
  basePoints: number;
  bonusPoints: number;
  multiplier: number;
  totalPoints: number;
  isPerfectPower: boolean;
  isPerfectAccuracy: boolean;
  isKO: boolean;
  isKOLooking: boolean;
  sequenceLabel: string;
  strategyLabels: string[];
  isPayoffPitch: boolean;
}
