/**
 * V21 W22 D-023 — Unified `usePlaybackFacade()` hook.
 *
 * The V21 player facade (W3 P10) is a re-export surface. Each
 * consumer wires its own subset of the 9+ symbols (usePlayer +
 * usePlayerProgress + usePlayerActivity + usePlay + useOpenPlaylist
 * + …). For a 1-import-1-wrapper integration (the user's durable
 * "junior-dev rule" — see user memory), a single hook that
 * composes them all is the canonical entry point.
 *
 * This file adds `usePlaybackFacade` as that entry point. It does
 * NOT replace the lower-level hooks (they're still re-exported
 * from `./index.ts` for screens that only need state or only
 * need a single command). The facade is the *aggregator* — a
 * screen that just needs `state.isPlaying` continues to call
 * `usePlayer().state.isPlaying` (cheaper re-renders). A screen
 * that needs everything calls `usePlaybackFacade()` once.
 *
 * The 4 sub-surfaces (state / progress / commands / launch)
 * match the existing per-hook contracts:
 *   - state       ← usePlayer().state (isPlaying, title, volume, ...)
 *   - progress    ← usePlayerProgress() (positionMs, durationMs, ...)
 *   - commands    ← usePlayer().commands (play, pause, seek, ...)
 *   - launch      ← usePlay() + usePlayerActivity().openPlayer
 *                  (typed `Result<PlaybackId, StreamError>` for
 *                  the 3 launch paths: open / openWithResume /
 *                  openPlaylist)
 *   - activity    ← usePlayerActivity().getLaunchParams
 *                  (deep-link cold-start parameters)
 *
 * W22 follow-up note: the V12 bridge can't surface rich error
 * codes, so the launch surface maps every failure to
 * `NetworkStreamError` today. After a native bridge update
 * surfaces HTTP status codes, the launch surface will return
 * distinct per-variant errors without changing the call sites.
 */

import {useCallback, useMemo} from 'react';
import {
  resolveStreamType,
  useOpenPlaylist,
  usePlayer,
  usePlayerActivity,
  usePlayerProgress,
} from '@simba-dev/react-native-media-player';
import type {MediaKind, MediaLane} from '../../types/media';
import {err, networkError, ok, type Result, type StreamError} from './streamErrors';
import {secondsToMs} from './position';

// ─── Public types ───────────────────────────────────────────

/** Stable identity returned on a successful launch. */
export type PlaybackId = string;

/** Read-state surface (the "static-ish" player state). */
export interface PlaybackState {
  isPlaying: boolean;
  title: string;
  volume: number;
  /** Mapped from `PlayerState.isMuted` — the underlying module uses `isMuted`; the facade uses the shorter `mute`. */
  mute: boolean;
  speed: number;
  /** Mapped from `PlayerState.loopMode` — the underlying module's value space is `'none' | 'file' | 'playlist'`. */
  loop: 'none' | 'file' | 'playlist';
}

/** Read-progress surface (the 1Hz-pollable fields). */
export interface PlaybackProgress {
  positionMs: number;
  durationMs: number;
  isBuffering: boolean;
  isSeeking: boolean;
  seekable: boolean;
  cacheFill: number;
}

/** Imperative surface (bridge-backed commands). */
export interface PlaybackCommands {
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  next: () => void;
  previous: () => void;
  seek: (ms: number) => void;
}

/** Launch surface — open a single media item. */
export interface OpenInput {
  uri: string;
  title: string;
  mediaType: MediaKind | MediaLane | 'video' | 'audio';
}

/** Launch surface — open a media item at a known position (sec). */
export interface OpenWithResumeInput extends OpenInput {
  positionSec: number;
}

/** Launch surface — open a playlist. */
export interface OpenPlaylistInput {
  entries: Array<{uri: string; title: string}>;
  title?: string;
  mediaType?: 'video' | 'audio';
  startIndex?: number;
  startPositionSec?: number;
  shuffle?: boolean;
}

/** The 3 typed launch paths, all returning `Result<PlaybackId, StreamError>`. */
export interface PlaybackLauncher {
  /** Open a single track from the beginning. */
  open: (input: OpenInput) => Promise<Result<PlaybackId, StreamError>>;
  /** Open a track at a known resume position (in seconds — matches Bookmark/History). */
  openWithResume: (input: OpenWithResumeInput) => Promise<Result<PlaybackId, StreamError>>;
  /** Open a playlist (with optional shuffle + start index + start position). */
  openPlaylist: (input: OpenPlaylistInput) => Promise<Result<PlaybackId, StreamError>>;
}

/** Activity surface — entry-point helpers. */
export interface PlaybackActivity {
  /** Returns the cold-start launch parameters (deep link, etc.). */
  getLaunchParams: () => unknown;
}

/** The unified facade — the 1-import-1-wrapper for new consumers. */
export interface PlaybackFacade {
  state: PlaybackState;
  progress: PlaybackProgress;
  commands: PlaybackCommands;
  launch: PlaybackLauncher;
  activity: PlaybackActivity;
}

// ─── Hook ───────────────────────────────────────────────────

