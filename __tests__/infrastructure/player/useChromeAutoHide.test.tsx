/// <reference types="node" />
/**
 * V19 W3.5.1 / W6.1 — chrome visibility.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.5.1 / W6.1.
 *
 * Covers:
 *   - starts visible
 *   - a tap hides, a second tap shows (W6.1: TAP ONLY, no timer)
 *   - nothing hides the chrome on its own, ever
 *   - chrome is pinned visible whenever the video is not playing, and a
 *     tap cannot hide it there
 *   - leaving `playing` re-shows the chrome (pause / buffering / error)
 *   - `kick()` re-shows
 *   - `isVisible` is intent: it flips synchronously, while the fade is
 *     presentation on top
 *   - reduce motion collapses the hide to an instant setValue
 *   - **every consumer shares ONE Animated.Value** (the shipped bug)
 *   - using the hook outside a provider throws
 *
 * The previous suite (20 tests) drove a 3-second timer through a
 * `__setChromeNoTimerForTests` seam. Both the timer and the seam are
 * gone — the chrome is hidden by a tap only — so a timer-testing suite
 * would have been a suite for behaviour that no longer exists.
 *
 * Every test mounts the real `ChromeAutoHideProvider`, because the
 * provider IS the public surface now: rendering the hook bare is
 * exactly the mistake this module documents.
 */

import * as React from 'react';
import {Animated, Text} from 'react-native';
import {act, render, renderHook, screen} from '@testing-library/react-native';
import {
  CHROME_HIDE_ANIM_MS,
  ChromeAutoHideProvider,
  useChromeAutoHide,
} from '../../../src/infrastructure/player/useChromeAutoHide';

// Drive the two inputs the provider reads.
//
// Mocked at their REAL module paths, not at the facade barrel. The
// provider imports `usePlaybackState` and `useReduceMotion` by relative
// path, so a `jest.mock` on the barrel's index never reaches them — the
// barrel is a different module in Jest's registry. The previous suite
// mocked the barrel and the overrides it installed were dead weight.
const mockVideoState: {current: string} = {current: 'preparing'};
let mockReduceMotion = false;

jest.mock('../../../src/infrastructure/player/usePlaybackState', () => ({
  usePlaybackState: () => ({
    videoState: mockVideoState.current,
    isPlaying: mockVideoState.current === 'playing',
    hasSession: mockVideoState.current !== 'idle',
    isBuffering: mockVideoState.current === 'buffering',
    positionMs: 0,
    durationMs: 0,
    isAtEnd: false,
  }),
}));

jest.mock('../../../src/infrastructure/player/useReduceMotion', () => ({
  useReduceMotion: () => mockReduceMotion,
}));

/** Mount the hook the way a real consumer does: under the provider. */
const underProvider = () => {
  const Wrapper = ({children}: {children: React.ReactNode}) => (
    <ChromeAutoHideProvider>{children}</ChromeAutoHideProvider>
  );
  Wrapper.displayName = 'ChromeAutoHideProvider';
  return Wrapper;
};

const renderChrome = () =>
  renderHook(() => useChromeAutoHide(), {wrapper: underProvider()});

/** `Animated.Value` is not readable in the render path; read `_value`. */
const opacityOf = (api: {opacity: unknown}): number =>
  (api.opacity as {_value: number})._value;

