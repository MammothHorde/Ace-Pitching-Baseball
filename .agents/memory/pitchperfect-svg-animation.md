---
name: PitchPerfect SVG character animation
description: How to animate react-native-svg characters so they work on Expo web as well as native.
---

# Animating react-native-svg on Expo web

**Rule:** Do NOT animate `react-native-svg` `<G>` (or other element) transform props
directly with `Animated` (e.g. an `Animated.createAnimatedComponent(G)` driven by
`translateX` / `translateY` / `rotation` + `originX`/`originY`). On Expo **web** those
props leak straight to the DOM as invalid attributes (`translateX`, `translateY`,
`transform-origin`, `rotation`) and the animation silently does nothing — you'll see
React warnings like "React does not recognize the translateX prop" and "Invalid DOM
property transform-origin". It may appear to work on native but is broken on web.

**Instead:** wrap each moving sub-part in an `Animated.View` and animate its **style
`transform`** array (`translateX`, `translateY`, `scale`, `rotate` as a deg string).
react-native-web maps View style transforms correctly, so this works on both web and
native. Put the static body in a base `<Svg>`, and render each animated limb as its own
small `<Svg>` inside an `Animated.View` overlaid with `position:'absolute'`.

**Rotation pivot:** RN style `rotate` always pivots around the view's **center**. To
rotate a limb around a joint (bat around the shoulder, umpire arm around the shoulder),
size the wrapper view as a square centered on that joint and draw the limb in the inner
`<Svg>` with the joint at the SVG center. Then `rotate` pivots at the joint.

**Why:** discovered when replacing the baked batter PNG with vector characters
(`components/FieldScene.tsx`). The first pass used animated `<G>` props and looked fine
on native but produced no motion + DOM warnings on web.

**How to apply:** any future SVG character/limb animation in this app (or any Expo web
target) — animate `Animated.View` style transforms, never the svg element transform props.
