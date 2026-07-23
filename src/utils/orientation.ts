/**
 * Orientation locking utility.
 *
 * Wraps react-native-orientation-locker to keep the app portrait by default
 * and allow manual landscape toggling in the player screen.
 */
import Orientation from 'react-native-orientation-locker';

/** Lock the current screen to portrait (default state). */
export function lockToPortrait(): void {
  Orientation.lockToPortrait();
}

/** Lock the current screen to landscape (user-toggled in player). */
export function lockToLandscape(): void {
  Orientation.lockToLandscape();
}

/** Unlock all orientation locks (fallback if needed). */
export function unlockAll(): void {
  Orientation.unlockAllOrientations();
}
