/**
 * V19 W3.5 Phase 3.5.1 — chrome visibility: `ChromeAutoHideProvider`
 * + `useChromeAutoHide()`.
 *
 * Owns the chrome's `opacity: Animated.Value` and visibility state and
 * shares them with every chrome consumer, so the top bar, the title,
 * the overlays and the transport bar fade as ONE unit and a single tap
 * toggles all of them.
 *
 * ## Why this is a Provider and not just a hook
 *
 * It started as a bare hook, and that is what broke it. `SimbaPlayer`
 * called `useChromeAutoHide()` for the `VideoSurface` tap handler and
 * ALSO rendered two `<ChromeAutoHideController>`s, each of which called
 * `useChromeAutoHide()` again. Three independent instances, each with
 * its own `Animated.Value`, its own `isVisible` and its own timer:
 *
 *   - The tap toggled instance #1, whose opacity was applied to
 *     nothing. Tapping the video did not visibly hide the chrome.
 *   - Instances #2 and #3 owned the two visible groups and ran their
 *     own independent 3 s timers, so the title and the transport bar
 *     hid at unrelated moments.
 *
 * A hook that returns *state* is a hook that must be called exactly
 * once. A Provider is the React-native way to express "this state has
 * one owner and many readers", which is what was always meant here —
 * the original docstring already said as much ("W4 will hoist this to
 * the SimbaPlayer shell so the visibility state survives navigation")
 * and the hoist never happened. This is that hoist.
 *
 * ## Why there is no timer
 *
 * W6.1 — per explicit product decision, the chrome is hidden **only by
 * a tap**. The old 3 s `CHROME_AUTO_HIDE_MS` timer is gone: the controls
 * vanished while the user was reading the title, and a player whose
 * controls disappear on their own reads as broken. Industry players
 * (YouTube, Netflix, VLC) keep controls up until the user dismisses
 * them.
 *
 * Consequently there is also no `kick()`-resets-a-timer behaviour, and
 * no `__setChromeNoTimerForTests` seam — a seam that disables a timer
 * that no longer exists is dead code that hides the real design.
 * `kick()` survives with its other purpose: re-showing the chrome after
 * a transport interaction.
 *
 * ## Pinned vs. dismissible
 *
 * `isDismissible` is true only while `videoState === 'playing'`. While
 * paused, buffering, seeking, errored or loading, the chrome is pinned
 * visible: those are precisely the states in which the user needs the
 * controls in order to recover the player, and hiding them would
 * strand them on a black screen.
 *
 * A side effect worth having: a stall (`playing → buffering`) brings
 * the controls back, which is what a user watching a stream expects and
 * which the old timer never did.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3 + TRACKER Phase 3.5.1 / W6.1.
 */

import * as React from 'react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Animated} from 'react-native';
import {usePlaybackState} from './usePlaybackState';
import {useReduceMotion} from './useReduceMotion';

/** Fade duration for an explicit hide. Showing is instant. */
export const CHROME_HIDE_ANIM_MS = 200;

export interface ChromeAutoHideApi {
  /** Animated.Value 0..1. Apply to chrome primitive opacity. */
  opacity: Animated.Value;
  /**
   * V19 W7.5 — the MOTION half of the transition: 0 while shown, 1 while
   * hidden. Each chrome band maps this through its own sign so the
   * header rises as it leaves and the transport bar falls, while both
   * stay driven by the SAME value.
   */
  progress: Animated.Value;
  /**
   * Current visibility — the user's INTENT, not an animation phase. It
   * flips synchronously on toggle, which is what makes it safe for
   * `pointerEvents` to read.
   */
  isVisible: boolean;
  /**
   * Whether the chrome MAY be hidden right now — true only while the
   * video is playing. While false, `toggle()` re-shows instead of
   * hiding and `isVisible` is forced true.
   */
  isDismissible: boolean;
  /**
   * Toggle visibility. Bound to `VideoSurface`'s `onPress`. Shows
   * instantly; hides with a 200 ms fade (0 ms when the user has
   * enabled the OS "reduce motion" setting — WCAG 2.3.3).
   */
  toggle: () => void;
  /**
   * Re-show the chrome. Called from every transport interaction
   * (seek / skip / pause / mode change) so a user who hid the controls
   * gets them back the moment they act on the player.
   */
  kick: () => void;
}

const ChromeAutoHideContext = React.createContext<ChromeAutoHideApi | null>(
  null,
);

export interface ChromeAutoHideProviderProps {
  children: React.ReactNode;
}

