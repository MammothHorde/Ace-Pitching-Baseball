import { PitchType } from '@/constants/GameTypes';

export interface GesturePoint {
  x: number;
  y: number;
}

export interface GestureTemplate {
  points: GesturePoint[];
  maxSpeedPxPerMs?: number;
  minSpeedPxPerMs?: number;
  label: string;
  hint: string;
}

export const GESTURE_TEMPLATES: Record<PitchType, GestureTemplate> = {
  fastball: {
    label: 'Fastball',
    hint: 'Swipe straight down — fast!',
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 0.25 },
      { x: 0, y: 0.5 },
      { x: 0, y: 0.75 },
      { x: 0, y: 1 },
    ],
    minSpeedPxPerMs: 0.6,
  },
  curveball: {
    label: 'Curveball',
    hint: 'Arc: top → sweep left → down',
    points: [
      { x: 0, y: 0 },
      { x: -0.15, y: 0.15 },
      { x: -0.35, y: 0.3 },
      { x: -0.5, y: 0.5 },
      { x: -0.4, y: 0.7 },
      { x: -0.2, y: 0.88 },
      { x: 0, y: 1 },
    ],
  },
  slider: {
    label: 'Slider',
    hint: 'Swipe diagonally down-right',
    points: [
      { x: 0, y: 0 },
      { x: 0.2, y: 0.3 },
      { x: 0.45, y: 0.6 },
      { x: 0.7, y: 1 },
    ],
  },
  changeup: {
    label: 'Changeup',
    hint: 'Slow swipe straight down',
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 0.25 },
      { x: 0, y: 0.5 },
      { x: 0, y: 0.75 },
      { x: 0, y: 1 },
    ],
    maxSpeedPxPerMs: 0.55,
  },
  splitter: {
    label: 'Splitter',
    hint: 'Down then flare outward',
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 0.3 },
      { x: 0, y: 0.55 },
      { x: 0.12, y: 0.72 },
      { x: 0.28, y: 0.87 },
      { x: 0.4, y: 1 },
    ],
  },
  cutter: {
    label: 'Cutter',
    hint: 'Swipe diagonally down-left',
    points: [
      { x: 0, y: 0 },
      { x: -0.2, y: 0.3 },
      { x: -0.45, y: 0.6 },
      { x: -0.7, y: 1 },
    ],
  },
};

function resample(points: GesturePoint[], n: number): GesturePoint[] {
  if (points.length < 2) {
    return Array.from({ length: n }, () => ({ ...points[0] ?? { x: 0, y: 0 } }));
  }

  const totalLen = points.reduce((acc, pt, i) => {
    if (i === 0) return acc;
    const prev = points[i - 1];
    return acc + Math.hypot(pt.x - prev.x, pt.y - prev.y);
  }, 0);

  if (totalLen === 0) {
    return Array.from({ length: n }, () => ({ ...points[0] }));
  }

  const interval = totalLen / (n - 1);
  const resampled: GesturePoint[] = [{ ...points[0] }];
  let accumulated = 0;
  let segStart = 0;

  for (let i = 1; i < points.length && resampled.length < n; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const segLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    let remaining = accumulated + segLen;

    while (remaining >= interval && resampled.length < n) {
      const t = (interval - accumulated) / segLen;
      resampled.push({
        x: prev.x + (curr.x - prev.x) * t,
        y: prev.y + (curr.y - prev.y) * t,
      });
      accumulated = 0;
      remaining -= interval;
    }
    accumulated = remaining;
    segStart = i;
  }

  while (resampled.length < n) {
    resampled.push({ ...points[points.length - 1] });
  }
  return resampled;
}

function normalize(points: GesturePoint[]): GesturePoint[] {
  if (points.length === 0) return points;
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const span = Math.max(maxX - minX, maxY - minY, 0.001);
  return points.map(p => ({
    x: (p.x - minX) / span,
    y: (p.y - minY) / span,
  }));
}

const N = 20;

export function scoreGesture(
  recorded: GesturePoint[],
  durationMs: number,
  pitchType: PitchType,
): { gestureScore: number; speedPxPerMs: number } {
  const template = GESTURE_TEMPLATES[pitchType];

  if (recorded.length < 3) {
    return { gestureScore: 0, speedPxPerMs: 0 };
  }

  const rawTemplateResampled = resample(template.points, N);
  const rawRecordedResampled = resample(recorded, N);

  const normTemplate = normalize(rawTemplateResampled);
  const normRecorded = normalize(rawRecordedResampled);

  let totalDist = 0;
  for (let i = 0; i < N; i++) {
    totalDist += Math.hypot(
      normRecorded[i].x - normTemplate[i].x,
      normRecorded[i].y - normTemplate[i].y,
    );
  }
  const avgDist = totalDist / N;

  let shapeScore = Math.max(0, 1 - avgDist * 1.6);

  const last = recorded[recorded.length - 1];
  const pathLength = recorded.reduce((acc, pt, i) => {
    if (i === 0) return acc;
    const prev = recorded[i - 1];
    return acc + Math.hypot(pt.x - prev.x, pt.y - prev.y);
  }, 0);
  const speedPxPerMs = durationMs > 0 ? pathLength / durationMs : 0;

  let speedPenalty = 0;
  if (template.maxSpeedPxPerMs !== undefined && speedPxPerMs > template.maxSpeedPxPerMs) {
    const overshoot = (speedPxPerMs - template.maxSpeedPxPerMs) / template.maxSpeedPxPerMs;
    speedPenalty = Math.min(0.5, overshoot * 0.5);
  }
  if (template.minSpeedPxPerMs !== undefined && speedPxPerMs < template.minSpeedPxPerMs) {
    const undershoot = (template.minSpeedPxPerMs - speedPxPerMs) / template.minSpeedPxPerMs;
    speedPenalty = Math.min(0.4, undershoot * 0.4);
  }

  const gestureScore = Math.max(0, Math.min(1, shapeScore - speedPenalty));
  return { gestureScore, speedPxPerMs };
}

export function gestureQualityLabel(score: number): string {
  if (score >= 0.78) return 'Perfect!';
  if (score >= 0.50) return 'Good';
  return 'Wild!';
}

export function templateToSvgPath(
  template: GestureTemplate,
  panelWidth: number,
  panelHeight: number,
): string {
  const padX = panelWidth * 0.15;
  const padY = panelHeight * 0.1;
  const drawW = panelWidth - padX * 2;
  const drawH = panelHeight - padY * 2;
  const cx = panelWidth / 2;
  const topY = padY;

  const pts = template.points.map(p => ({
    svgX: cx + p.x * drawW * 0.5,
    svgY: topY + p.y * drawH,
  }));

  if (pts.length === 0) return '';
  let d = `M ${pts[0].svgX} ${pts[0].svgY}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].svgX} ${pts[i].svgY}`;
  }
  return d;
}

export function recordedToSvgPath(
  recorded: GesturePoint[],
  startX: number,
  startY: number,
  panelWidth: number,
  panelHeight: number,
): string {
  if (recorded.length < 2) return '';
  const pts = recorded.map(p => ({
    svgX: startX + p.x,
    svgY: startY + p.y,
  }));
  let d = `M ${pts[0].svgX} ${pts[0].svgY}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].svgX} ${pts[i].svgY}`;
  }
  return d;
}
