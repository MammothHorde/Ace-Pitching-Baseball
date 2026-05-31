---
name: PitchPerfect strategy/scoring model
description: How real-baseball strategy is wired into outcome + scoring, and the invariants that keep it balanced.
---

# PitchPerfect strategy model (utils/gameLogic.ts)

Real-baseball strategy (location / speed / sequencing) feeds two separate paths:

- **Outcome bias** — `calculatePitchOutcome` takes a `history` arg and adjusts
  swing/contact probabilities. Both probabilities are clamped, so new modifiers
  can't produce runaway math.
- **Scoring reward** — `evaluateStrategyReward` awards *flat* point bonuses + labels.

**Invariants to preserve:**
- `history` passed to `calculatePitchOutcome` / `readStrategy` **excludes the
  current pitch** (it's `pitchHistoryRef.current` before the new record is pushed).
  `predictable` = current would be the 3rd identical type; `tunnel` compares only
  the previous record vs the current pitch.
- Strategy bonuses are **flat and post-multiplier** (added to `bonus`, never
  multiplied). **Why:** keeps total scoring bounded — do not move them above the
  `base * multiplier` step or they compound.
- Payoff "win" is **success-gated**: only a strike/swinging-strike at 3-2 sets
  `isPayoffWin` (a foul at 3-2 must not show the won badge).