/**
 * The single owner of chrome visibility. Mount it once, directly
 * inside the chrome compositor, above every chrome consumer.
 */
export const ChromeAutoHideProvider: React.FC<ChromeAutoHideProviderProps> = ({
  children,
}) => {
  const {videoState} = usePlaybackState();
  // W3.6.8 — honour the OS "reduce motion" accessibility flag
  // (WCAG 2.3.3) without remounting the chrome subtree.
  const reduceMotion = useReduceMotion();
  const fadeMs = reduceMotion ? 0 : CHROME_HIDE_ANIM_MS;

  const opacity = useMemo(() => new Animated.Value(1), []);
  /**
   * V19 W7.5 — the MOTION half of the chrome transition: 0 while shown,
   * 1 while hidden.
   *
   * Why a second value rather than interpolating off `opacity`: the two
   * controllers sit at OPPOSITE edges of the screen, and they must move
   * in opposite directions — the header rises as it leaves, the
   * transport bar falls. One shared value keeps them perfectly in sync
   * (the entire point of this provider, per the module docstring) while
   * each controller maps it through its own sign.
   *
   * A pure opacity fade read as a cross-dissolve of two static images,
   * which is why the chrome felt inert even when it worked. Motion is
   * what makes an element read as leaving the screen rather than
   * blinking out of it.
   *
   * `useNativeDriver` is used by both this and `opacity`, so the whole
   * transition runs on the UI thread and survives a busy JS thread —
   * which matters here, because the busiest moment in the player is
   * exactly when a user is tapping to bring the chrome back.
   */
  const progress = useMemo(() => new Animated.Value(0), []);
  const [isVisible, setIsVisible] = useState(true);

  // See "Pinned vs. dismissible" in the module docstring.
  const isDismissible = videoState === 'playing';

  const show = useCallback(() => {
    // Stop first: without this, an in-flight fade-out keeps writing to
    // the same Animated.Value and would race the setValue below, so
    // the chrome could finish fading to 0 after being re-shown.
    opacity.stopAnimation();
    opacity.setValue(1);
    progress.stopAnimation();
    progress.setValue(0);
    setIsVisible(true);
  }, [opacity, progress]);

  const hide = useCallback(() => {
    // `isVisible` is the user's INTENT, so it flips immediately — not
    // when the fade finishes. Two reasons, both load-bearing:
    //
    //   1. `pointerEvents` reads it. If the chrome kept reporting
    //      "visible" for the 200 ms it was fading out, an invisible
    //      transport bar would still be sitting on the video eating
    //      the taps that were meant to bring the chrome back.
    //   2. A state that only settles when an animation completes is a
    //      state that can settle late, or never (an interrupted
    //      animation never calls back). Intent is discrete; the fade
    //      is presentation on top of it and may be interrupted
    //      without leaving the truth ambiguous.
    setIsVisible(false);
    if (fadeMs === 0) {
      opacity.stopAnimation();
      opacity.setValue(0);
      progress.stopAnimation();
      progress.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: fadeMs,
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: fadeMs,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, progress, fadeMs]);

  // Leaving the dismissible state always re-shows: a paused, buffering
  // or errored player must never hide the controls the user needs.
  useEffect(() => {
    if (!isDismissible) show();
  }, [isDismissible, show]);

  const toggle = useCallback(() => {
    if (!isDismissible) {
      show();
      return;
    }
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isDismissible, isVisible, hide, show]);

  const kick = useCallback(() => {
    show();
  }, [show]);

  const value = useMemo<ChromeAutoHideApi>(
    () => ({opacity, progress, isVisible, isDismissible, toggle, kick}),
    [opacity, progress, isVisible, isDismissible, toggle, kick],
  );

  return (
    <ChromeAutoHideContext.Provider value={value}>
      {children}
    </ChromeAutoHideContext.Provider>
  );
};

/**
 * Read the shared chrome visibility. Safe to call from any number of
 * components: they all observe the SAME `Animated.Value`.
 *
 * Throws outside a provider rather than falling back to a private
 * instance. A silent fallback here is exactly the bug that made
 * tap-to-hide do nothing: a second copy of the state looks like it
 * works and drives no pixels. Failing loudly at mount is cheaper than
 * a control that quietly does the wrong thing.
 */
export function useChromeAutoHide(): ChromeAutoHideApi {
  const api = React.useContext(ChromeAutoHideContext);
  if (api === null) {
    throw new Error(
      'useChromeAutoHide must be used within a ChromeAutoHideProvider',
    );
  }
  return api;
}
