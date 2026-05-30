import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { PitchType } from '@/constants/GameTypes';
import { GesturePoint, GESTURE_TEMPLATES } from '@/constants/GestureTemplates';

// ─── Path helpers ───────────────────────────────────────────────────────────

function buildGuidePath(pts: GesturePoint[], w: number, h: number): string {
  if (pts.length < 2) return '';
  const sc = pts.map(([x, y]) => ({ x: x * w, y: y * h }));
  if (sc.length === 2) return `M${sc[0].x},${sc[0].y} L${sc[1].x},${sc[1].y}`;
  let d = `M${sc[0].x},${sc[0].y}`;
  for (let i = 1; i < sc.length; i++) {
    const a = sc[Math.max(0, i - 2)];
    const b = sc[i - 1];
    const c = sc[i];
    const dd = sc[Math.min(sc.length - 1, i + 1)];
    const cp1x = b.x + (c.x - a.x) / 6;
    const cp1y = b.y + (c.y - a.y) / 6;
    const cp2x = c.x - (dd.x - b.x) / 6;
    const cp2y = c.y - (dd.y - b.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${c.x},${c.y}`;
  }
  return d;
}

function buildDrawnPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q${pts[i].x},${pts[i].y} ${mx},${my}`;
  }
  const last = pts[pts.length - 1];
  d += ` L${last.x},${last.y}`;
  return d;
}

function resamplePath(points: GesturePoint[], n: number): GesturePoint[] {
  if (points.length === 0) return Array(n).fill([0.5, 0.5] as GesturePoint);
  if (points.length === 1) return Array(n).fill(points[0]);
  let totalLen = 0;
  for (let i = 1; i < points.length; i++) {
    totalLen += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  if (totalLen === 0) return Array(n).fill(points[0]);
  const interval = totalLen / (n - 1);
  const result: GesturePoint[] = [points[0]];
  let accum = 0;
  let j = 0;
  for (let t = 1; t < n - 1; t++) {
    const target = t * interval;
    while (j < points.length - 2) {
      const seg = Math.hypot(points[j + 1][0] - points[j][0], points[j + 1][1] - points[j][1]);
      if (accum + seg >= target) {
        const frac = (target - accum) / seg;
        result.push([
          points[j][0] + frac * (points[j + 1][0] - points[j][0]),
          points[j][1] + frac * (points[j + 1][1] - points[j][1]),
        ]);
        break;
      }
      accum += seg;
      j++;
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

// ─── Gesture scoring ────────────────────────────────────────────────────────

function scoreGesture(
  drawn: { x: number; y: number }[],
  template: GesturePoint[],
  w: number,
  h: number,
  durationMs: number,
): { power: number; accuracy: number } {
  if (drawn.length < 4) return { power: 0.15, accuracy: 0.10 };

  // Power: path speed relative to canvas diagonal
  let pathLen = 0;
  for (let i = 1; i < drawn.length; i++) {
    pathLen += Math.hypot(drawn[i].x - drawn[i - 1].x, drawn[i].y - drawn[i - 1].y);
  }
  const diag = Math.hypot(w, h);
  const speedFactor = durationMs > 50 ? Math.min(1.4, diag / durationMs * 750) : 1;
  const power = Math.max(0.1, Math.min(1, (pathLen / (diag * 0.65)) * speedFactor));

  // Accuracy: normalize drawn path, compare to template
  const normDrawn: GesturePoint[] = drawn.map(p => [p.x / w, p.y / h]);

  // Direction score: overall angle drawn vs template
  const dxD = normDrawn[normDrawn.length - 1][0] - normDrawn[0][0];
  const dyD = normDrawn[normDrawn.length - 1][1] - normDrawn[0][1];
  const dxT = template[template.length - 1][0] - template[0][0];
  const dyT = template[template.length - 1][1] - template[0][1];
  const magD = Math.hypot(dxD, dyD);
  const magT = Math.hypot(dxT, dyT);
  let dirScore: number;

  // Changeup: closed-loop check (end near start)
  const isLoop = template.length >= 5 &&
    Math.hypot(template[0][0] - template[template.length - 1][0],
               template[0][1] - template[template.length - 1][1]) < 0.15;
  if (isLoop) {
    const closureDist = Math.hypot(
      normDrawn[0][0] - normDrawn[normDrawn.length - 1][0],
      normDrawn[0][1] - normDrawn[normDrawn.length - 1][1],
    );
    dirScore = Math.max(0, 1 - closureDist * 3);
  } else if (magD < 0.05 || magT < 0.05) {
    dirScore = 0.5;
  } else {
    const dot = (dxD / magD) * (dxT / magT) + (dyD / magD) * (dyT / magT);
    dirScore = (dot + 1) / 2; // map [-1,1] → [0,1]
  }

  // Path similarity: resample both to 8 points, compare
  const r8Drawn = resamplePath(normDrawn, 8);
  const r8Template = resamplePath(template, 8);
  let totalDist = 0;
  for (let i = 0; i < 8; i++) {
    totalDist += Math.hypot(r8Drawn[i][0] - r8Template[i][0], r8Drawn[i][1] - r8Template[i][1]);
  }
  const pathScore = Math.max(0, 1 - (totalDist / 8) * 2.2);

  // Combined (direction matters more than exact path)
  const accuracy = Math.min(1, dirScore * 0.60 + pathScore * 0.40);
  return { power, accuracy };
}

function feedbackLabel(accuracy: number): string {
  if (accuracy >= 0.84) return '🎯 Perfect release!';
  if (accuracy >= 0.68) return '⚡ Great pitch!';
  if (accuracy >= 0.50) return '👍 Solid throw';
  if (accuracy >= 0.30) return '↗️  Off-target';
  return '💨 Wild pitch!';
}

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  pitchType: PitchType;
  onComplete: (power: number, accuracy: number) => void;
}

export function GestureCanvas({ pitchType, onComplete }: Props) {
  const tmpl = GESTURE_TEMPLATES[pitchType];

  const [pathStr, setPathStr] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [cSize, setCSize] = useState({ w: 300, h: 150 });

  // Refs (used inside PanResponder — no stale closures)
  const viewRef = useRef<View>(null);
  const drawnPts = useRef<{ x: number; y: number }[]>([]);
  const hasCompleted = useRef(false);
  const isDrawingRef = useRef(false);
  const cSizeRef = useRef({ w: 300, h: 150 });
  const startTimeRef = useRef(0);
  const frameRef = useRef(0);

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    cSizeRef.current = { w: width, h: height };
    setCSize({ w: width, h: height });
  }

  function addPoint(lx: number, ly: number) {
    drawnPts.current.push({ x: lx, y: ly });
    frameRef.current++;
    if (frameRef.current % 2 === 0) {
      setPathStr(buildDrawnPath(drawnPts.current));
    }
  }

  function finishGesture() {
    if (hasCompleted.current || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (drawnPts.current.length < 4) {
      drawnPts.current = [];
      setPathStr('');
      return;
    }
    hasCompleted.current = true;
    const duration = Date.now() - startTimeRef.current;
    setPathStr(buildDrawnPath(drawnPts.current));
    setIsDone(true);
    const { power, accuracy } = scoreGesture(
      drawnPts.current, tmpl.points, cSizeRef.current.w, cSizeRef.current.h, duration,
    );
    setFeedback(feedbackLabel(accuracy));
    setTimeout(() => onComplete(power, accuracy), 360);
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !hasCompleted.current,
      onMoveShouldSetPanResponder: () => !hasCompleted.current,
      onPanResponderGrant: e => {
        if (hasCompleted.current) return;
        drawnPts.current = [];
        frameRef.current = 0;
        isDrawingRef.current = true;
        startTimeRef.current = Date.now();
        setPathStr('');
        addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderMove: e => {
        if (!isDrawingRef.current) return;
        addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderRelease: finishGesture,
      onPanResponderTerminate: finishGesture,
    }),
  ).current;

  const { w, h } = cSize;
  const guidePath = buildGuidePath(tmpl.points, w, h);
  const startX = tmpl.points[0][0] * w;
  const startY = tmpl.points[0][1] * h;
  const endX = tmpl.points[tmpl.points.length - 1][0] * w;
  const endY = tmpl.points[tmpl.points.length - 1][1] * h;

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: tmpl.color + '28', borderColor: tmpl.color + '70' }]}>
          <Text style={[styles.badgeText, { color: tmpl.color }]}>
            {tmpl.cue}
          </Text>
        </View>
        <Text style={styles.desc}>{tmpl.description}</Text>
      </View>

      {/* Drawing canvas */}
      <View
        ref={viewRef}
        style={styles.canvas}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          {/* Guide path (dashed) */}
          <Path
            d={guidePath}
            stroke={tmpl.color}
            strokeWidth={3}
            strokeDasharray="10 7"
            strokeLinecap="round"
            fill="none"
            opacity={isDone ? 0.12 : 0.40}
          />
          {/* START dot + label */}
          <Circle
            cx={startX} cy={startY} r={9}
            fill={tmpl.color}
            opacity={isDone ? 0.15 : 0.80}
          />
          <SvgText
            x={startX} y={startY - 14}
            textAnchor="middle"
            fill="rgba(255,255,255,0.45)"
            fontSize={8}
            fontWeight="bold"
          >
            START
          </SvgText>
          {/* END ring */}
          <Circle
            cx={endX} cy={endY} r={7}
            fill="none"
            stroke={tmpl.color}
            strokeWidth={2}
            opacity={isDone ? 0.12 : 0.55}
          />
          {/* Drawn path */}
          <Path
            d={pathStr}
            stroke={tmpl.color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>

        {/* Idle hint */}
        {!pathStr && !isDone && (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>Trace the path to pitch</Text>
          </View>
        )}

        {/* Feedback overlay after gesture */}
        {isDone && (
          <View style={styles.feedbackOverlay} pointerEvents="none">
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(11,30,61,0.92)',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  desc: {
    flex: 1,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '600',
  },
  canvas: {
    flex: 1,
    minHeight: 140,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
  },
  hint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.22)',
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,30,61,0.72)',
    borderRadius: 12,
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
});
