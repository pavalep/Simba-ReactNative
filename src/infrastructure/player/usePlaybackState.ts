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
 * Now: the **phase is DERIVED from the lib** and the controller
 * keeps POLICY, not phase. It used to be the other way round — this
 * hook fed the controller its observation and read the controller's
 * phase back out — but the controller DISCARDED every observation
 * (its guard required a `currentItem`, and only `controller.loadFile()`
 * sets one, and nothing calls that: the LIB loads the file). So the
 * controller's phase stayed `'idle'` forever and, because the
 * controller's phase won, the loading overlay and the error overlay
 * could never appear. The derivation below is the phase; nothing
 * round-trips through the controller.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §5.4 + audit doc §3.G + `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md`
 * Phase 5.1.
 */

import {usePlayer, usePlayerProgress} from '@simba-dev/react-native-media-player';
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
  // structural question is answered structurally instead: a session
  // exists iff the engine is holding a playlist entry at a valid index.
  // (This line used to add "…or this tree is the player Activity". One
  // Activity, one root — that half cannot be true anymore.)
  const hasPlaylistEntry =
    Array.isArray(state.playlist) &&
    state.currentIndex >= 0 &&
    state.currentIndex < state.playlist.length;
  // V21 F5: this used to be `isPlayerActivity || hasPlaylistEntry`.
  // `isPlayerActivity` came from the lib's `useIsPlayerActivity()`, which
  // asked which Activity hosts a player surface — a question that only
  // had two possible answers while there were two Activities. There is
  // one root now, so that disjunct was permanently false and the
  // predicate is simply the structural playlist check.
  const hasSession = hasPlaylistEntry;

  const positionMs = progress.positionMs;
  const durationMs = progress.durationMs;
  const isBuffering = progress.isBuffering;
  const isAtEnd =
    durationMs > 0 && Math.abs(durationMs - positionMs) < 500;

  // The OBSERVATION, derived from the lib. This IS the phase the chrome
  // renders — there is no second owner and no round-trip.
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

  // The phase is DERIVED from the lib, and the lib owns it.
  //
  // It used to be handed to the `VideoController`, which then owned the
  // phase the chrome renders — and the controller DISCARDED every
  // observation, because its guard was `if (!this.state.currentItem)
  // return;` and `currentItem` is only set by `controller.loadFile()`,
  // which nothing calls (the LIB loads the file; the app's launch seam
  // hands the URI to the lib and the lib's engine takes it from there).
  //
  // So the controller's phase stayed `'idle'` forever, and because the
  // controller's phase WON, `videoState` was `'idle'` forever too. Two
  // things were dead because of it, and both were reported as bugs:
  //
  //   - the loading overlay (`videoState === 'preparing' || isBuffering`)
  //     could never appear, so a buffering video showed NOTHING;
  //   - the error overlay (`videoState === 'error'`) could never appear,
  //     so a file that failed to load was a silent black screen.
  //
  // The controller's stickiness — "a late 'ready' must not downgrade an
  // error" — is not lost. The lib clears `state.error` on the next
  // `onFileLoaded` (`player.ts` `case 'onFileLoaded'`), so the error is
  // already scoped to the session it happened in. That was a second owner
  // of a fact the lib already owned, and the stale one was winning.
  //
  // The controller keeps its POLICY role — what is loaded, what comes
  // next, the repeat mode. It no longer owns the phase, and it is no
  // longer the retry target either: `VideoErrorOverlay` re-launches the
  // app's now-playing session through the launch seam, because the
  // controller's `currentItem` is only set by `controller.loadFile()`,
  // and nothing calls that.
  const videoState: VideoState = observed;

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
