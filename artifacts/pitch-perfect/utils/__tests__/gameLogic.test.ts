import {
  advanceRunners,
  calculatePitchOutcome,
  calculatePitchSpeed,
  calculatePoints,
  calculateSequenceMultiplier,
  getCountSituation,
  isInStrikeZone,
  isPerfectAccuracy,
  isPerfectPower,
  readStrategy,
} from '../gameLogic';
import type { PitchRecord, PitcherStats } from '@/constants/GameTypes';

// ─── helpers ────────────────────────────────────────────────────────────────

const defaultStats: PitcherStats = { speed: 5, accuracy: 5, stamina: 5, spin: 5 };

function makeRecord(overrides: Partial<PitchRecord> = {}): PitchRecord {
  return {
    type: 'fastball',
    zone: 5,
    powerScore: 0.7,
    accuracyScore: 0.8,
    outcome: 'strike_called',
    points: 75,
    bonusMultiplier: 1.0,
    ...overrides,
  };
}

// ─── isInStrikeZone ──────────────────────────────────────────────────────────

describe('isInStrikeZone', () => {
  it('returns true for all inner 3×3 zones', () => {
    ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).forEach(z =>
      expect(isInStrikeZone(z)).toBe(true),
    );
  });

  it('returns false for all corner shadow zones', () => {
    ([11, 12, 13, 14] as const).forEach(z =>
      expect(isInStrikeZone(z)).toBe(false),
    );
  });
});

// ─── isPerfectPower ──────────────────────────────────────────────────────────

describe('isPerfectPower', () => {
  it('is true at the lower boundary (0.60)', () => expect(isPerfectPower(0.60)).toBe(true));
  it('is true at the upper boundary (0.88)', () => expect(isPerfectPower(0.88)).toBe(true));
  it('is true inside the band',              () => expect(isPerfectPower(0.74)).toBe(true));
  it('is false just below the lower boundary (0.59)', () => expect(isPerfectPower(0.59)).toBe(false));
  it('is false just above the upper boundary (0.89)', () => expect(isPerfectPower(0.89)).toBe(false));
  it('is false at 0',   () => expect(isPerfectPower(0)).toBe(false));
  it('is false at 1',   () => expect(isPerfectPower(1)).toBe(false));
});

// ─── isPerfectAccuracy ───────────────────────────────────────────────────────

describe('isPerfectAccuracy', () => {
  it('is true at exactly 0.75',   () => expect(isPerfectAccuracy(0.75)).toBe(true));
  it('is true above 0.75',        () => expect(isPerfectAccuracy(1.0)).toBe(true));
  it('is false just below (0.74)', () => expect(isPerfectAccuracy(0.74)).toBe(false));
  it('is false at 0',             () => expect(isPerfectAccuracy(0)).toBe(false));
});

// ─── getCountSituation ───────────────────────────────────────────────────────

describe('getCountSituation', () => {
  it('returns payoff on 3-2', () => {
    expect(getCountSituation(3, 2).key).toBe('payoff');
  });

  it('returns pitchers_count on 0-2', () => {
    expect(getCountSituation(0, 2).key).toBe('pitchers_count');
  });

  it('returns pitchers_count on 1-2', () => {
    expect(getCountSituation(1, 2).key).toBe('pitchers_count');
  });

  it('returns hitters_count on 3-0', () => {
    expect(getCountSituation(3, 0).key).toBe('hitters_count');
  });

  it('returns hitters_count on 2-0', () => {
    expect(getCountSituation(2, 0).key).toBe('hitters_count');
  });

  it('returns first_pitch on 0-0', () => {
    expect(getCountSituation(0, 0).key).toBe('first_pitch');
  });

  it('returns neutral on 1-1', () => {
    expect(getCountSituation(1, 1).key).toBe('neutral');
  });

  it('returns neutral on 2-1', () => {
    expect(getCountSituation(2, 1).key).toBe('neutral');
  });
});

// ─── calculatePoints ─────────────────────────────────────────────────────────

