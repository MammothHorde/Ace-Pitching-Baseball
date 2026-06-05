import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');
const SCENE_H = Math.min(SH * 0.52, 440);

// 3:4 portrait images — fill screen width, center-crop vertically
const IMG_W = SW;
const IMG_H = IMG_W / 0.75;                       // = SW * 4/3 ≈ 520px
const IMG_TOP = -((IMG_H - SCENE_H) / 2) + 20;   // center vertically, slight upward nudge

const BATTERS = [
  require('@/assets/images/batter_1.png'),
  require('@/assets/images/batter_2.png'),
  require('@/assets/images/batter_3.png'),
];

interface Props {
  batterIndex?: number;
  /** Not used for layout anymore — kept for API compat */
  visibleTop?: number;
}

export function BatterScene({ batterIndex = 0 }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Image
        source={BATTERS[batterIndex % BATTERS.length]}
        style={[styles.scene, { top: IMG_TOP }]}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    position: 'absolute',
    left: 0,
    width: IMG_W,
    height: IMG_H,
  },
});
