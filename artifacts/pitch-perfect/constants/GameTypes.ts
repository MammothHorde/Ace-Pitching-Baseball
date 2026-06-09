export type PitchType = 'fastball' | 'curveball' | 'slider' | 'changeup' | 'splitter' | 'cutter';

export type GameMode = 'classic' | 'closer';
export type SaveResult = 'save' | 'hold' | 'blown_save' | 'none';

export interface CloserScenario {
  id: string;
  label: string;
  pressureLabel: string;
  inning: 8 | 9;
  leadRuns: number;
  startingOuts: 0 | 1 | 2;
  runners: [boolean, boolean, boolean];
  description: string;
  weight: number;
}

// MLB 13-zone system:
//   Inner 3×3 strike zone — zones 1-9 (left→right, top→bottom):
//     1  2  3
//     4  5  6
//     7  8  9
//   Corner shadow zones (just outside the strike zone corners):
//     11 = upper-inside   12 = upper-away
//     13 = lower-inside   14 = lower-away
export type ZoneId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 12 | 13 | 14;

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
