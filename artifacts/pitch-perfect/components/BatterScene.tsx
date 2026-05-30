import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');
const SCENE_H = Math.min(SH * 0.52, 440);

// 3:4 image — slightly wider than natural ratio to fill the scene better
const IMG_H = SCENE_H;
const IMG_W = Math.min(SW * 0.92, IMG_H * 0.90); // wider crop fills frame

const BATTERS = [
  require('@/assets/images/batter_1.png'),
  require('@/assets/images/batter_2.png'),
  require('@/assets/images/batter_3.png'),
];

interface Props {
  batterIndex?: number;
}

export function BatterScene({ batterIndex = 0 }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {/* Perspective field lines */}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 280"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Infield dirt trapezoid */}
        <Path
          d="M108 280 L282 280 L242 112 L148 112 Z"
          fill="#7B5218"
          opacity={0.38}
        />
        {/* Chalk foul lines */}
        <Line
          x1={0} y1={280} x2={195} y2={112}
          stroke="rgba(255,255,255,0.16)" strokeWidth={1.5}
        />
        <Line
          x1={390} y1={280} x2={195} y2={112}
          stroke="rgba(255,255,255,0.16)" strokeWidth={1.5}
        />
        {/* Pitcher's rubber */}
        <Rect
          x={183} y={267} width={24} height={6} rx={3}
          fill="rgba(255,255,255,0.20)"
        />
      </Svg>

      {/* Batter + catcher illustration */}
      <View style={styles.imageWrap}>
        <Image
          source={BATTERS[batterIndex % BATTERS.length]}
          style={styles.batter}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: IMG_H,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  batter: {
    width: IMG_W,
    height: IMG_H,
  },
});
