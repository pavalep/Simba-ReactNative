/**
 * V19 W1 — `usePlaybackState()` hook.
 *
 * Derives the V19 `VideoState` enum ('idle' | 'preparing' | 'playing' |
 * 'paused' | 'seeking' | 'buffering' | 'finished' | 'error') from the
 * lib's existing hooks. The lib doesn't expose this enum directly;
 * V19 derives it from `usePlayer().state` + `usePlayerProgress()`.
 *
 * Used by `VideoLoadingOverlay`, `VideoErrorOverlay`, and the rest of
 * the chrome primitives to decide visibility.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §5.4 + audit doc §3.G.
 */

import {usePlayer, usePlayerProgress} from '@simba-dev/react-native-media-player';

/** V19's high-level playback state. The chrome renders based on this. */
export type VideoState =
  | 'idle'
  | 'preparing'
  | 'playing'
  | 'paused'
  | 'seeking'
  | 'buffering'
  | 'finished'
  | 'error';

export interface PlaybackStateDerived {
  videoState: VideoState;
  isPlaying: boolean;
  hasSession: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
  /** True when the position is within 500 ms of the duration. */
  isAtEnd: boolean;
}

/**
 * Hook that derives `videoState` + supporting flags from the lib's
 * state + progress hooks.
 *
 * State-derivation rules (SPEC §6 playback axis):
 *  - `error`     — lib reported an error (state.error !== null)
 *  - `buffering` — `usePlayerProgress().isBuffering === true`
 *  - `seeking`   — seeking-in-progress (we approximate via
 *                  `isBuffering` + a UI flag; V20 can refine via
 *                  a typed seek event from the lib)
 *  - `playing`   — `state.isPlaying === true`
 *  - `paused`    — has session, !isPlaying, position > 0
 *  - `finished`  — has session, !isPlaying, position ≈ duration
 *  - `preparing` — has session-ish title, !isPlaying, no error
 *  - `idle`      — no title (no session)
 */
export function usePlaybackState(): PlaybackStateDerived {
  const {state} = usePlayer();
  const progress = usePlayerProgress();

  const hasSession = !!state.title;
  const positionMs = progress.positionMs;
  const durationMs = progress.durationMs;
  const isBuffering = progress.isBuffering;
  const isAtEnd =
    durationMs > 0 && Math.abs(durationMs - positionMs) < 500;

  let videoState: VideoState;
  if (state.error) {
    videoState = 'error';
  } else if (isBuffering) {
    videoState = 'buffering';
  } else if (state.isPlaying) {
    videoState = 'playing';
  } else if (!hasSession) {
    videoState = 'idle';
  } else if (isAtEnd) {
    videoState = 'finished';
  } else if (positionMs > 0) {
    videoState = 'paused';
  } else {
    videoState = 'preparing';
  }

  return {
    videoState,
    isPlaying: state.isPlaying,
    hasSession,
    isBuffering,
    positionMs,
    durationMs,
    isAtEnd,
  };
}
