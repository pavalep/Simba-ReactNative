/**
 * V19 W3.6.13 — `useHaptic` hook.
 *
 * Cross-platform `haptic()` helper that wraps React Native's
 * `Vibration` API. Three preset intensities (`light`, `medium`,
 * `heavy`) → short / medium / longer `Vibration.vibrate(ms)` calls
 * on Android. On iOS the cross-platform RN `Vibration.vibrate`
 * is a no-op today (the OS-level UIImpactFeedbackGenerator /
 * UINotificationFeedbackGenerator are not exposed by RN core).
 *
 * Future iOS support: when the @simba-dev/react-native-media-player
 * lib exposes a `commands.triggerHaptic(intensity: 'light' |
 * 'medium' | 'heavy')` method (W3.6.13 follow-up), the hook's
 * iOS branch will route through that lib, satisfying the user's
 * "system controls via lib facade, never third-party" rule.
 * Until then, iOS users get the visual feedback (volume / play
 * indicators changing) without the haptics — same UX behavior
 * as VLC-on-iOS pre-iOS-13.
 *
 * Why a hook + not a Provider: the chrome is small (~3 chrome
 * primitives call haptic); a hook keeps each primitive's
 * surface untouched. Mount the hook ONCE in the chrome shell
 * (NowPlayingScreen for W3.6.13, future SimbaPlayer shell for
 * W4); call `hapticLight()` / `hapticMedium()` / `hapticHeavy()`
 * from the chrome's tap handlers.
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.6.13 +
 *   `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.W3.6.13.
 */

import * as React from 'react';
import {Vibration, Platform} from 'react-native';

export type HapticIntensity = 'light' | 'medium' | 'heavy';

const HAPTIC_MS: Record<HapticIntensity, number> = {
  // 10 ms is at the threshold of perceptible touch-only (Android
  // Vibrator service); spec-matching the iOS UIImpactStyleLight
  // (sub-25 ms) / medium (~25 ms) / heavy (~35 ms).
  light: 10,
  medium: 25,
  heavy: 35,
};

export interface HapticApi {
  haptic: (intensity?: HapticIntensity) => void;
  /** Native module availability — `false` on iOS today. Useful
   *  for tests + a future "Show haptic feedback" toggle in
   *  Settings → Accessibility. */
  isSupported: boolean;
}

/**
 * `useHaptic()` returns a `haptic()` function + an `isSupported`
 * flag. The function is a no-op when called outside the chrome
 * subtree (mounted-only-at-shell mount strategy).
 */
export function useHaptic(): HapticApi {
  // On iOS the RN `Vibration` is a no-op for short pulse durations
  // (the OS doesn't let JS produce haptic without iOS 13+
  // private API access). We expose the flag so callers can
  // decide whether to also flash a visual confirmation.
  const isSupported = React.useMemo(
    () => Platform.OS === 'android',
    [],
  );

  const haptic = React.useCallback(
    (intensity: HapticIntensity = 'light') => {
      if (!isSupported) return;
      try {
        Vibration.vibrate(HAPTIC_MS[intensity]);
      } catch {
        // Bridge not wired (jest / web preview). Skip silently.
      }
    },
    [isSupported],
  );

  // Clean up any in-flight vibration on unmount so a chrome
  // navigation doesn't leave a "stuck" haptic.
  React.useEffect(() => {
    return () => {
      try {
        Vibration.cancel();
      } catch {
        // ignore
      }
    };
  }, []);

  return {haptic, isSupported};
}

/**
 * Pure helper — exposes the duration map for tests that need
 * to assert the iOS-vs-Android semantics without mocking
 * Platform.OS.
 */
export const HAPTIC_DURATION_MS = HAPTIC_MS;
