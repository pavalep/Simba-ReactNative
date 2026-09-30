/**
 * V19 W1 — `usePlaybackState()` hook.
 *
 * The chrome's single read surface for playback state.
 *
 * **State ownership (W5/W6 cleanup).** The `videoState` enum used
 * to exist TWICE — this hook derived
 * `idle | preparing | playing | paused | seeking | buffering |
 * finished | error` from the lib, while the `VideoController`
 * separately tracked `idle | loading | ready | playing | paused |
 * finished | error`. Two owners, two vocabularies, and they
 * disagreed on exactly the states the chrome reacts to.
 *
 * Now: the **controller owns the phase** (TRACKER 5.1), and this
 * hook is the bridge that (a) reads the raw lib values, (b) feeds
 * the controller the real observation, and (c) reads the single
 * owned phase back out. When no controller is mounted (isolated
 * unit tests that mock only the lib), it falls back to its own
 * derivation so the hook stays independently testable.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §5.4 + audit doc §3.G + `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md`
 * Phase 5.1.
 */

import {useEffect, useSyncExternalStore} from 'react';
import {useIsPlayerActivity, usePlayer, usePlayerProgress} from '@simba-dev/react-native-media-player';
// Import the DEPENDENCY-FREE singleton holder, not `useVideoController`
// (which pulls in React + the lib + the app stores). Routing through
// the barrel from here forms the cycle
//   barrel → useChromeAutoHide → usePlaybackState → useVideoController
// whose re-exported bindings then read back as `undefined`
// ("Cannot read properties of undefined (reading
// 'CHROME_AUTO_HIDE_MS')"). See `video/controllerSingleton.ts`.
import {getVideoController} from './video/controllerSingleton';
import type {VideoState} from './video/VideoController';

export type {VideoState};

export interface PlaybackStateDerived {
  videoState: VideoState;
  isPlaying: boolean;
  hasSession: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
  /** True when the position is within 500 ms of the duration. */
  isAtEnd: boolean;
  /**
   * The raw lib failure, or `null` when there isn't one.
   *
   * The lib types this as
   * `{code, codeName?, recoverable, message} | null` and clears it
   * on the next `onFileLoaded`. It is exposed (rather than only
   * being collapsed into `videoState === 'error'`) so
   * `VideoErrorOverlay` can run it through `classifyError()` and
   * show the copy the classifier prescribes, instead of the
   * hardcoded "Connection problem" the W1 stub used to render for
   * every failure.
   */
  error: unknown;
}

/**
 * Hook that derives playback state from the lib and keeps the
 * `VideoController` in sync.
 *
 * Derivation rules for the *observation* fed to the controller
 * (SPEC §6 playback axis):
 *  - `error`     — lib reported a failure (`state.error !== null`)
 *  - `buffering` — `usePlayerProgress().isBuffering === true`
 *  - `playing`   — `state.isPlaying === true`
 *  - `idle`      — no session
 *  - `finished`  — has session, !isPlaying, position ≈ duration
 *  - `paused`    — has session, !isPlaying, position > 0
 *  - `preparing` — has session, !isPlaying, at position 0
 */
export function usePlaybackState(): PlaybackStateDerived {
  const {state} = usePlayer();
  const progress = usePlayerProgress();
  // V19 W6.0 (lib 1.7.0) — synchronous, idempotent "is there a player
  // surface under this tree?". Not a subscription: the value is fixed
  // for the lifetime of an activity's React tree.
  const isPlayerActivity = useIsPlayerActivity();

  // **Session detection is structural, not title-based.**
  //
  // This used to be `!!state.title`, i.e. "a session exists iff a
  // title string is non-empty". That is a proxy, not a fact: an
  // untagged local file, a stream with no metadata, or a title that
  // failed to load would all read as `idle` while genuinely
  // playing — which suppresses the loading overlay and can hide a
  // real failure. The lib already exposes the structural truth on
  // `PlayerState`: a valid `currentIndex` into a non-empty
  // `playlist`.
  //
  // W6.0: the previous version also accepted `|| !!state.title` as a
  // fallback for a playlist-less `loadFile` session. That made
  // `hasSession` CONSTANTLY TRUE — the lib's `DEFAULT_STATE.title` is
  // the non-empty placeholder `'Simba Player'`, so the fallback
  // matched before a single file was ever loaded. With `hasSession`
  // pinned true, `observed` could never be `'idle'`, which meant the
  // state machine believed a session existed while the app was idle
  // in MainActivity, and the `hasNothingToPlay` guard in the V19
  // `SimbaPlayer` could never fire.
  //
  // The placeholder title is not a usable signal, and string-matching
  // it would duplicate a lib internal the app cannot import
  // (`DEFAULT_STATE` is not part of the lib's public surface). So the
  // structural question is answered structurally instead: the native
  // side knows which activity hosts a player surface, and lib 1.7.0
  // exposes that as a synchronous predicate.
  const hasPlaylistEntry =
    Array.isArray(state.playlist) &&
    state.currentIndex >= 0 &&
    state.currentIndex < state.playlist.length;
  const hasSession = isPlayerActivity || hasPlaylistEntry;

  const positionMs = progress.positionMs;
  const durationMs = progress.durationMs;
  const isBuffering = progress.isBuffering;
  const isAtEnd =
    durationMs > 0 && Math.abs(durationMs - positionMs) < 500;

  // The OBSERVATION derived from the lib. This is what we tell the
  // controller; the controller then owns the phase the chrome
  // renders.
  const observed: VideoState = state.error
    ? 'error'
    : isBuffering
      ? 'buffering'
      : state.isPlaying
        ? 'playing'
        : !hasSession
          ? 'idle'
          : isAtEnd
            ? 'finished'
            : positionMs > 0
              ? 'paused'
              : 'preparing';

  const controller = getVideoController();

  // Feed the observation. Done in an effect (not during render) so
  // the controller is never mutated as a render side effect.
  useEffect(() => {
    controller?.observePlayback(observed);
  }, [controller, observed]);

  // Read the single owned phase back out, re-rendering the chrome
  // whenever the controller transitions.
  const controllerState = useSyncExternalStore(
    controller ? controller.subscribeState : () => () => {},
    controller ? controller.getState : () => undefined,
    controller ? controller.getState : () => undefined,
  );

  // Fall back to the local derivation when no controller is mounted
  // (isolated unit tests) or before its first sync.
  const videoState: VideoState =
    controller && controllerState ? controllerState.videoState : observed;

  return {
    videoState,
    isPlaying: state.isPlaying,
    hasSession,
    isBuffering,
    positionMs,
    durationMs,
    isAtEnd,
    error: state.error ?? null,
  };
}