describe('calculatePoints', () => {
  it('strike_called yields base 75 at 1× multiplier', () => {
    const { base, total } = calculatePoints('strike_called', 0.5, 0.5, false, false, false, 1.0);
    expect(base).toBe(75);
    expect(total).toBe(75);
  });

  it('strike_swinging yields base 100', () => {
    const { base } = calculatePoints('strike_swinging', 0.5, 0.5, false, false, false, 1.0);
    expect(base).toBe(100);
  });

  it('foul yields base 30', () => {
    const { base } = calculatePoints('foul', 0.5, 0.5, false, false, false, 1.0);
    expect(base).toBe(30);
  });

  it('ball and hit yield 0 base points', () => {
    expect(calculatePoints('ball', 0.5, 0.5, false, false, false, 1.0).base).toBe(0);
    expect(calculatePoints('hit',  0.5, 0.5, false, false, false, 1.0).base).toBe(0);
  });

  it('KO adds +250 bonus', () => {
    const { bonus } = calculatePoints('strike_swinging', 0.5, 0.5, true, false, false, 1.0);
    expect(bonus).toBeGreaterThanOrEqual(250);
  });

  it('KO looking adds +350 bonus (250 + 100)', () => {
    const { bonus } = calculatePoints('strike_called', 0.5, 0.5, true, true, false, 1.0);
    expect(bonus).toBeGreaterThanOrEqual(350);
  });

  it('walk subtracts 75 from bonus', () => {
    const { bonus } = calculatePoints('ball', 0.5, 0.5, false, false, true, 1.0);
    expect(bonus).toBe(-75);
  });

  it('total is clamped to 0 (never negative)', () => {
    const { total } = calculatePoints('ball', 0.5, 0.5, false, false, true, 1.0);
    expect(total).toBe(0);
  });

  it('perfect power adds +50 on a strike', () => {
    const withPerfect    = calculatePoints('strike_called', 0.74, 0.5,  false, false, false, 1.0);
    const withoutPerfect = calculatePoints('strike_called', 0.50, 0.5,  false, false, false, 1.0);
    expect(withPerfect.bonus - withoutPerfect.bonus).toBe(50);
  });

  it('perfect accuracy adds +75 on a strike', () => {
    const withPerfect    = calculatePoints('strike_called', 0.5, 0.80, false, false, false, 1.0);
    const withoutPerfect = calculatePoints('strike_called', 0.5, 0.50, false, false, false, 1.0);
    expect(withPerfect.bonus - withoutPerfect.bonus).toBe(75);
  });

  it('multiplier scales the base correctly', () => {
    const { base } = calculatePoints('strike_called', 0.5, 0.5, false, false, false, 2.0);
    expect(base).toBe(150); // 75 × 2
  });

  it('strategy bonus is included in total', () => {
    const { total } = calculatePoints('strike_called', 0.5, 0.5, false, false, false, 1.0, 60);
    expect(total).toBe(75 + 60);
  });
});

// ─── calculateSequenceMultiplier ─────────────────────────────────────────────

