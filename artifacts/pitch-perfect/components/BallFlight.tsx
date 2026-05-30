import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface Props {
  visible: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export function BallFlight({ visible, fromX, fromY, toX, toY }: Props) {
  const animX = useRef(new Animated.Value(fromX)).current;
  const animY = useRef(new Animated.Value(fromY)).current;
  const scale = useRef(new Animated.Value(1.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      animX.setValue(fromX);
      animY.setValue(fromY);
      scale.setValue(1.4);
      opacity.setValue(1);

      Animated.parallel([
        Animated.timing(animX, {
          toValue: toX,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animY, {
          toValue: toY,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.55,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(260),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      opacity.setValue(0);
    }
  }, [visible, fromX, fromY, toX, toY]);

  return (
    <Animated.View
      style={[
        styles.ball,
        {
          pointerEvents: 'none',
          opacity,
          transform: [
            { translateX: animX },
            { translateY: animY },
            { scale },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ball: {
    position: 'absolute',
    top: -9,
    left: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFEEAA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
});
