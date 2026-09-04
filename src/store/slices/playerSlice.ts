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
  //
  // V15 Phase 66: dead player-feature state removed. The
  // following fields were scaffolded in earlier phases but no
  // consumer file ever read or wrote them — they were dead
  // weight. They're now exposed (when needed) as module-level
  // zustand stores:
  //   - shuffle -> useShuffleEnabled() / useShuffle()
  //   - sleepTimerEndTime, sleepTimerMode -> useSleepTimer()
  //   - equalizerGains, equalizerEnabled -> useEqualizer()
  //   - liked -> useIsLiked(uri) / useToggleLiked()
  //
  // Future consumer code that wires up these features can use
  // the module hooks directly. Redux state for them is gone.
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
      // V15 Phase 66: V14's `state.shuffle`-based wrap behavior
      // is gone (the consumer's `shuffle` state was unused dead
      // state and has been removed). The consumer's `nextTrack`
      // is now the V11 default: advance if there's a next track,
      // otherwise stop at the end. Module-level loop-mode is the
      // authoritative wrap behavior — consumers who want the
      // playlist to wrap should call `usePlayer().commands.setLoopMode('playlist')`.
      if (state.currentIndex < state.playlist.length - 1) {
        state.currentIndex += 1;
      } else {
        return; // stop at end (V11 default)
      }
      state.currentFile = state.playlist[state.currentIndex];
    },

    previousTrack(state) {
      if (state.playlist.length === 0) return;
      // V15 Phase 66: V14's `state.shuffle`-based wrap behavior
      // is gone (see `nextTrack` for the rationale). Default:
      // go back if there's a previous track, otherwise stop at start.
      if (state.currentIndex > 0) {
        state.currentIndex -= 1;
      } else {
        return; // stay at start (V11 default)
      }
      state.currentFile = state.playlist[state.currentIndex];
    },

    // V15 Phase 66: dead state + reducers removed. The following
    // were scaffolded in earlier phases but no consumer file ever
    // read or wrote them — they were dead weight. The functionality
    // is now exposed (when needed) as module-level zustand stores:
    //   - toggleShuffle -> useShuffle()
    //   - setSleepTimer, setSleepTimerMode -> useSleepTimer()
    //   - setEqualizerGains, toggleEqualizer -> useEqualizer()
    //   - toggleLike -> useToggleLiked()
    //   - playFromQueue -> useQueue() (queue-splice) +
    //                       useOpenPlaylist() (playlist + activity)
    //   - clearAll, clearPlayer, clearPlaylist -> use the
    //       module's clear* methods + the consumer's own
    //       reset action when needed
  },
});

export const {
  // V15 Phase 66: most of the action exports were dead. The
  // remaining ones (loadPlaylistToPlayer, playFromPlaylist,
  // addToPlaylist, removeFromPlaylist, reorderPlaylist,
  // updateCurrentFileMetadata, nextTrack, previousTrack) are
  // dispatched by the 4 "play all" screens (Phase 64) + the
  // Queue UI (Phase 65) + a few metadata-sync sites.
  updateCurrentFileMetadata,
  loadPlaylistToPlayer,
  addToPlaylist,
  removeFromPlaylist,
  reorderPlaylist,
  playFromPlaylist,
  nextTrack,
  previousTrack,
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
