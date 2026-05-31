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

# Settings persistence
`PitcherProfile.settings` persisted via AsyncStorage. Both the load path AND
`updateSettings` clamp every value to [0,1] (`clamp01`) so corrupted storage can't
produce out-of-range audio/difficulty. Load merges `{...DEFAULT_SETTINGS, ...saved.settings}`.
