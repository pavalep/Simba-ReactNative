/**
 * The `VideoController` singleton holder — deliberately dependency-free.
 *
 * **Why this file exists.** The controller instance is module-level
 * state, but it used to live inside `useVideoController.ts`, which
 * imports React, the lib (`usePlayer`), and the app stores. Anything
 * that only needed the *instance* therefore had to import the whole
 * React+lib graph:
 *
 *   usePlaybackState → useVideoController → react + lib + stores
 *
 * That is a cycle risk. `usePlaybackState` is itself re-exported by
 * the facade barrel, and the barrel re-exports `useChromeAutoHide`
 * from `useChromeAutoHide`, which imports `usePlaybackState` — so
 * loading the barrel could reach `useChromeAutoHide` before its
 * module had finished initialising, and every re-exported binding
 * read back as `undefined`:
 *
 *   TypeError: Cannot read properties of undefined
 *     (reading 'useChromeAutoHide')
 *
 * Keeping the holder here means the access path is
 * `usePlaybackState → controllerSingleton` with no React, no lib, and
 * no stores, so the cycle cannot form. `useVideoController` (the React
 * binding) imports this file, never the other way round.
 *
 * Architecture source of truth: TRACKER Phase 5.1 + audit §5 Rule 8
 * (the native session is a singleton, so there must be one owner).
 */

import {VideoController} from './VideoController';

let singleton: VideoController | null = null;

/**
 * Read the controller instance, or `null` before the first
 * `useVideoController()` mount.
 *
 * Non-hook by design — see the header. Callers that need the React
 * binding use `useVideoController()`; callers that only need to read
 * or feed the owned state (e.g. `usePlaybackState`) use this.
 */
export function getVideoController(): VideoController | null {
  return singleton;
}

/** Set the singleton. Pass `null` to reset. */
export function setVideoController(next: VideoController | null): void {
  singleton = next;
}
