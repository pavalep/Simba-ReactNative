import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {PlaybackState} from '../../types';
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
  queue: PlaylistEntry[];
  playbackHistory: PlaylistEntry[];
  currentIndex: number;
  playbackState: PlaybackState;
  currentPosition: number;
  duration: number;
  volume: number;
  isFullscreen: boolean;
  /** 'none' | 'file' | 'playlist' — mirrors MpvLoopMode */
  loopMode: 'none' | 'file' | 'playlist';
  shuffle: boolean;
  playbackSpeed: number;
  sleepTimerEndTime: number | null;
  /** 50.1: sleep timer expiry trigger — fixed time, end of track, or end of chapter */
  sleepTimerMode: 'time' | 'track' | 'chapter';
  equalizerGains: number[];
  equalizerEnabled: boolean;
  /** Multi-select indices for queue batch operations (Phase 23) */
  selectedQueueIndices: number[];
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
  queue: [],
  playbackHistory: [],
  currentIndex: -1,
  playbackState: 'idle',
  currentPosition: 0,
  duration: 0,
  volume: 1.0,
  isFullscreen: false,
  loopMode: 'none',
  shuffle: false,
  playbackSpeed: 1.0,
  sleepTimerEndTime: null,
  sleepTimerMode: 'time',
  equalizerGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  equalizerEnabled: false,
  selectedQueueIndices: [],
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    playFile(state, action: PayloadAction<PlaybackEntryInput>) {
      state.currentFile = normalizePlaybackEntry(action.payload);
      state.playbackState = 'playing';
      state.currentPosition = 0;
    },

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

    /** Load a user playlist into the player: sets items, starts playback from index 0, clears queue */
    loadPlaylistToPlayer(state, action: PayloadAction<PlaybackEntryInput[]>) {
      const entries = normalizeSingleLane(action.payload);
      state.playlist = entries;
      state.currentIndex = entries.length > 0 ? 0 : -1;
      state.currentFile = entries.length > 0 ? entries[0] : null;
      state.currentPosition = 0;
      state.playbackState = entries.length > 0 ? 'playing' : 'idle';
      state.queue = [];
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
        state.playbackState = 'playing';
        state.currentPosition = 0;
      }
    },

    setPlaybackState(state, action: PayloadAction<PlaybackState>) {
      state.playbackState = action.payload;
    },

    setPosition(state, action: PayloadAction<number>) {
      state.currentPosition = action.payload;
    },

    setDuration(state, action: PayloadAction<number>) {
      state.duration = action.payload;
    },

    setVolume(state, action: PayloadAction<number>) {
      state.volume = Math.max(0, Math.min(1, action.payload));
    },

    toggleFullscreen(state) {
      state.isFullscreen = !state.isFullscreen;
    },

    nextTrack(state) {
      if (state.playlist.length === 0) return;
      // Push current track to playback history before advancing
      if (state.currentFile) {
        state.playbackHistory.push(state.currentFile);
      }
      if (state.currentIndex < state.playlist.length - 1) {
        state.currentIndex += 1;
      } else if (state.loopMode === 'playlist') {
        state.currentIndex = 0; // wrap around
      } else {
        return; // stop at end
      }
      state.currentFile = state.playlist[state.currentIndex];
      state.currentPosition = 0;
      state.playbackState = 'playing';
    },

    previousTrack(state) {
      if (state.playlist.length === 0) return;
      // Push current track to playback history before going back
      if (state.currentFile) {
        state.playbackHistory.push(state.currentFile);
      }
      if (state.currentIndex > 0) {
        state.currentIndex -= 1;
      } else if (state.loopMode === 'playlist') {
        state.currentIndex = state.playlist.length - 1; // wrap around
      } else {
        return; // stay at start
      }
      state.currentFile = state.playlist[state.currentIndex];
      state.currentPosition = 0;
      state.playbackState = 'playing';
    },

    setLoopMode(state, action: PayloadAction<'none' | 'file' | 'playlist'>) {
      state.loopMode = action.payload;
    },

    toggleShuffle(state) {
      state.shuffle = !state.shuffle;
    },

    // ── Queue Management ──

    addToQueue(state, action: PayloadAction<PlaybackEntryInput>) {
      const entry = normalizePlaybackEntry(action.payload);
      const lane = activeLane(state) ?? state.queue[0]?.mediaType;
      if (lane && entry.mediaType !== lane) return;
      state.queue.push(entry);
    },

    /** Insert at front of queue — "Play Next" */
    prependToQueue(state, action: PayloadAction<PlaybackEntryInput>) {
      const entry = normalizePlaybackEntry(action.payload);
      const lane = activeLane(state) ?? state.queue[0]?.mediaType;
      if (lane && entry.mediaType !== lane) return;
      state.queue.unshift(entry);
    },

    removeFromQueue(state, action: PayloadAction<number>) {
      const idx = action.payload;
      if (idx < 0 || idx >= state.queue.length) return;
      state.queue.splice(idx, 1);
    },

    reorderQueue(state, action: PayloadAction<{fromIndex: number; toIndex: number}>) {
      const {fromIndex, toIndex} = action.payload;
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= state.queue.length) return;
      if (toIndex < 0 || toIndex >= state.queue.length) return;
      const [moved] = state.queue.splice(fromIndex, 1);
      state.queue.splice(toIndex, 0, moved);
    },

    clearQueue(state) {
      state.queue = [];
    },

    shuffleQueue(state) {
      // Fisher-Yates shuffle in place
      const q = state.queue;
      for (let i = q.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q[i], q[j]] = [q[j], q[i]];
      }
    },

    /** P48.3: jump to a queue item — promote it into the playlist right after
     *  the current track, then make it current. The queue stays display-only
     *  otherwise (nextTrack never consumes it). */
    playFromQueue(state, action: PayloadAction<number>) {
      const idx = action.payload;
      if (idx < 0 || idx >= state.queue.length) return;
      const [item] = state.queue.splice(idx, 1);
      if (!item) return;
      const entry = normalizePlaybackEntry(item);
      const insertAt = state.currentIndex + 1;
      state.playlist.splice(insertAt, 0, entry);
      state.currentIndex = insertAt;
      state.currentFile = entry;
      state.currentPosition = 0;
      state.playbackState = 'playing';
    },

    // ── Playback History (Phase 23.9) ──

    addToPlaybackHistory(state, action: PayloadAction<PlaybackEntryInput>) {
      state.playbackHistory.push(normalizePlaybackEntry(action.payload));
    },

    clearPlaybackHistory(state) {
      state.playbackHistory = [];
    },

    // ── Queue Multi-Select & Batch Operations (Phase 23.4 — 23.5) ──

    setQueueSelection(state, action: PayloadAction<number[]>) {
      state.selectedQueueIndices = action.payload;
    },

    clearQueueSelection(state) {
      state.selectedQueueIndices = [];
    },

    /** Batch remove all selected items from queue */
    removeSelectedFromQueue(state) {
      const sorted = [...state.selectedQueueIndices].sort((a, b) => b - a);
      for (const idx of sorted) {
        if (idx >= 0 && idx < state.queue.length) {
          state.queue.splice(idx, 1);
        }
      }
      state.selectedQueueIndices = [];
    },

    /** Batch move all selected items to top of queue, preserving original order */
    moveSelectedToTop(state) {
      const sorted = [...state.selectedQueueIndices].sort((a, b) => a - b);
      const selected = sorted.map(idx => state.queue[idx]);
      // Remove in reverse order to preserve indices
      for (const idx of [...sorted].reverse()) {
        state.queue.splice(idx, 1);
      }
      // Prepend selected items at the front
      state.queue.unshift(...selected);
      state.selectedQueueIndices = [];
    },

    /** Clear queue + playback history + selection */
    clearAll(state) {
      state.queue = [];
      state.playbackHistory = [];
      state.selectedQueueIndices = [];
    },

    setPlaybackSpeed(state, action: PayloadAction<number>) {
      state.playbackSpeed = Math.max(0.25, Math.min(3.0, action.payload));
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
      state.currentPosition = 0;
    },

    clearPlayer(state) {
      state.currentFile = null;
      state.playlist = [];
      state.queue = [];
      state.playbackHistory = [];
      state.currentIndex = -1;
      state.playbackState = 'idle';
      state.currentPosition = 0;
      state.duration = 0;
      state.playbackSpeed = 1.0;
      state.sleepTimerEndTime = null;
      state.sleepTimerMode = 'time';
      state.equalizerGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      state.equalizerEnabled = false;
      state.selectedQueueIndices = [];
    },
  },
});

export const {
  playFile,
  updateCurrentFileMetadata,
  setPlaylist,
  loadPlaylistToPlayer,
  addToPlaylist,
  removeFromPlaylist,
  reorderPlaylist,
  playFromPlaylist,
  setPlaybackState,
  setPosition,
  setDuration,
  setVolume,
  toggleFullscreen,
  nextTrack,
  previousTrack,
  setLoopMode,
  toggleShuffle,
  addToQueue,
  prependToQueue,
  removeFromQueue,
  reorderQueue,
  clearQueue,
  shuffleQueue,
  playFromQueue,
  clearPlaylist,
  clearPlayer,
  setPlaybackSpeed,
  setSleepTimer,
  setSleepTimerMode,
  setEqualizerGains,
  toggleEqualizer,
  addToPlaybackHistory,
  clearPlaybackHistory,
  setQueueSelection,
  clearQueueSelection,
  removeSelectedFromQueue,
  moveSelectedToTop,
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