describe('calculateSequenceMultiplier', () => {
  it('returns 1.0 with no history', () => {
    expect(calculateSequenceMultiplier([]).multiplier).toBe(1.0);
  });

  it('returns 1.0 with a single pitch', () => {
    expect(calculateSequenceMultiplier([makeRecord()]).multiplier).toBe(1.0);
  });

  it('returns MIX label with 2 pitch types in recent history', () => {
    const history = [
      makeRecord({ type: 'fastball' }),
      makeRecord({ type: 'curveball' }),
    ];
    const { multiplier, label } = calculateSequenceMultiplier(history);
    expect(multiplier).toBeGreaterThan(1.0);
    expect(label).toContain('MIX');
  });

  it('returns POWER MIX with 3 distinct pitch types', () => {
    const history = [
      makeRecord({ type: 'fastball' }),
      makeRecord({ type: 'curveball' }),
      makeRecord({ type: 'slider' }),
    ];
    const { label } = calculateSequenceMultiplier(history);
    expect(label).toContain('POWER MIX');
  });

  it('returns ELITE MIX with 4+ distinct pitch types', () => {
    const history = [
      makeRecord({ type: 'fastball' }),
      makeRecord({ type: 'curveball' }),
      makeRecord({ type: 'slider' }),
      makeRecord({ type: 'changeup' }),
    ];
    const { label } = calculateSequenceMultiplier(history);
    expect(label).toContain('ELITE MIX');
  });

  it('applies HOT STREAK with 3+ consecutive strike outcomes', () => {
    const history = [
      makeRecord({ outcome: 'strike_called' }),
      makeRecord({ outcome: 'strike_swinging' }),
      makeRecord({ outcome: 'foul' }),
    ];
    const { label } = calculateSequenceMultiplier(history);
    expect(label).toContain('HOT STREAK');
  });

  it('caps multiplier at 3.0', () => {
    // 4 types (ELITE MIX +0.5) + 3 locations (FULL ZONE +0.2) + hot streak (+0.25) = 1.95
    // can't exceed 3.0
    const history = [
      makeRecord({ type: 'fastball',  zone: 1, outcome: 'strike_called' }),
      makeRecord({ type: 'curveball', zone: 5, outcome: 'strike_swinging' }),
      makeRecord({ type: 'slider',    zone: 9, outcome: 'foul' }),
      makeRecord({ type: 'changeup',  zone: 3, outcome: 'strike_called' }),
      makeRecord({ type: 'splitter',  zone: 7, outcome: 'strike_swinging' }),
    ];
    expect(calculateSequenceMultiplier(history).multiplier).toBeLessThanOrEqual(3.0);
  });
});

// ─── calculatePitchSpeed ─────────────────────────────────────────────────────

describe('calculatePitchSpeed', () => {
  it('fastball speed is within expected range (86–102 mph)', () => {
    const slow = calculatePitchSpeed('fastball', 0, 1);
    const fast = calculatePitchSpeed('fastball', 1, 10);
    expect(slow).toBeGreaterThanOrEqual(86);
    expect(fast).toBeLessThanOrEqual(102);
  });

  it('curveball is always slower than a fastball at the same settings', () => {
    expect(calculatePitchSpeed('curveball', 0.7, 5))
      .toBeLessThan(calculatePitchSpeed('fastball', 0.7, 5));
  });

  it('returns an integer', () => {
    const mph = calculatePitchSpeed('slider', 0.7, 5);
    expect(Number.isInteger(mph)).toBe(true);
  });
});

// ─── advanceRunners ──────────────────────────────────────────────────────────

describe('advanceRunners', () => {
  it('does not move runners on a called strike', () => {
    const { runners, lead } = advanceRunners([true, true, true], 'strike_called', 2);
    expect(runners).toEqual([true, true, true]);
    expect(lead).toBe(2);
  });

  it('does not move runners on a swinging strike', () => {
    const { runners } = advanceRunners([true, false, false], 'strike_swinging', 1);
    expect(runners).toEqual([true, false, false]);
  });

  it('does not move runners on a foul', () => {
    const { runners } = advanceRunners([false, true, false], 'foul', 3);
    expect(runners).toEqual([false, true, false]);
  });

  describe('hit (single)', () => {
    it('runner on 3rd scores, lead decreases by 1', () => {
      const { lead, runners } = advanceRunners([false, false, true], 'hit', 2);
      expect(lead).toBe(1);
      expect(runners[2]).toBe(false); // scored
      expect(runners[0]).toBe(true);  // batter on 1st
    });

    it('bases empty → batter reaches 1st', () => {
      const { runners } = advanceRunners([false, false, false], 'hit', 3);
      expect(runners).toEqual([true, false, false]);
    });

    it('runner on 1st advances to 2nd', () => {
      const { runners } = advanceRunners([true, false, false], 'hit', 3);
      expect(runners[0]).toBe(true);  // batter on 1st
      expect(runners[1]).toBe(true);  // old runner advanced to 2nd
    });

    it('blownSave is true when lead drops to 0', () => {
      const { blownSave } = advanceRunners([false, false, true], 'hit', 1);
      expect(blownSave).toBe(true);
    });
  });

  describe('walk (ball outcome)', () => {
    it('bases loaded → runner from 3rd scores (force)', () => {
      const { lead, runners } = advanceRunners([true, true, true], 'ball', 1);
      expect(lead).toBe(0);
      expect(runners[0]).toBe(true); // batter on 1st
    });

    it('runner on 1st only → force to 2nd, batter to 1st, no score', () => {
      const { runners, lead } = advanceRunners([true, false, false], 'ball', 2);
      expect(runners[0]).toBe(true);
      expect(runners[1]).toBe(true);
      expect(runners[2]).toBe(false);
      expect(lead).toBe(2); // no score
    });

    it('empty bases → just batter to 1st', () => {
      const { runners, lead } = advanceRunners([false, false, false], 'ball', 3);
      expect(runners[0]).toBe(true);
      expect(runners[1]).toBe(false);
      expect(runners[2]).toBe(false);
      expect(lead).toBe(3);
    });
  });
});

