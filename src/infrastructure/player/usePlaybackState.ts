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
   *
   * `recoverable` means "playback continued" (lib v1.17.0): `false` is
   * the terminal case that the error card renders, `true` is a
   * degradation the engine complained about while the picture kept
   * playing. A non-terminal failure is NOT the phase — it is exposed
   * here for the classifier, not to paint over a moving picture.
   */
  error: unknown;
}

/**
 * Hook that derives playback state from the lib and keeps the
 * `VideoController` in sync.
 *
 * Derivation rules for the phase the chrome renders:
 *  - `error`     — a TERMINAL failure (`state.error.recoverable === false`)
 *  - `buffering` — `usePlayerProgress().isBuffering === true`
 *  - `preparing` — the file is OPENING (`state.isLoading`, lib v1.17.0)
 *  - `playing`   — `state.isPlaying === true`
 *  - `idle`      — no session
 *  - `finished`  — has session, !isPlaying, position ≈ duration
 *  - `paused`    — has session, !isPlaying, position > 0
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

  // **The file is OPENING** (lib v1.17.0's `state.isLoading`).
  //
  // This has to be its own phase, and it has to come from the lib,
  // because neither of the two facts this hook used to derive from is
  // the truth while a file is opening:
  //
  //   - `state.isPlaying` — mpv's core state is "playing" from the
  //     moment `loadfile` is called until the file has been parsed. So
  //     "playing" during a load means "the engine was told to play",
  //     not "the file is playing".
  //   - `hasSession` — the playlist is not populated until the file
  //     arrives, so "idle" during a load means "no playlist entry yet".
  //
  // Device evidence (2026-10-20, Android 37): a 9-second load over a
  // throttled link showed NOTHING at all — no spinner, no message —
  // because "preparing" was unreachable and both available phases were
  // wrong. The lib now owns the fact: `isLoading` is true from
  // `onLoadRequested` until the file arrives (or the file ends).
  const isLoading = state.isLoading === true;

  // **A TERMINAL failure is the only one that ends playback.**
  //
  // The lib's `recoverable` flag means "playback continued":
  //
  //   - `recoverable: false` — mpv's END_FILE path. The file failed;
  //     playback stopped. This is the case the error card is for.
  //   - `recoverable: true` — a fatal-level mpv LOG line. The engine
  //     complained (an audio-track init failure, say) but the picture
  //     kept playing.
  //
  // Device evidence (2026-10-20): on the emulator (no audio device) mpv
  // logged "AudioTrack Init failed" at fatal level while the video
  // played on — and the error card covered the WORKING video, offering
  // a Retry for a file that was playing. A degradation is not a
  // failure, and it must not paint over a picture that is moving.
  const terminalError =
    state.error != null && state.error.recoverable === false
      ? state.error
      : null;

  // The OBSERVATION, derived from the lib. This IS the phase the chrome
  // renders — there is no second owner and no round-trip.
  const observed: VideoState = terminalError
    ? 'error'
    : isBuffering
      ? 'buffering'
      : isLoading
        ? 'preparing'
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
