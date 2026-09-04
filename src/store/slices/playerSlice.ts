import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {
  normalizePlaybackEntry,
  type PlaybackEntry,
  type PlaybackEntryInput,
} from '../../types/playback';
import type {MediaKind, MediaLane, MediaSource} from '../../types/media';

/** Playlist entries are the queue-ready subset of the shared playback record. */
export interface PlaylistEntry extends PlaybackEntry {}

export interface QueueItem {
  fileUri: string;
  title: string;
  source: MediaSource;
  type: MediaKind;
  mediaType: MediaLane;
  provider?: string;
  /** Optional stable linked-folder identity for local entries. */
  folderId?: string;
}

interface PlayerState {
  currentFile: PlaylistEntry | null;
  playlist: PlaylistEntry[];
  // V15 Phase 65: `queue`, `playbackHistory`, and
  // `selectedQueueIndices` moved to the module's zustand
  // store. The consumer's Queue UI reads via `useQueueItems()`,
  // `usePlaybackHistory()`, and `useQueueSelectedIndices()`.
  currentIndex: number;
  // V14 Phase 62: V11-mirrored fields removed. The module's
  // `usePlayer()` is now the source of truth for:
  //   - playbackState -> state.isPlaying
  //   - currentPosition -> progress.positionMs
  //   - duration -> progress.durationMs
  //   - volume -> state.volume
  //   - isFullscreen (was unused)
  //   - loopMode -> state.loopMode
  //   - playbackSpeed -> state.speed
  shuffle: boolean;
  sleepTimerEndTime: number | null;
  /** 50.1: sleep timer expiry trigger — fixed time, end of track, or end of chapter */
  sleepTimerMode: 'time' | 'track' | 'chapter';
  equalizerGains: number[];
  equalizerEnabled: boolean;
  /** A19: fileUri → liked flag. Persisted (player is in the persist
   *  whitelist). Replaces the local `useState` in AudioPlayer so the
   *  like state survives remount and matches across devices. */
  liked: Record<string, boolean>;
}

function normalizeSingleLane(entries: PlaybackEntryInput[]): PlaylistEntry[] {
  const normalized = entries.map(normalizePlaybackEntry);
  const lane = normalized[0]?.mediaType;
  return lane ? normalized.filter(entry => entry.mediaType === lane) : normalized;
}

function activeLane(state: PlayerState): MediaLane | undefined {
  return state.currentFile?.mediaType ?? state.playlist[0]?.mediaType;
}

