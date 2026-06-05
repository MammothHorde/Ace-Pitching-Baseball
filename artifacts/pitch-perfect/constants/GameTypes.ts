export type PitchType = 'fastball' | 'curveball' | 'slider' | 'changeup' | 'splitter' | 'cutter';
export type ZoneId =
  | 1  | 2  | 3  | 4  | 5  | 6  | 7  | 8  | 9
  | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18
  | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27
  | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36
  | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45
  | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54
  | 55 | 56 | 57 | 58 | 59 | 60 | 61 | 62 | 63
  | 64 | 65 | 66 | 67 | 68 | 69 | 70 | 71 | 72
  | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80 | 81;
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

export interface GameSettings {
  /** 0 = easiest (slow meter, big zone) … 1 = hardest (fast meter, small zone). */
  difficulty: number;
  /** Background music volume, 0…1. */
  bgmVolume: number;
  /** Sound-effects volume, 0…1. */
  sfxVolume: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 0.5,
  bgmVolume: 0.55,
  sfxVolume: 0.8,
};

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
  settings?: GameSettings;
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
