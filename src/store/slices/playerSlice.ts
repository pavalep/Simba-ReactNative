import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {MediaFile, PlaybackState} from '../../types';

export interface PlaylistEntry {
  uri: string;
  title: string;
  duration: number;
}

interface PlayerState {
  currentFile: PlaylistEntry | null;
  playlist: PlaylistEntry[];
  currentIndex: number;
  playbackState: PlaybackState;
  currentPosition: number;
  duration: number;
  volume: number;
  isFullscreen: boolean;
  /** 'none' | 'file' | 'playlist' — mirrors MpvLoopMode */
  loopMode: 'none' | 'file' | 'playlist';
  shuffle: boolean;
}

const initialState: PlayerState = {
  currentFile: null,
  playlist: [],
  currentIndex: -1,
  playbackState: 'idle',
  currentPosition: 0,
  duration: 0,
  volume: 1.0,
  isFullscreen: false,
  loopMode: 'none',
  shuffle: false,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    playFile(state, action: PayloadAction<PlaylistEntry>) {
      state.currentFile = action.payload;
      state.playbackState = 'playing';
      state.currentPosition = 0;
    },

    /** Replace entire playlist */
    setPlaylist(state, action: PayloadAction<PlaylistEntry[]>) {
      state.playlist = action.payload;
      state.currentIndex = action.payload.length > 0 ? 0 : -1;
    },

    /** Append one or more files to end of playlist */
    addToPlaylist(state, action: PayloadAction<PlaylistEntry | PlaylistEntry[]>) {
      const items = Array.isArray(action.payload) ? action.payload : [action.payload];
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

    clearPlaylist(state) {
      state.playlist = [];
      state.currentIndex = -1;
      state.currentFile = null;
      state.currentPosition = 0;
    },

    clearPlayer(state) {
      state.currentFile = null;
      state.playlist = [];
      state.currentIndex = -1;
      state.playbackState = 'idle';
      state.currentPosition = 0;
      state.duration = 0;
    },
  },
});

export const {
  playFile,
  setPlaylist,
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
  clearPlaylist,
  clearPlayer,
} = playerSlice.actions;
export default playerSlice.reducer;
