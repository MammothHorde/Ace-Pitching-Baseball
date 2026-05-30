import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { PitchType } from '@/constants/GameTypes';
import {
  GesturePoint,
  GESTURE_TEMPLATES,
  recordedToSvgPath,
  templateToSvgPath,
} from '@/utils/gestureTemplates';
import { useGestureRecognizer } from '@/hooks/useGestureRecognizer';

interface Props {
  pitchType: PitchType;
  enabled: boolean;
  onGestureComplete: (result: { gestureScore: number; speedPxPerMs: number }) => void;
}

const PANEL_HEIGHT = 190;

export function GestureInputPanel({ pitchType, enabled, onGestureComplete }: Props) {
  const [panelSize, setPanelSize] = useState({ width: 280, height: PANEL_HEIGHT });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setPanelSize({ width, height });
  }, []);

  const { panResponder, currentPath, isGesturing } = useGestureRecognizer({
    pitchType,
    enabled,
    onGestureComplete,
  });

  const template = GESTURE_TEMPLATES[pitchType];
  const { width: W, height: H } = panelSize;

  const ghostPath = templateToSvgPath(template, W, H);

  const startX = W / 2;
  const startY = H * 0.1;
  const livePath = recordedToSvgPath(currentPath, startX, startY, W, H);

  const tipDot = ghostPath ? { cx: startX, cy: startY } : null;

  return (
    <View
      style={styles.container}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <Text style={styles.hintText}>{template.hint}</Text>

      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {ghostPath ? (
          <Path
            d={ghostPath}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={3}
            strokeDasharray="8 6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {tipDot && !isGesturing && (
          <Circle
            cx={tipDot.cx}
            cy={tipDot.cy}
            r={7}
            fill="rgba(255,255,255,0.25)"
          />
        )}

        {livePath ? (
          <Path
            d={livePath}
            stroke="#FF4757"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {isGesturing && currentPath.length > 0 && (
          <Circle
            cx={startX + (currentPath[currentPath.length - 1]?.x ?? 0)}
            cy={startY + (currentPath[currentPath.length - 1]?.y ?? 0)}
            r={10}
            fill="#FF4757"
            opacity={0.85}
          />
        )}
      </Svg>

      {!isGesturing && (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>SWIPE TO PITCH</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PANEL_HEIGHT,
    backgroundColor: 'rgba(11,30,61,0.85)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  hintText: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.40)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    zIndex: 1,
  },
  cta: {
    marginBottom: 14,
    paddingHorizontal: 20,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,71,87,0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.35)',
    zIndex: 1,
  },
  ctaText: {
    color: '#FF4757',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
