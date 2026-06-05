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

The pitch grid is **9×9 (81 cells)** numbered row-major 1…81. The **center 3×3**
(cells 31,32,33,40,41,42,49,50,51) is the actual **strike zone**; it sits dead-center
inside a 3-cell-thick **ball ring** on every side.

- Geometry is computed, not hardcoded: `zCol = (z-1)%9`, `zRow = floor((z-1)/9)`
  (0-indexed 0…8). `inStrikeZone` = cols 3-5 & rows 3-5. To change grid size, change
  `ZONE_GRID`/`GRID` in **three** places that must agree: `utils/gameLogic.ts`,
  `components/StrikeZone.tsx`, AND `app/game.tsx`. Also update `ZoneId` in
  `constants/GameTypes.ts` (literal union 1…N²) and the green `strikeBox` overlay
  offset in StrikeZone (`left/top = cellW/H * <ring-thickness>`, size = cell*3).
- **Cell size must stay in sync** between `StrikeZone` compact dims and game.tsx
  `BASE_CELL_W/H` (currently 24×21) — ball targeting (`getZoneCenter`) relies on it.
  Smaller base cells than the old 5×5 (34×30) so 81 cells fit on screen.
- Strategy sets derive from the strike zone: `CORNER_ZONES`={31,33,49,51} (paint),
  `EDGE_ZONES`={32,40,42,50}, `HEART_ZONE`=41, `DOWN_AND_AWAY`=51.
  `HIGH_ZONES`=rows≤2 (above zone), `LOW_ZONES`=rows≥6 (below zone).
  **Why:** "painting the corner" must mean the corner of the *strike zone*, not
  the extreme grid corners (which are balls).
- **Taken pitch outside `STRIKE_ZONE` is always a ball** (no-swing branch). Only
  in-zone taken pitches can be called strikes. Out-of-zone also lowers swing &
  contact prob (chase swing-and-miss), softened at 2 strikes.

## Meter forgiveness vs. perfect-bonus (two separate accuracy values)

The raw needle score `accuracyScore = 1 - |pos-0.5|*2` (computed in `app/game.tsx`
`lockAccuracy`) must stay **linear**. **Why:** it drives both the on-screen
`AccuracyMeter` label/perfect-zone border AND `isPerfectAccuracy` (currently >=0.75 →
needle within ±0.125 of center; see pitchperfect-audio-difficulty.md for the 3-place
sync rule). If you ease it, the displayed perfect zone no longer matches where the
+75 perfect bonus fires.

Forgiveness for off-center needles lives **only inside `calculatePitchOutcome`**:
it eases its own copy `acc = accuracyScore^0.6` and uses `acc` (never the raw score)
for every outcome decision (auto-ball floor, swing/contact prob, called-strike-on-take).
**How to apply:** to make the game more/less forgiving outside perfect, tune the
exponent + the `acc` thresholds there; do NOT touch `accuracyScore` in game.tsx or the
`isPerfect*` thresholds, or you'll desync the meter UI from the reward.
**Balance check:** a clear miss (needle dev > ~0.35, linear score < 0.30 = meter "MISS")
must still fail (taken in-zone → ball); only the extreme edge auto-balls.
