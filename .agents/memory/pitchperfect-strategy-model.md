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

## Strike-zone grid geometry (the source of truth)

The pitch grid is **5×5 (25 cells)** numbered row-major 1…25. The **inner 3×3**
(cells 7,8,9,12,13,14,17,18,19) is the actual **strike zone**; the outer ring is
**out of the zone (ball territory)**.

- Geometry is computed, not hardcoded: `zCol = (z-1)%5`, `zRow = floor((z-1)/5)`.
  `inStrikeZone` = cols 1-3 & rows 1-3. To change grid size, change the `GRID`/
  `ZONE_GRID` constant in BOTH `components/StrikeZone.tsx` and `app/game.tsx`.
- **Cell size must stay in sync** between `StrikeZone` compact dims and game.tsx
  `ZONE_CELL_W/H` (currently 34×30) — ball targeting (`getZoneCenter`) relies on it.
- Strategy sets derive from the strike zone: `CORNER_ZONES`={7,9,17,19} (paint),
  `EDGE_ZONES`={8,12,14,18}, `HEART_ZONE`=13, `DOWN_AND_AWAY`=19.
  **Why:** "painting the corner" must mean the corner of the *strike zone*, not
  the extreme 5×5 corners (which are balls).
- **Taken pitch outside `STRIKE_ZONE` is always a ball** (no-swing branch). Only
  in-zone taken pitches can be called strikes. Out-of-zone also lowers swing &
  contact prob (chase swing-and-miss), softened at 2 strikes.

## Meter forgiveness vs. perfect-bonus (two separate accuracy values)

The raw needle score `accuracyScore = 1 - |pos-0.5|*2` (computed in `app/game.tsx`
`lockAccuracy`) must stay **linear**. **Why:** it drives both the on-screen
`AccuracyMeter` label/perfect-zone border AND `isPerfectAccuracy` (>=0.80 → needle
within ±0.10 of center). If you ease it, the displayed perfect zone no longer matches
where the +75 perfect bonus fires.

Forgiveness for off-center needles lives **only inside `calculatePitchOutcome`**:
it eases its own copy `acc = accuracyScore^0.6` and uses `acc` (never the raw score)
for every outcome decision (auto-ball floor, swing/contact prob, called-strike-on-take).
**How to apply:** to make the game more/less forgiving outside perfect, tune the
exponent + the `acc` thresholds there; do NOT touch `accuracyScore` in game.tsx or the
`isPerfect*` thresholds, or you'll desync the meter UI from the reward.
**Balance check:** a clear miss (needle dev > ~0.35, linear score < 0.30 = meter "MISS")
must still fail (taken in-zone → ball); only the extreme edge auto-balls.
