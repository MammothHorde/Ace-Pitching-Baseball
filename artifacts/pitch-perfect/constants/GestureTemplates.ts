import { PitchType } from './GameTypes';

export type GesturePoint = [number, number]; // normalized [x, y] in 0–1 space

export interface GestureTemplate {
  points: GesturePoint[];
  description: string;
  cue: string;
  color: string;
}

export const GESTURE_TEMPLATES: Record<PitchType, GestureTemplate> = {
  fastball: {
    points: [[0.50, 0.06], [0.50, 0.94]],
    description: 'Straight down — fire it in!',
    cue: 'FAST STRAIGHT',
    color: '#FF4757',
  },
  curveball: {
    points: [[0.25, 0.08], [0.82, 0.38], [0.76, 0.92]],
    description: 'Arc from inside corner down',
    cue: 'SWEEP ARC',
    color: '#2ED573',
  },
  slider: {
    points: [[0.82, 0.08], [0.18, 0.92]],
    description: 'Slash diagonally down-left',
    cue: 'SLASH ↙',
    color: '#1E90FF',
  },
  changeup: {
    points: [[0.50, 0.12], [0.84, 0.32], [0.84, 0.68], [0.50, 0.88], [0.16, 0.68], [0.16, 0.32], [0.50, 0.12]],
    description: 'Draw a slow full circle',
    cue: 'CIRCLE',
    color: '#FFCC00',
  },
  splitter: {
    points: [[0.50, 0.08], [0.50, 0.52], [0.20, 0.92]],
    description: 'Down then fork left',
    cue: 'FORK ↙',
    color: '#A855F7',
  },
  cutter: {
    points: [[0.18, 0.08], [0.82, 0.92]],
    description: 'Sharp slash diagonally down-right',
    cue: 'CUT ↘',
    color: '#FF8C00',
  },
};
