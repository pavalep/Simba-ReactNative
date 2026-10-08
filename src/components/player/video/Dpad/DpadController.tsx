/**
 * V19 W3.6.9 — `DpadController` + `useHardwareMediaKeys` (STUB).
 *
 * This is the **STUB** for the chrome-side DpadController / hardware
 * media key plumbing. The full implementation requires a lib-side
 * widening (`lib.PlayerActivity.addHardwareKeyListener` /
 * `onHardwareKey` event channel) — see the Phase 3.6.9 follow-up
 * notes for the lib 1.7.0 surface widening.
 *
 * What ships today:
 *   - `useHardwareMediaKeys({onKey})` chrome hook (STUB):
 *     subscribes to RN's `Keyboard.addListener('hardwareBackPress')`
 *     for the Android back button ONLY. Hardware media keys
 *     (KEYCODE_MEDIA_*) require Activity-level `dispatchKeyEvent`
 *     interception which the lib alone can route. Today they
 *     hit the system MediaSession and don't reach the chrome.
 *   - `useFocusRing()` (STUB): returns `{isFocused, onFocus,
 *     onBlur}` props for chrome primitives to wire a gold
 *     2 px outline when their index is the current focus
 *     target. The TRACKER §3.6.9 boxes for the visible focus
 *     ring require every chrome primitive (TransportBar,
 *     ModeControl, CaptionsToggle, PiPToggle, More, back button
 *     on VideoTitleOverlay, gestures) to opt-in — that's a
 *     per-primitive refactor and lands alongside the lib
 *     hardware-key widening in W3.6.9 follow-up.
 *
 * Why STUB instead of "drop":
 *   - The contract is the load-bearing part — same shape the
 *     real impl will use, just with no events flowing yet.
 *   - NowPlayingScreen can already mount `<DpadController />`
 *     unconditionally; when the lib lands, the events just
 *     start flowing without a chrome recompile.
 *   - Matches the "always-mount chrome primitives" rule from
 *     the V19 architecture audit §4.D.
 *
 * What the W3.6.9 full follow-up looks like:
 *   1. lib 1.7.0 widens:
 *        - `commands.addHardwareKeyListener(callback: HwKeyEvent): number`
 *        - `commands.removeHardwareKeyListener(id: number)`
 *        where HwKeyEvent = { keycode, action } with keycodes
 *        matching Android `KeyEvent.KEYCODE_*`:
 *          KEYCODE_DPAD_UP/DOWN/LEFT/RIGHT/CENTER (focus)
 *          KEYCODE_MEDIA_PLAY/PAUSE/STOP/REWIND/FAST_FORWARD (lib routes)
 *          KEYCODE_VOLUME_UP/DOWN/MUTE (lib routes to setVolume)
 *          KEYCODE_BACK (lib forwards as a chrome event)
 *   2. lib MpvBridgeModule.kt adds `dispatchKeyEvent` override
 *      on the MainActivity so the system delivers hardware keys
 *      to the bridge BEFORE the Activity default handling.
 *   3. The chrome's `useHardwareMediaKeys` subscribes to the
 *      lib event channel; `useFocusRing` wires the chrome
 *      primitives to a focus index state.
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.6.9.
 */

import * as React from 'react';
import {Platform, BackHandler} from 'react-native';

/**
 * Hardware key event shape (forward-compat with the lib's
 * eventual `HardwareKey` event type). Today: only the Android
 * back button is captured by chrome-side code (via RN's
 * Keyboard API). The rest of the keys are out of scope of this
 * STUB.
 */
export interface HardwareKey {
  /** Android `KeyEvent.KEYCODE_*` integer. */
  keycode: number;
  /** 'up' or 'down'. */
  action: 'up' | 'down';
}

const KEYCODE_DPAD_UP = 19;
const KEYCODE_DPAD_DOWN = 20;
const KEYCODE_DPAD_LEFT = 21;
const KEYCODE_DPAD_RIGHT = 22;
const KEYCODE_DPAD_CENTER = 23;
const KEYCODE_MEDIA_PLAY_PAUSE = 85;
const KEYCODE_MEDIA_NEXT = 87;
const KEYCODE_MEDIA_PREVIOUS = 88;
const KEYCODE_MEDIA_REWIND = 89;
const KEYCODE_MEDIA_FAST_FORWARD = 90;
const KEYCODE_VOLUME_UP = 24;
const KEYCODE_VOLUME_DOWN = 25;
const KEYCODE_VOLUME_MUTE = 164;