const initialState: PlayerState = {
  currentFile: null,
  playlist: [],
  currentIndex: -1,
  shuffle: false,
  sleepTimerEndTime: null,
  sleepTimerMode: 'time',
  equalizerGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  equalizerEnabled: false,
  liked: {},
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    // V14 Phase 62: `playFile` reducer removed. Use
    // `useOpenWithResume().openPlayer({...})` from the module
    // instead — the module's PlayerState is the source of truth
    // for playback. The consumer's `currentFile` is still
    // tracked for the playlist/queue UI, but it's updated by
    // the `loadPlaylistToPlayer` / `playFromPlaylist` reducers
    // when the consumer wants to bookmark a file as "current".

    /**
     * Enrich the active entry after native metadata/artwork resolution.
     * This intentionally does not reset playback state or position.
     */
    updateCurrentFileMetadata(state, action: PayloadAction<Partial<PlaylistEntry>>) {
      if (!state.currentFile) return;
      state.currentFile = {...state.currentFile, ...action.payload};
      const currentUri = state.currentFile.uri;
      const playlistIndex = state.playlist.findIndex(entry => entry.uri === currentUri);
      if (playlistIndex >= 0) {
        state.playlist[playlistIndex] = {
          ...state.playlist[playlistIndex],
          ...action.payload,
        };
      }
    },

    /** Replace entire playlist */
    setPlaylist(state, action: PayloadAction<PlaybackEntryInput[]>) {
      state.playlist = normalizeSingleLane(action.payload);
      state.currentIndex = state.playlist.length > 0 ? 0 : -1;
    },

    /** Load a user playlist into the player: sets items, sets currentFile to first track. */
    loadPlaylistToPlayer(state, action: PayloadAction<PlaybackEntryInput[]>) {
      const entries = normalizeSingleLane(action.payload);
      state.playlist = entries;
      state.currentIndex = entries.length > 0 ? 0 : -1;
      state.currentFile = entries.length > 0 ? entries[0] : null;
    },

    /** Append one or more files to end of playlist */
    addToPlaylist(state, action: PayloadAction<PlaybackEntryInput | PlaybackEntryInput[]>) {
      const incoming = (
        Array.isArray(action.payload) ? action.payload : [action.payload]
      ).map(normalizePlaybackEntry);
      const lane = activeLane(state) ?? incoming[0]?.mediaType;
      const items = lane
        ? incoming.filter(entry => entry.mediaType === lane)
        : incoming;
      state.playlist.push(...items);
      // If playlist was empty, auto-set the current index
      if (state.currentIndex === -1 && state.playlist.length > 0) {
        state.currentIndex = 0;
      }
    },

    /** Remove a file from playlist by index */
    removeFromPlaylist(state, action: PayloadAction<number>) {
      const idx = action.payload;
      if (idx < 0 || idx >= state.playlist.length) return;
      state.playlist.splice(idx, 1);
      // Adjust currentIndex
      if (state.playlist.length === 0) {
        state.currentIndex = -1;
        state.currentFile = null;
      } else if (idx < state.currentIndex) {
        state.currentIndex -= 1;
      } else if (idx === state.currentIndex) {
        state.currentIndex = Math.min(state.currentIndex, state.playlist.length - 1);
        state.currentFile = state.playlist[state.currentIndex] || null;
      }
    },

    /** Move item within playlist (reorder) */
    reorderPlaylist(state, action: PayloadAction<{fromIndex: number; toIndex: number}>) {
      const {fromIndex, toIndex} = action.payload;
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= state.playlist.length) return;
      if (toIndex < 0 || toIndex >= state.playlist.length) return;
      const [moved] = state.playlist.splice(fromIndex, 1);
      state.playlist.splice(toIndex, 0, moved);
      // Update currentIndex if it moved
      if (state.currentIndex === fromIndex) {
        state.currentIndex = toIndex;
      } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
        state.currentIndex -= 1;
      } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
        state.currentIndex += 1;
      }
    },

    playFromPlaylist(state, action: PayloadAction<number>) {
      const index = action.payload;
      if (index >= 0 && index < state.playlist.length) {
        state.currentIndex = index;
        state.currentFile = state.playlist[index];
      }
    },

    // V14 Phase 62: V11-only reducers removed.
    //   setPlaybackState, setPosition, setDuration, setVolume,
    //   toggleFullscreen, setLoopMode, setPlaybackSpeed — the
    //   module's `usePlayer()` is the source of truth. Use
    //   `usePlayer().commands.play() / pause() / seek() /
    //   setVolume() / setSpeed() / setLoopMode()` instead.

    nextTrack(state) {
      if (state.playlist.length === 0) return;
      // V15 Phase 65: `playbackHistory` is now in the module's
      // zustand store. The module's `usePlayer().commands.next()`
      // handles the history push when mpv advances tracks; the
      // consumer's `nextTrack` reducer just updates the consumer's
      // `currentIndex` and `currentFile`.
      if (state.currentIndex < state.playlist.length - 1) {
        state.currentIndex += 1;
      } else if (state.shuffle && state.playlist.length > 1) {
        // V14 Phase 62: original V11 wrap behavior was
        // `loopMode === 'playlist'`, but `loopMode` is now
        // owned by the module. The consumer's `shuffle` flag
        // is the only consumer-side state that affects
        // navigation, so we use it as the wrap trigger when
        // the playlist ends.
        let next = state.currentIndex;
        while (next === state.currentIndex) {
          next = Math.floor(Math.random() * state.playlist.length);
        }
        state.currentIndex = next;
      } else {
        return; // stop at end (default V14 behavior)
      }
      state.currentFile = state.playlist[state.currentIndex];
    },

    previousTrack(state) {
      if (state.playlist.length === 0) return;
      // V15 Phase 65: `playbackHistory` is now in the module's
      // zustand store. See `nextTrack` for the symmetry.
      if (state.currentIndex > 0) {
        state.currentIndex -= 1;
      } else if (state.shuffle && state.playlist.length > 1) {
        let prev = state.currentIndex;
        while (prev === state.currentIndex) {
          prev = Math.floor(Math.random() * state.playlist.length);
        }
        state.currentIndex = prev;
      } else {
        return; // stay at start (default V14 behavior)
      }
      state.currentFile = state.playlist[state.currentIndex];
    },

    toggleShuffle(state) {
      state.shuffle = !state.shuffle;
    },

    // ── Queue Management ──
    // V15 Phase 65: queue actions moved to the module's
    // zustand store (`useQueue()`). The consumer no longer
    // dispatches queue state through Redux.

    /** P48.3: jump to a queue item — promote it into the playlist right after
     *  the current track, then make it current. The queue stays display-only
     *  otherwise (nextTrack never consumes it). */
    playFromQueue(state, action: PayloadAction<number>) {
      const idx = action.payload;
      // The actual queue-splice now lives in the module's zustand
      // store (usePlayerQueueStore.playFromQueue). The playlist
      // update below remains consumer-side until Phase 66.
      if (idx < 0) return;
      const insertAt = state.currentIndex + 1;
      const entry = state.currentFile
        ? state.currentFile
        : state.playlist[state.currentIndex];
      if (entry) {
        state.playlist.splice(insertAt, 0, entry);
        state.currentIndex = insertAt;
        state.currentFile = entry;
      }
    },

    // ── Playback History (Phase 23.9) ──
    // V15 Phase 65: `addToPlaybackHistory` and
    // `clearPlaybackHistory` moved to the module's zustand
    // store (`usePlaybackHistory()` / `usePlayerQueueStore`).

    // ── Queue Multi-Select & Batch Operations (Phase 23.4 — 23.5) ──
    // V15 Phase 65: selection state + batch actions moved to
    // the module's zustand store (`useQueueSelection()`).

    /** Clear all remaining player-side state (queue, history,
     *  selection). The queue/history/selection state now lives
     *  in the module's zustand store — call `useQueue().clearQueue()`,
     *  `usePlaybackHistory().clear()`, and
     *  `useQueueSelection().clearSelection()` instead. */
    clearAll(state) {
      state.currentFile = null;
      state.playlist = [];
      state.currentIndex = -1;
    },

    setSleepTimer(state, action: PayloadAction<number | null>) {
      state.sleepTimerEndTime =
        action.payload !== null ? Date.now() + action.payload * 1000 : null;
      // Arming a countdown always uses time mode; cancelling disarms everything.
      state.sleepTimerMode = 'time';
    },

    /** 50.2: arm the timer to fire at end of track / end of chapter */
    setSleepTimerMode(state, action: PayloadAction<'time' | 'track' | 'chapter'>) {
      state.sleepTimerMode = action.payload;
      // Mode-based expiry replaces any countdown timer.
      state.sleepTimerEndTime = null;
    },

    setEqualizerGains(state, action: PayloadAction<number[]>) {
      if (action.payload.length === 10) {
        state.equalizerGains = action.payload;
      }
    },

    toggleEqualizer(state) {
      state.equalizerEnabled = !state.equalizerEnabled;
    },

    clearPlaylist(state) {
      state.playlist = [];
      state.currentIndex = -1;
      state.currentFile = null;
    },

    clearPlayer(state) {
      // V14 Phase 62: V11-mirrored field resets removed
      // (playbackState, currentPosition, duration, loopMode,
      // playbackSpeed are now module-owned).
      // V15 Phase 65: queue/playbackHistory/selectedQueueIndices
      // resets removed (those live in the module's zustand store).
      state.currentFile = null;
      state.playlist = [];
      state.currentIndex = -1;
      state.shuffle = false;
      state.sleepTimerEndTime = null;
      state.sleepTimerMode = 'time';
      state.equalizerGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      state.equalizerEnabled = false;
      state.liked = {};
    },

    /** A19: toggle the "like" flag for a single file. Idempotent. */
    toggleLike(state, action: PayloadAction<string>) {
      const fileUri = action.payload;
      if (!fileUri) return;
      const current = !!state.liked[fileUri];
      state.liked[fileUri] = !current;
    },
  },
});

