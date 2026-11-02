/**
 * Orientation locking utility.
 *
 * Wraps react-native-orientation-locker to keep the app portrait by default.
 *
 * The player's own rotation lock does NOT come from here. It goes through the
 * lib's `commands.setOrientation` (see `src/infrastructure/player/`), because
 * this helper's dependency cannot be loaded in jest — register item 68. This
 * module therefore has exactly ONE export and ONE call site: the boot-time
 * portrait lock in `AppContent`.
 *
 * V6 2.1/2.2: react-native-orientation-locker v1.7.0 has two known issues
 * that this wrapper works around:
 *
 *  1. On iOS, calling lockToPortrait() in the same frame as a screen mount
 *     or a rotation toggle is silently dropped. The library's own GitHub
 *     issues recommend a 600ms setTimeout for iOS specifically.
 *     (See: github.com/wonday/react-native-orientation-locker/issues/210)
 *
 *  2. On Android, when the host activity is running under the new React
 *     Native architecture (0.82+), the native call occasionally races
 *     MainActivity.onConfigurationChanged and the lock is reverted within a
 *     frame. A small re-assertion 200ms later keeps the lock stable.
 */
import {Platform} from 'react-native';
import Orientation from 'react-native-orientation-locker';

const IOS_LOCK_DELAY_MS = 600;
const ANDROID_REASSERT_MS = 200;

/** Lock the current screen to portrait (default state). */
export function lockToPortrait(): void {
  if (Platform.OS === 'ios') {
    setTimeout(() => {
      try {
        Orientation.lockToPortrait();
      } catch {
        // orientation module may have been torn down
      }
    }, IOS_LOCK_DELAY_MS);
    return;
  }
  try {
    Orientation.lockToPortrait();
  } catch {
    // ignored
  }
  if (Platform.OS === 'android') {
    setTimeout(() => {
      try {
        Orientation.lockToPortrait();
      } catch {
        // ignored
      }
    }, ANDROID_REASSERT_MS);
  }
}