/**
 * V21 W22 D-023 — The unified player facade.
 *
 * Composes the 5 lower-level hooks (`usePlayer` + `usePlayerProgress`
 * + `usePlayerActivity` + `useOpenPlaylist` + `usePlay`) into a
 * single `PlaybackFacade` object. The `launch` sub-surface is
 * the new typed entry point — every launch path returns
 * `Result<PlaybackId, StreamError>` so call sites can branch
 * on the 4 `StreamError` variants.
 *
 * **Junior-dev usage:**
 * ```ts
 * const facade = usePlaybackFacade();
 * return (
 *   <View>
 *     <Text>{facade.state.title}</Text>
 *     <Text>{facade.progress.positionMs} / {facade.progress.durationMs}</Text>
 *     <Button onPress={facade.commands.togglePlayPause}>
 *       {facade.state.isPlaying ? 'Pause' : 'Play'}
 *     </Button>
 *     <Button
 *       title="Open full player"
 *       onPress={async () => {
 *         const r = await facade.launch.openWithResume({uri, title, mediaType, positionSec});
 *         if (!r.ok && isNetworkError(r.error)) showOfflineToast();
 *       }}
 *     />
 *   </View>
 * );
 * ```
 *
 * **Performance:** the facade re-renders when ANY of the 5
 * underlying contexts change. A screen that only needs state
 * (e.g. a "Now Playing" badge in a header) should still call
 * `usePlayer()` directly — the progress context updates at 1Hz
 * and would re-render the badge needlessly.
 */
export function usePlaybackFacade(): PlaybackFacade {
  const {state, commands} = usePlayer();
  const progress = usePlayerProgress();
  const {openPlayer, getLaunchParams} = usePlayerActivity();
  const {openPlaylist: openPlaylistRaw} = useOpenPlaylist();

  // ── Launchers (typed) ───────────────────────────────────

  // `open` — single track from the beginning. Wraps the
  // bridge's `Promise<boolean>` into a typed `Result`. The W22
  // follow-up (native bridge update surfacing HTTP status
  // codes) will let this map to the right `StreamError.kind`.
  const open = useCallback(
    async (input: OpenInput): Promise<Result<PlaybackId, StreamError>> => {
      try {
        const accepted = await openPlayer({
          uri: input.uri,
          title: input.title,
          type: resolveStreamType(input.mediaType),
        });
        if (!accepted) {
          return err(networkError('Player refused launch'));
        }
        return ok(`play:${input.uri}:${Date.now()}` as PlaybackId);
      } catch (e) {
        return err(
          networkError('Player launch failed', {
            cause: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    },
    [openPlayer],
  );

  // `openWithResume` — single track at a known position. The
  // position is in seconds (matches Bookmark.position +
  // RecentHistoryEntry.position). The hook converts to ms for
  // the bridge's `OpenPlayerOptions.startPositionMs` field.
  const openWithResume = useCallback(
    async (
      input: OpenWithResumeInput,
    ): Promise<Result<PlaybackId, StreamError>> => {
      const startPositionMs = secondsToMs(input.positionSec);
      try {
        const accepted = await openPlayer({
          uri: input.uri,
          title: input.title,
          type: resolveStreamType(input.mediaType),
          ...(startPositionMs != null ? {startPositionMs} : {}),
        });
        if (!accepted) {
          return err(networkError('Player refused launch'));
        }
        return ok(`play:${input.uri}:${Date.now()}` as PlaybackId);
      } catch (e) {
        return err(
          networkError('Player launch failed', {
            cause: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    },
    [openPlayer],
  );

  // `openPlaylist` — multi-track launch with optional shuffle
  // + start index + start position. The V15 Phase 64 `useOpenPlaylist`
  // returns `Promise<boolean>`; we wrap into a typed `Result`.
  const openPlaylist = useCallback(
    async (
      input: OpenPlaylistInput,
    ): Promise<Result<PlaybackId, StreamError>> => {
      const startPositionMs = secondsToMs(input.startPositionSec ?? 0);
      try {
        const accepted = await openPlaylistRaw(input.entries, {
          type: input.mediaType ?? 'audio',
          startIndex: input.startIndex,
          shuffle: input.shuffle,
          ...(startPositionMs != null ? {startPositionMs} : {}),
        });
        if (!accepted) {
          return err(networkError('Player refused playlist launch'));
        }
        return ok(
          `playlist:${input.entries[0]?.uri ?? 'unknown'}:${Date.now()}` as PlaybackId,
        );
      } catch (e) {
        return err(
          networkError('Player playlist launch failed', {
            cause: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    },
    [openPlaylistRaw],
  );

  return useMemo<PlaybackFacade>(
    () => ({
      state: {
        isPlaying: state.isPlaying,
        title: state.title,
        volume: state.volume,
        mute: state.isMuted,
        speed: state.speed,
        loop: state.loopMode,
      },
      progress: {
        positionMs: progress.positionMs,
        durationMs: progress.durationMs,
        isBuffering: progress.isBuffering,
        isSeeking: progress.isSeeking,
        seekable: progress.seekable,
        cacheFill: progress.cacheFill,
      },
      commands: {
        play: commands.play,
        pause: commands.pause,
        togglePlayPause: commands.togglePlayPause,
        next: commands.next,
        previous: commands.previous,
        seek: commands.seek,
      },
      launch: {open, openWithResume, openPlaylist},
      activity: {getLaunchParams},
    }),
    [state, progress, commands, open, openWithResume, openPlaylist, getLaunchParams],
  );
}
