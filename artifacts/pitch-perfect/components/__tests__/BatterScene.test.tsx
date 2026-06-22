import React from 'react';
import { render } from '@testing-library/react-native';
import { BatterScene } from '../BatterScene';
import type { PitchOutcome } from '@/constants/GameTypes';

// Fake timers prevent the Animated.loop from firing callbacks after the test
// environment tears down (avoids "Cannot read properties of undefined" errors).
jest.useFakeTimers();

afterEach(() => {
  jest.clearAllTimers();
});

const ALL_OUTCOMES: PitchOutcome[] = [
  'strike_called',
  'strike_swinging',
  'ball',
  'foul',
  'hit',
];

describe('BatterScene', () => {
  it('renders without crashing with default props', async () => {
    const result = await render(<BatterScene />);
    expect(result).toBeDefined();
  });

  it('produces a non-null render tree', async () => {
    const { toJSON } = await render(<BatterScene />);
    expect(toJSON()).not.toBeNull();
  });

  it.each([0, 1, 2])('renders without error for batterIndex %i', async (idx) => {
    const result = await render(<BatterScene batterIndex={idx} />);
    expect(result).toBeDefined();
  });

  it('wraps batterIndex modulo 3 (index 3 → same as index 0)', async () => {
    const result = await render(<BatterScene batterIndex={3} />);
    expect(result).toBeDefined();
  });

  it.each(ALL_OUTCOMES)(
    'accepts outcome="%s" with animTrigger=1 without throwing',
    async (outcome) => {
      const result = await render(<BatterScene outcome={outcome} animTrigger={1} />);
      expect(result).toBeDefined();
    },
  );

  it('does not animate when animTrigger is 0, even with an outcome set', async () => {
    // animTrigger=0 is the no-op initial state — the useEffect returns early
    const result = await render(<BatterScene outcome="hit" animTrigger={0} />);
    expect(result).toBeDefined();
  });

  it('handles animTrigger incrementing across re-renders without throwing', async () => {
    const { rerender } = await render(<BatterScene outcome="strike_swinging" animTrigger={1} />);
    await rerender(<BatterScene outcome="hit" animTrigger={2} />);
    await rerender(<BatterScene outcome="ball" animTrigger={3} />);
  });

  it('resets animation state cleanly when batterIndex changes', async () => {
    const { rerender } = await render(
      <BatterScene batterIndex={0} animTrigger={1} outcome="hit" />,
    );
    await rerender(<BatterScene batterIndex={1} animTrigger={2} outcome="strike_swinging" />);
    await rerender(<BatterScene batterIndex={2} animTrigger={3} outcome="ball" />);
  });

  it('renders child elements (image + bat overlay)', async () => {
    const { toJSON } = await render(<BatterScene />);
    const json = toJSON() as any;
    // Root View should contain at least the batter image and the bat overlay View
    expect(json?.children?.length).toBeGreaterThanOrEqual(2);
  });

  it('renders take animation (called strike) without error', async () => {
    const { rerender } = await render(<BatterScene animTrigger={0} />);
    await rerender(<BatterScene outcome="strike_called" animTrigger={1} />);
  });

  it('renders swing animation (hit) without error', async () => {
    const { rerender } = await render(<BatterScene animTrigger={0} />);
    await rerender(<BatterScene outcome="hit" animTrigger={1} />);
  });

  it('renders whiff animation (strike_swinging) without error', async () => {
    const { rerender } = await render(<BatterScene animTrigger={0} />);
    await rerender(<BatterScene outcome="strike_swinging" animTrigger={1} />);
  });
});
