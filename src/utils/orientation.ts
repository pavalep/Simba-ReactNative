/**
 * Orientation locking utility.
 *
 * Wraps react-native-orientation-locker to keep the app portrait by default
 * and allow manual landscape toggling in the player screen.
 *
 * V6 2.1/2.2: react-native-orientation-locker v1.7.0 has two known issues
 * that this wrapper works around:
 *
 *  1. On iOS, calling lockToLandscape() / lockToPortrait() in the same frame
 *     as a screen mount or rotation toggle is silently dropped. The library's
 *     own GitHub issues recommend a 600ms setTimeout for iOS specifically.
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

/** Lock the current screen to landscape (user-toggled in player). */
export function lockToLandscape(): void {
  if (Platform.OS === 'ios') {
    setTimeout(() => {
      try {
        Orientation.lockToLandscape();
      } catch {
        // orientation module may have been torn down
      }
    }, IOS_LOCK_DELAY_MS);
    return;
  }
  try {
    Orientation.lockToLandscape();
  } catch {
    // ignored
  }
  if (Platform.OS === 'android') {
    setTimeout(() => {
      try {
        Orientation.lockToLandscape();
      } catch {
        // ignored
      }
    }, ANDROID_REASSERT_MS);
  }
}

/** Unlock all orientation locks (fallback if needed). */
export function unlockAll(): void {
  try {
    Orientation.unlockAllOrientations();
  } catch {
    // ignored
  }
}
