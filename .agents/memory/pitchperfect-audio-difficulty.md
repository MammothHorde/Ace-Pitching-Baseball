---
name: PitchPerfect audio & difficulty settings
description: Non-obvious constraints for the Settings feature — strike-zone cell-size sync, expo-audio web autoplay, difficulty scaling direction.
---

# Strike-zone cell-size sync (hard constraint)
The ball-flight target and the rendered grid MUST use the same cell dimensions or
the ball lands off the tapped cell.
- `game.tsx` derives geometry from a single `zoneGeometry(difficulty)` helper
  (`cellW/cellH/zoneLeft/zoneTop`) memoized on `settings.difficulty`.
- The SAME `cellW/cellH` are passed to `StrikeZone` as `cellWidth/cellHeight`
  props AND used by the in-component `getZoneCenter()`.
**How to apply:** any change to zone sizing must flow through `zoneGeometry` and be
passed to BOTH `StrikeZone` props and `getZoneCenter` — never hardcode cell size in
only one place.

# Perfect-accuracy zone (3-place sync, hard constraint)
The accuracy "perfect" band is defined in THREE places that must stay in lockstep,
or the displayed white-border zone / PERFECT! label won't match the scored reward:
1. `gameLogic.ts` `isPerfectAccuracy(accuracy)` threshold (currently `>= 0.75`).
2. `AccuracyMeter.tsx` label logic (`score >= 0.75` → PERFECT!).
3. `AccuracyMeter.tsx` `perfectZoneBorder` style (`left`/`width`) — the visible band.
Relationship: accuracy = 1 - |pos-0.5|*2. Threshold T → band half-width (1-T)/2 each
side of center, so border `left = 50% - (1-T)/2*100`, `width = (1-T)*100`. T=0.75 →
left 37.5%, width 25% (band [0.375,0.625]). Earlier T was 0.80 (left 40%, width 20%).
**How to apply:** changing perfect-zone forgiveness means editing all three together.

# Global meter slowdown knob
`meterSlowdown` (in game.tsx, currently 1.25) multiplies BOTH power & accuracy cycle
durations on top of `diffSpeedMult`. 1.25 = 20% slower meters (period ×1.25). One
constant tunes overall meter speed independent of difficulty.

# Difficulty scaling direction (0..1, default 0.5)
Higher difficulty = harder: FASTER accuracy needle (shorter cycle) + SMALLER zone.
- speed: `diffSpeedMult = 1.4 - 0.85*difficulty` (1.4 easy … 0.55 hard) multiplies `accuracyCycleDuration`.
- size: `scale = 1.25 - 0.47*difficulty` (1.25 easy … 0.78 hard) on base cell 34×30.

# expo-audio web autoplay
Browsers block audio until a user gesture. BGM is kick-started inside `playSfx`
(first tap doubles as the unblocking gesture) and also (re)started when the music
volume slider moves. Don't expect BGM to auto-start on mount on web.
**API used:** `createAudioPlayer(require(...))`, `.loop`, `.volume`, `.play()`,
`.pause()`, `.seekTo(0)`, `.playing`, `.remove()`, `setAudioModeAsync({playsInSilentMode:true})`.
Players are created once in a mount effect and cleaned up via `.remove()`.

# Layered pitch-outcome audio (umpire + crowd)
`resolvePitch` in game.tsx layers three sounds: immediate catch/contact (mitt/hit)
→ umpire call at +280ms via `playSfxIn` → crowd reaction after. Umpire clips:
umpBall, umpStrike1, umpStrike2, umpStrikeout (latter says "strike three, you're
out", used on KO). Strike-count mapping: KO branch handles 3rd strike, so
`newStrikes===1?umpStrike1:umpStrike2` never needs a strike-3 case. Crowd: cheer
guaranteed on K + probabilistic on strikes; boo probabilistic on walk and on hit.
`playSfxIn(name, ms)` lives in AudioContext, tracks timers in a ref, clears them on
provider unmount — needed so delayed sounds don't fire against removed players.

# Settings persistence
`PitcherProfile.settings` persisted via AsyncStorage. Both the load path AND
`updateSettings` clamp every value to [0,1] (`clamp01`) so corrupted storage can't
produce out-of-range audio/difficulty. Load merges `{...DEFAULT_SETTINGS, ...saved.settings}`.