describe('chrome visibility — useChromeAutoHide', () => {
  beforeEach(() => {
    mockVideoState.current = 'playing';
    mockReduceMotion = false;
  });

  /**
   * `mockVideoState` is a plain object, not reactive state, so mutating
   * it does not re-render the provider on its own. `rerender` is the
   * explicit "the world changed" signal.
   */
  const goToState = async (
    next: string,
    rerender: (props?: object) => Promise<void>,
  ) => {
    mockVideoState.current = next;
    await act(async () => {
      await rerender({});
    });
  };

  it('starts visible', async () => {
    const {result} = await renderChrome();
    expect(result.current.isVisible).toBe(true);
    expect(result.current.isDismissible).toBe(true);
    expect(opacityOf(result.current)).toBe(1);
  });

  it('a tap hides the chrome, a second tap shows it', async () => {
    const {result} = await renderChrome();

    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.isVisible).toBe(false);

    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.isVisible).toBe(true);
    expect(opacityOf(result.current)).toBe(1);
  });

  /**
   * W6.1 — the product decision this whole rewrite exists for. The old
   * implementation started a 3 s `setTimeout` on every `playing` state
   * and re-armed it from `toggle` and `kick`, so the controls
   * disappeared while the user was still reading the title. There is
   * no timer to fake here; if one is reintroduced, a real 30 s wait
   * must still leave the chrome visible.
   */
  it('never hides the chrome on its own — no timer, however long you wait', async () => {
    jest.useFakeTimers();
    try {
      const {result, rerender} = await renderChrome();
      await goToState('playing', rerender);
      await goToState('buffering', rerender);
      await goToState('playing', rerender);

      // Past any plausible hide delay.
      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      expect(result.current.isVisible).toBe(true);
      expect(opacityOf(result.current)).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  describe.each([
    'preparing',
    'paused',
    'buffering',
    'seeking',
    'error',
    'finished',
    'idle',
  ])('pinned visible while %s', state => {
    it('refuses to hide, and reports itself non-dismissible', async () => {
      const {result, rerender} = await renderChrome();
      await goToState(state, rerender);

      expect(result.current.isDismissible).toBe(false);

      await act(async () => {
        result.current.toggle();
      });
      // A tap must not be able to strand the user without controls.
      expect(result.current.isVisible).toBe(true);
      expect(opacityOf(result.current)).toBe(1);
    });
  });

  it('re-shows when playback leaves `playing`', async () => {
    const {result, rerender} = await renderChrome();
    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.isVisible).toBe(false);

    // A stall must bring the controls back — the old timer never did.
    await goToState('buffering', rerender);
    expect(result.current.isVisible).toBe(true);
    expect(opacityOf(result.current)).toBe(1);
  });

  it('keeps a tapped-into-hidden chrome shown when playback resumes', async () => {
    const {result, rerender} = await renderChrome();
    await act(async () => {
      result.current.toggle();
    });
    await goToState('paused', rerender);
    await goToState('playing', rerender);
    expect(result.current.isVisible).toBe(true);
  });

  it('kick() re-shows a hidden chrome', async () => {
    const {result} = await renderChrome();
    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.isVisible).toBe(false);

    await act(async () => {
      result.current.kick();
    });
    expect(result.current.isVisible).toBe(true);
    expect(opacityOf(result.current)).toBe(1);
  });

  it('kick() is idempotent on a visible chrome', async () => {
    const {result} = await renderChrome();
    await act(async () => {
      result.current.kick();
    });
    expect(result.current.isVisible).toBe(true);
    expect(opacityOf(result.current)).toBe(1);
  });

  /**
   * `isVisible` is INTENT, so it flips the instant the user taps and
   * does not wait for the fade. This is what lets `pointerEvents` be
   * correct: an invisible chrome must stop eating taps immediately,
   * not 200 ms later.
   */
  it('isVisible flips synchronously, before the fade finishes', async () => {
    jest.useFakeTimers();
    try {
      const {result} = await renderChrome();
      await act(async () => {
        result.current.toggle();
      });
      // No timer advanced — the 200 ms fade has not run.
      expect(result.current.isVisible).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  /**
   * The hide is a 200 ms fade to 0, not a jump.
   *
   * Asserted on the ANIMATION CONFIG rather than on the value: the
   * fade runs with `useNativeDriver: true`, and a natively driven
   * animation deliberately does not write back to the JS-side
   * `Animated.Value`, so `_value` stays 1 for the whole fade in jest.
   * Observing it would be observing the test environment, not the
   * behaviour. The synchronous path to 0 is covered by the reduce-motion
   * case below, which is the one that uses `setValue`.
   */
  it('routes an explicit hide through a 200 ms Animated.timing to 0', async () => {
    const spy = jest.spyOn(Animated, 'timing');
    try {
      const {result} = await renderChrome();
      await act(async () => {
        result.current.toggle();
      });
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 0,
          duration: CHROME_HIDE_ANIM_MS,
          useNativeDriver: true,
        }),
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('reduce motion collapses the hide to an instant setValue', async () => {
    mockReduceMotion = true;
    const {result} = await renderChrome();

    await act(async () => {
      result.current.toggle();
    });
    // Synchronously 0, with no animation to wait for (WCAG 2.3.3).
    expect(opacityOf(result.current)).toBe(0);
    expect(result.current.isVisible).toBe(false);
  });

  /**
   * THE regression test.
   *
   * `SimbaPlayer` called `useChromeAutoHide()` for the surface's tap
   * handler AND rendered two `ChromeAutoHideController`s, each of which
   * called it again. Three private copies of the state: the tap toggled
   * an `Animated.Value` that drove no pixels, so tapping the video did
   * not visibly hide the controls, while each visible group ran its own
   * independent timer.
   *
   * Asserted through the provider, because the provider is what makes
   * "one owner, many readers" true.
   */
  it('every consumer under one provider observes the SAME state', async () => {
    const {result, rerender} = await renderHook(
      () => ({
        surface: useChromeAutoHide(),
        controller: useChromeAutoHide(),
      }),
      {wrapper: underProvider()},
    );

    expect(result.current.surface.opacity).toBe(
      result.current.controller.opacity,
    );
    expect(result.current.surface.toggle).toBe(
      result.current.controller.toggle,
    );
    expect(result.current.surface.kick).toBe(result.current.controller.kick);

    // A tap through the surface's reader moves the controller's.
    await act(async () => {
      result.current.surface.toggle();
    });
    await act(async () => {
      await rerender({});
    });
    expect(result.current.controller.isVisible).toBe(false);

    // And back.
    await act(async () => {
      result.current.controller.toggle();
    });
    await act(async () => {
      await rerender({});
    });
    expect(result.current.surface.isVisible).toBe(true);
  });

  it('throws outside a provider rather than silently forking the state', async () => {
    // React logs the throw through console.error during render;
    // silence it so the suite output stays clean.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      // RNTL 14: `renderHook` returns a Promise, so the render error
      // surfaces as a rejection rather than a synchronous throw.
      await expect(
        renderHook(() => useChromeAutoHide()),
      ).rejects.toThrow(/ChromeAutoHideProvider/);
    } finally {
      spy.mockRestore();
    }
  });

  it('renders its children', async () => {
    await render(
      <ChromeAutoHideProvider>
        <Text>chrome</Text>
      </ChromeAutoHideProvider>,
    );
    expect(screen.getByText('chrome')).toBeTruthy();
  });
});