export const {
  // V14 Phase 62: V11-mirrored actions removed (playFile,
  // setPlaybackState, setPosition, setDuration, setVolume,
  // toggleFullscreen, setLoopMode, setPlaybackSpeed). Use
  // the module's `usePlayer().commands` for these operations.
  // V15 Phase 65: queue + selection actions moved to the
  // module's zustand store (useQueue() / useQueueSelection()).
  updateCurrentFileMetadata,
  setPlaylist,
  loadPlaylistToPlayer,
  addToPlaylist,
  removeFromPlaylist,
  reorderPlaylist,
  playFromPlaylist,
  nextTrack,
  previousTrack,
  toggleShuffle,
  playFromQueue,
  clearPlaylist,
  clearPlayer,
  setSleepTimer,
  setSleepTimerMode,
  setEqualizerGains,
  toggleEqualizer,
  toggleLike,
  clearAll,
} = playerSlice.actions;

// ─── Utility: map persistent playlist items → player entries ──

import type {PlaylistItem} from '../../types/playlist';

export function playlistItemsToEntries(items: PlaylistItem[]): PlaylistEntry[] {
  return items.map(item => ({
    uri: item.fileUri,
    title: item.title,
    duration: item.duration,
    source: item.source,
    type: item.type,
    mediaType: item.mediaType,
    ...(item.provider ? {provider: item.provider} : {}),
  }));
}

export default playerSlice.reducer;