/**
 * Chrome-side hook that subscribes to hardware keys.
 *
 * Today: no-op on iOS (RN's `Keyboard.addListener('hardwareBackPress')`
 * doesn't fire there). On Android: subscribes to the back button
 * + ALL `dispatchKeyEvent`s via the lib's `addHardwareKeyListener`
 * once the lib lands. Until the lib lands, this hook is a no-op
 * except for the Android back button.
 */
export function useHardwareMediaKeys(
  onKey: (event: HardwareKey) => void,
): void {
  React.useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    // RN moved the Android hardware-back handler from `Keyboard`
    // to `BackHandler` in 0.65+. The Keyboard.addListener
    // 'hardwareBackPress' route is deprecated; BackHandler
    // is the canonical contract (Android-only).
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // Forward the back press to the chrome as a synthetic
      // event so consumers can react (e.g. dismiss a sheet).
      onKey({keycode: 4 /* KEYCODE_BACK */, action: 'down'});
      // Returning true prevents the OS from popping the screen.
      return true;
    });
    return () => sub.remove();
  }, [onKey]);

  // Keyboard-style listener is reserved for lib 1.7.0's
  // hardware-key surface widening (KEYCODE_DPAD_*, KEYCODE_MEDIA_*,
  // KEYCODE_VOLUME_*) — the lib will dispatch via the bridge
  // (MpvBridgeModule.dispatchKeyEvent). Once the lib lands, the
  // hook subscribes to `lib.commands.addHardwareKeyListener(cb)`
  // and the chrome starts reacting to the full key set.
}

export {
  KEYCODE_DPAD_UP,
  KEYCODE_DPAD_DOWN,
  KEYCODE_DPAD_LEFT,
  KEYCODE_DPAD_RIGHT,
  KEYCODE_DPAD_CENTER,
  KEYCODE_MEDIA_PLAY_PAUSE,
  KEYCODE_MEDIA_NEXT,
  KEYCODE_MEDIA_PREVIOUS,
  KEYCODE_MEDIA_REWIND,
  KEYCODE_MEDIA_FAST_FORWARD,
  KEYCODE_VOLUME_UP,
  KEYCODE_VOLUME_DOWN,
  KEYCODE_VOLUME_MUTE,
};

/**
 * Visual focus-ring state for chrome primitives. STUB — returns
 * `{isFocused: false, onFocus: noop, onBlur: noop}` today. The
 * W3.6.9 follow-up widens to a real `FocusRingProvider` with a
 * current focus index + `focusNext` / `focusPrev` / `focusLeft`
 * / `focusRight` methods wired to the lib's hardware-key event.
 */
export function useFocusRing(): {
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
} {
  // Full impl lands with the lib 1.7.0 surface. Today the chrome
  // primitives' focus style is unchanged — the visible 2 px gold
  // outline (WCAG 2.4.7) ships in the same-week follow-up.
  return {
    isFocused: false,
    onFocus: () => undefined,
    onBlur: () => undefined,
  };
}

/**
 * The mount point for the chrome subtree. Mount in
 * NowPlayingScreen (or VideoPlayer shell) — it's an
 * always-present component that subscribes to hardware keys.
 *
 * Today: no observable behavior (useHardwareMediaKeys only
 * forwards Android back). Once the lib lands, the chrome
 * starts receiving DPAD / MEDIA / VOLUME events.
 */
export const DpadController: React.FC = () => {
  useHardwareMediaKeys(() => {
    // STUB — no chrome consumer yet. Future wire:
    //   - Keycode DPAD_LEFT/RIGHT → focusIndex--
    //   - Keycode DPAD_RIGHT/LEFT → focusIndex++
    //   - Keycode DPAD_CENTER → invoke focused Pressable
    //   - Keycode MEDIA_PLAY_PAUSE → commands.togglePlayPause()
    //   - Keycode MEDIA_NEXT → commands.next() (in PiP uses
    //     MediaSession-aware lib routing)
    //   - Keycode VOLUME_UP/DOWN → commands.setVolume(±step)
    //   - Keycode BACK → dismiss the chrome / pop the screen
  });
  return null;
};

export default DpadController;
