import type {MediaLane} from '../types/media';
import type {PlaybackEntry} from '../types/playback';

export type PlaybackLoopMode = 'none' | 'file' | 'playlist';

export interface PlaybackTransitionState {
  lane: MediaLane;
  playlist: readonly PlaybackEntry[];
  queue: readonly PlaybackEntry[];
  currentIndex: number;
  loopMode: PlaybackLoopMode;
}

export type NextTransition =
  | {
      kind: 'queue';
      queueIndex: number;
      entry: PlaybackEntry;
    }
  | {
      kind: 'playlist';
      playlistIndex: number;
      entry: PlaybackEntry;
    }
  | {
      kind: 'loop';
      playlistIndex: number;
      entry: PlaybackEntry;
    }
  | {
      kind: 'ended';
    };

export type PreviousTransition =
  | {
      kind: 'playlist';
      playlistIndex: number;
      entry: PlaybackEntry;
    }
  | {
      kind: 'loop';
      playlistIndex: number;
      entry: PlaybackEntry;
    }
  | {
      kind: 'restart';
    };

function isLaneEntry(entry: PlaybackEntry, lane: MediaLane): boolean {
  return entry.mediaType === lane;
}

function findNextPlaylistEntry(
  playlist: readonly PlaybackEntry[],
  currentIndex: number,
  lane: MediaLane,
): {index: number; entry: PlaybackEntry} | null {
  for (let index = Math.max(0, currentIndex + 1); index < playlist.length; index += 1) {
    const entry = playlist[index];
    if (entry && isLaneEntry(entry, lane)) {
      return {index, entry};
    }
  }
  return null;
}

function findFirstPlaylistEntry(
  playlist: readonly PlaybackEntry[],
  lane: MediaLane,
): {index: number; entry: PlaybackEntry} | null {
  for (let index = 0; index < playlist.length; index += 1) {
    const entry = playlist[index];
    if (entry && isLaneEntry(entry, lane)) {
      return {index, entry};
    }
  }
  return null;
}

/**
 * Resolve the next item without mutating Redux or invoking native playback.
 * Explicit queue items always win, but entries from the other lane are ignored
 * rather than being loaded into the current player.
 */
export function resolveNextTransition(
  state: PlaybackTransitionState,
): NextTransition {
  const queueIndex = state.queue.findIndex(entry => isLaneEntry(entry, state.lane));
  if (queueIndex >= 0) {
    const entry = state.queue[queueIndex];
    if (entry) {
      return {kind: 'queue', queueIndex, entry};
    }
  }

  const next = findNextPlaylistEntry(state.playlist, state.currentIndex, state.lane);
  if (next) {
    return {kind: 'playlist', playlistIndex: next.index, entry: next.entry};
  }

  if (state.loopMode === 'playlist') {
    const first = findFirstPlaylistEntry(state.playlist, state.lane);
    if (first) {
      return {kind: 'loop', playlistIndex: first.index, entry: first.entry};
    }
  }

  return {kind: 'ended'};
}

/**
 * Resolve previous behavior within the active lane. Previous does not consume
 * the explicit queue because queue items represent future playback only.
 */
export function resolvePreviousTransition(
  state: PlaybackTransitionState,
): PreviousTransition {
  for (let index = Math.min(state.currentIndex - 1, state.playlist.length - 1); index >= 0; index -= 1) {
    const entry = state.playlist[index];
    if (entry && isLaneEntry(entry, state.lane)) {
      return {kind: 'playlist', playlistIndex: index, entry};
    }
  }

  if (state.loopMode === 'playlist') {
    for (let index = state.playlist.length - 1; index >= 0; index -= 1) {
      const entry = state.playlist[index];
      if (entry && isLaneEntry(entry, state.lane)) {
        return {kind: 'loop', playlistIndex: index, entry};
      }
    }
  }

  return {kind: 'restart'};
}

/** Return whether an entry belongs to a player's lane. */
export function isPlaybackEntryInLane(
  entry: PlaybackEntry | null | undefined,
  lane: MediaLane,
): entry is PlaybackEntry {
  return Boolean(entry && isLaneEntry(entry, lane));
}
