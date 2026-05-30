import { useRef, useState } from 'react';
import { PanResponder } from 'react-native';
import { PitchType } from '@/constants/GameTypes';
import { GesturePoint, scoreGesture } from '@/utils/gestureTemplates';

interface GestureResult {
  gestureScore: number;
  speedPxPerMs: number;
}

interface UseGestureRecognizerOptions {
  pitchType: PitchType | null;
  enabled: boolean;
  onGestureStart?: () => void;
  onGestureComplete: (result: GestureResult) => void;
}

export function useGestureRecognizer({
  pitchType,
  enabled,
  onGestureStart,
  onGestureComplete,
}: UseGestureRecognizerOptions) {
  const [currentPath, setCurrentPath] = useState<GesturePoint[]>([]);
  const [isGesturing, setIsGesturing] = useState(false);

  const pathRef = useRef<GesturePoint[]>([]);
  const startTimeRef = useRef<number>(0);
  const enabledRef = useRef(enabled);
  const pitchTypeRef = useRef(pitchType);

  enabledRef.current = enabled;
  pitchTypeRef.current = pitchType;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabledRef.current && !!pitchTypeRef.current,
      onMoveShouldSetPanResponder: () => enabledRef.current && !!pitchTypeRef.current,

      onPanResponderGrant: () => {
        pathRef.current = [{ x: 0, y: 0 }];
        startTimeRef.current = Date.now();
        setCurrentPath([{ x: 0, y: 0 }]);
        setIsGesturing(true);
        onGestureStart?.();
      },

      onPanResponderMove: (_evt, gs) => {
        const pt: GesturePoint = { x: gs.dx, y: gs.dy };
        pathRef.current = [...pathRef.current, pt];
        setCurrentPath([...pathRef.current]);
      },

      onPanResponderRelease: () => {
        const pt = pitchTypeRef.current;
        if (!pt) {
          setIsGesturing(false);
          return;
        }
        const duration = Date.now() - startTimeRef.current;
        const { gestureScore, speedPxPerMs } = scoreGesture(pathRef.current, duration, pt);
        setIsGesturing(false);
        setCurrentPath([]);
        pathRef.current = [];
        onGestureComplete({ gestureScore, speedPxPerMs });
      },

      onPanResponderTerminate: () => {
        setIsGesturing(false);
        setCurrentPath([]);
        pathRef.current = [];
      },
    }),
  ).current;

  return { panResponder, currentPath, isGesturing };
}
