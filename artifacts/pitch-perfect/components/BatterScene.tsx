import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');
const SCENE_H = Math.min(SH * 0.52, 440);

const BATTERS = [
  require('@/assets/images/batter_1.png'),
  require('@/assets/images/batter_2.png'),
  require('@/assets/images/batter_3.png'),
];

interface Props {
  batterIndex?: number;
  /** Top of the visible area (below the HUD card) in scene-relative pixels */
  visibleTop?: number;
}

export function BatterScene({ batterIndex = 0, visibleTop = 148 }: Props) {
  // Size the image to exactly fill the visible portion of the scene (below HUD)
  const visibleH = SCENE_H - visibleTop;
  // 4:3 landscape image — scale by width, capped by visible height
  const imgW = Math.min(SW, visibleH * (4 / 3));
  const imgH = imgW * (3 / 4);
  const imgLeft = (SW - imgW) / 2;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Image
        source={BATTERS[batterIndex % BATTERS.length]}
        style={[styles.scene, { top: visibleTop, left: imgLeft, width: imgW, height: imgH }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    position: 'absolute',
  },
});
