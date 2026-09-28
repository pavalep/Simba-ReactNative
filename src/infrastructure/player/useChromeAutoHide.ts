/**
 * V19 W3.5 Phase 3.5.1 — `useChromeAutoHide` hook.
 *
 * Owns the chrome's `opacity: Animated.Value` and the visibility
 * timer. Returns `{opacity, isVisible, toggle, kick}` so the
 * chrome primitive tree can:
 *
 *   - apply `opacity` to every chrome View (TransportBar,
 *     VideoTitleOverlay, ModeControl, CaptionsToggle, PiPToggle,
 *     More) so they fade in / out as a unit
 *   - call `toggle()` from the VideoSurface press handler
 *     (tap-anywhere toggles visibility, per the W3.5 spec)
 *   - call `kick()` from every transport-interaction handler
 *     (seek / skip / pause / mode change re-shows chrome for 3 s)
 *
 * Visibility rules (per TRACKER Phase 3.5.1):
 *
 *   - Pinned visible (immediate, no timer):
 *       videoState ∈ {preparing, paused, buffering, seeking,
 *                      error, finished, idle}
 *   - Auto-hide after 3 s of no input:
 *       videoState === 'playing'
 *   - Tap on VideoSurface (anywhere outside chrome bounds):
 *       toggle visibility (show → hide, hide → show)
 *   - Transport interaction:
 *       kick() → re-show chrome, reset the 3 s timer
 *
 * Animation:
 *   - Hide: 200 ms ease-out (opacity 1 → 0)
 *   - Show: instant (no fade-in delay) — chrome re-appears
 *     immediately so users don't see a delay when they tap.
 *
 * Why a hook (not a Provider): the chrome subtree is small
 * (one TransportBar + a few toggles in Row 3). A Provider
 * pattern would mean every chrome primitive subscribes to
 * the context; a hook keeps the chrome primitive's public
 * surface untouched. W4 will hoist this to the SimbaPlayer
 * shell so the opacity survives navigation; until then the
 * hook is local to the consumer (NowPlayingScreen for W3.5,
 * later SimbaPlayer).
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3 + TRACKER Phase 3.5.1.
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated} from 'react-native';
import {usePlaybackState} from './usePlaybackState';
import {useReduceMotion} from './useReduceMotion';

/**
 * Internal helper — collapses the chrome's `fadeMs === 0` instant
 * branch vs. `Animated.timing(...)` branch. The 3 call sites
 * (the videoState effect, the toggle callback, the kick callback)
 * all need this exact same dispatch; extracting avoids the
 * triple-duplicate jugaad where any future change (e.g. swap
 * to Reanimated) would need three edits.
 */
function scheduleHide(
  opacity: Animated.Value,
  fadeMs: number,
  onComplete: () => void,
): void {
  if (fadeMs === 0) {
    opacity.setValue(0);
    onComplete();
    return;
  }
  Animated.timing(opacity, {
    toValue: 0,
    duration: fadeMs,
    useNativeDriver: true,
  }).start(({finished}) => {
    if (finished) onComplete();
  });
}

export const CHROME_AUTO_HIDE_MS = 3_000;
export const CHROME_HIDE_ANIM_MS = 200;

export interface ChromeAutoHideApi {
  /** Animated.Value 0..1. Apply to chrome primitive opacity. */
  opacity: Animated.Value;
  /** Current visibility — convenience flag for non-Animated consumers. */
  isVisible: boolean;
  /**
   * Toggle visibility. Bound to VideoSurface's onPress.
   * When called on a hidden chrome, fades in (instant).
   * When called on a visible chrome during `playing`,
   * fades out (200 ms).
   */
  toggle: () => void;
  /**
   * Re-show chrome and reset the 3 s hide timer. Called from
   * every transport interaction (seek / skip / pause / mode
   * change). No-op when chrome is pinned visible.
   */
  kick: () => void;
}

/** States where chrome is pinned visible (no auto-hide). */
const PINNED_STATES: ReadonlySet<string> = new Set([
  'idle',
  'preparing',
  'paused',
  'buffering',
  'seeking',
  'error',
  'finished',
]);

function isPinned(videoState: string): boolean {
  return PINNED_STATES.has(videoState);
}

/**
 * Test-only seam: when `__CHROME_NO_TIMER__ === true`, the hook
 * uses no setTimeout so unit tests can advance fake timers
 * synchronously. Defaults to false in production.
 */
let testNoTimer = false;
export function __setChromeNoTimerForTests(value: boolean): void {
  testNoTimer = value;
}

export function useChromeAutoHide(): ChromeAutoHideApi {
  const {videoState} = usePlaybackState();
  // V19 W3.6.8 — fade duration collapses to 0 when the user has
  // enabled the system "reduce motion" accessibility flag (WCAG
  // 2.3.3). Honors the OS-level preference without re-mounting
  // the chrome subtree.
  const reduceMotion = useReduceMotion();
  const fadeMs = reduceMotion ? 0 : CHROME_HIDE_ANIM_MS;
  const opacity = useMemo(() => new Animated.Value(1), []);
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the latest isVisible inside the timer closure without
  // re-creating the timer on every render.
  const visibleRef = useRef(isVisible);
  visibleRef.current = isVisible;

  // Clear any in-flight timer on unmount.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // When videoState changes, decide pinned vs. auto-hide.
  useEffect(() => {
    if (isPinned(videoState)) {
      // Pinned visible - show instantly, clear any pending hide.
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      opacity.setValue(1);
      setIsVisible(true);
      return;
    }
    // videoState === 'playing': start the 3 s auto-hide timer.
    if (testNoTimer) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      scheduleHide(opacity, fadeMs, () => {
        setIsVisible(false);
      });
      timerRef.current = null;
    }, CHROME_AUTO_HIDE_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [videoState, opacity, fadeMs]);

  const toggle = useCallback(() => {
    if (visibleRef.current) {
      // Hide instantly (no 200 ms animation when user explicitly
      // taps to hide - matches YouTube / Netflix behavior).
      opacity.setValue(0);
      setIsVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else {
      // Show instantly (per spec: "show: instant").
      opacity.setValue(1);
      setIsVisible(true);
      // Restart the 3 s timer ONLY when playing (pinned states
      // override the timer; the next videoState change effect
      // will re-derive correctness).
      if (videoState === 'playing') {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          scheduleHide(opacity, fadeMs, () => {
            setIsVisible(false);
          });
          timerRef.current = null;
        }, CHROME_AUTO_HIDE_MS);
      }
    }
  }, [opacity, videoState, fadeMs]);

  const kick = useCallback(() => {
    // Re-show + reset the 3 s timer. No-op during pinned states
    // (the effect will keep visibility = true anyway, but we
    // also need to cancel any pending hide that might be in
    // flight after a recent state transition).
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    opacity.setValue(1);
    setIsVisible(true);
    if (isPinned(videoState) || testNoTimer) return;
    timerRef.current = setTimeout(() => {
      scheduleHide(opacity, fadeMs, () => {
        setIsVisible(false);
      });
      timerRef.current = null;
    }, CHROME_AUTO_HIDE_MS);
  }, [opacity, videoState, fadeMs]);

  return {opacity, isVisible, toggle, kick};
}