// ─── readStrategy ────────────────────────────────────────────────────────────

describe('readStrategy', () => {
  it('detects paintedCorner for corner zones', () => {
    ([1, 3, 7, 9] as const).forEach(zone => {
      expect(readStrategy('fastball', zone, 0, 0, []).paintedCorner).toBe(true);
    });
  });

  it('does not flag paintedCorner for heart zone (5)', () => {
    expect(readStrategy('fastball', 5, 0, 0, []).paintedCorner).toBe(false);
  });

  it('detects downAndAway for zone 9', () => {
    expect(readStrategy('fastball', 9, 0, 0, []).downAndAway).toBe(true);
  });

  it('detects backwards pitch on hitter\'s count with offspeed', () => {
    // 3-0 is a hitter's count; curveball is offspeed → backwards = true
    expect(readStrategy('curveball', 5, 3, 0, []).backwards).toBe(true);
  });

  it('does not flag backwards on pitcher\'s count', () => {
    // 0-2 is pitcher's count
    expect(readStrategy('curveball', 5, 0, 2, []).backwards).toBe(false);
  });

  it('detects predictable pitch (3rd identical in a row)', () => {
    const history = [makeRecord({ type: 'fastball' }), makeRecord({ type: 'fastball' })];
    expect(readStrategy('fastball', 5, 0, 0, history).predictable).toBe(true);
  });

  it('does not flag predictable with only one prior pitch', () => {
    const history = [makeRecord({ type: 'fastball' })];
    expect(readStrategy('fastball', 5, 0, 0, history).predictable).toBe(false);
  });

  it('detects sameLocation when previous pitch was in the same zone', () => {
    const history = [makeRecord({ zone: 3 })];
    expect(readStrategy('fastball', 3, 0, 0, history).sameLocation).toBe(true);
  });
});

// ─── calculatePitchOutcome (deterministic boundaries) ────────────────────────

describe('calculatePitchOutcome — deterministic boundaries', () => {
  it('always returns "ball" when accuracyScore is very low', () => {
    // The code applies: acc = pow(accuracyScore, 0.6); if (acc < 0.20) return 'ball'
    // pow(0.04, 0.6) ≈ 0.145 < 0.20  → guaranteed ball regardless of random swing
    for (let i = 0; i < 20; i++) {
      expect(
        calculatePitchOutcome('fastball', 5, 0.7, 0.04, defaultStats, 0, 0),
      ).toBe('ball');
    }
  });

  it('always returns "hit" when powerScore is below 0.06', () => {
    // acc is fine (0.8 → 0.86 after pow), but power is nearly zero → guaranteed hit
    for (let i = 0; i < 20; i++) {
      expect(
        calculatePitchOutcome('fastball', 5, 0.01, 0.90, defaultStats, 0, 0),
      ).toBe('hit');
    }
  });

  it('never returns "ball" for a heart-zone (5) pitch with acc=0.99 on 2 strikes', () => {
    // 2 strikes → swingProb += 0.22; heart zone += 0.12; acc > 0.80 += 0.06
    // effective swingProb ≈ 0.80 — very likely to swing.
    // Over 50 trials, ball (take + out-of-zone) is impossible since zone 5 is a strike.
    const outcomes = new Set(
      Array.from({ length: 50 }, () =>
        calculatePitchOutcome('fastball', 5, 0.7, 0.99, defaultStats, 2, 0),
      ),
    );
    expect(outcomes.has('ball')).toBe(false);
  });
});
