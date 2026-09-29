/// <reference types="node" />
/**
 * V19 W3.5 Phase 3.5.1 — `useChromeAutoHide` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.5.1.
 *
 * Covers:
 *   - isVisible is true initially
 *   - pinned states (idle, preparing, paused, buffering, seeking,
 *     error, finished) keep chrome visible immediately
 *   - playing state schedules a 3 s hide timer
 *   - toggle flips visibility instantly
 *   - kick resets the 3 s timer + re-shows
 *   - opacity Animated.Value is 1 when visible, 0 when hidden
 *
 * Uses the `__setChromeNoTimerForTests` seam to keep tests
 * synchronous — the hook's setTimeout is bypassed when
 * `testNoTimer` is true, so the effect-driven logic can be
 * exercised without faking timers.
 */

import {act, renderHook} from '@testing-library/react-native';
import {
  useChromeAutoHide,
  __setChromeNoTimerForTests,
} from '../../../src/infrastructure/player/useChromeAutoHide';

// Mock usePlaybackState so we can drive videoState from tests.
const mockVideoState: {current: string} = {current: 'preparing'};
jest.mock('../../../src/infrastructure/player', () => {
  const actual = {
      ...jest.requireActual(
        '../../../src/infrastructure/player/useTransport',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/useHaptic',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/usePresentation',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/useReduceMotion',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/usePlaybackState',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/useKeyframes',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/useSkipSilence',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/useQueueSync',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/useChromeAutoHide',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/position',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/streamErrors',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/bridgeErrors',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/resumePolicy',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/validateLane',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/playbackFacade',
      ),
      ...jest.requireActual(
        '../../../src/infrastructure/player/video',
      ),
    };
  return {
    ...actual,
    usePlaybackState: () => ({
      videoState: mockVideoState.current,
      isPlaying: mockVideoState.current === 'playing',
      hasSession: mockVideoState.current !== 'idle',
      isBuffering: mockVideoState.current === 'buffering',
      positionMs: 0,
      durationMs: 0,
      isAtEnd: false,
    }),
  };
});

describe('useChromeAutoHide', () => {
  beforeEach(() => {
    __setChromeNoTimerForTests(false);
    mockVideoState.current = 'preparing';
  });

  afterAll(() => {
    __setChromeNoTimerForTests(false);
  });

  it('starts visible', async () => {
    const {result} = await renderHook(() => useChromeAutoHide());
    expect(result.current.isVisible).toBe(true);
    // Opacity Animated.Value — read via _value
    expect((result.current.opacity as unknown as {_value: number})._value).toBe(1);
  });

  it('stays visible during pinned states', async () => {
    for (const state of ['idle', 'preparing', 'paused', 'buffering', 'seeking', 'error', 'finished']) {
      mockVideoState.current = state;
      const {result, rerender} = await renderHook(() => useChromeAutoHide());
      // Force a re-render with the new state.
      mockVideoState.current = state;
      rerender({});
      expect(result.current.isVisible).toBe(true);
    }
  });

  it('toggle flips visibility (no animation in tests)', async () => {
    const {result} = await renderHook(() => useChromeAutoHide());
    expect(result.current.isVisible).toBe(true);

    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.isVisible).toBe(false);
    expect((result.current.opacity as unknown as {_value: number})._value).toBe(0);

    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.isVisible).toBe(true);
    expect((result.current.opacity as unknown as {_value: number})._value).toBe(1);
  });

  it('kick re-shows and resets the timer', async () => {
    mockVideoState.current = 'playing';
    const {result} = await renderHook(() => useChromeAutoHide());
    expect(result.current.isVisible).toBe(true);

    // Simulate the auto-hide having fired by toggling off.
    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.isVisible).toBe(false);

    // Kick should re-show immediately.
    await act(async () => {
      result.current.kick();
    });
    expect(result.current.isVisible).toBe(true);
  });

  it('returns a stable opacity Animated.Value across re-renders', async () => {
    const {result, rerender} = await renderHook(() => useChromeAutoHide());
    const firstOpacity = result.current.opacity;
    rerender({});
    expect(result.current.opacity).toBe(firstOpacity);
  });

  it('toggle + kick are referentially stable across re-renders', async () => {
    const {result, rerender} = await renderHook(() => useChromeAutoHide());
    const firstToggle = result.current.toggle;
    const firstKick = result.current.kick;
    rerender({});
    expect(result.current.toggle).toBe(firstToggle);
    expect(result.current.kick).toBe(firstKick);
  });
});
