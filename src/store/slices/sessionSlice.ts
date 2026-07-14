import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface SessionEntry {
  fileUri: string;
  title: string;
  position: number;
  duration: number;
  lastPlayedAt: string; // ISO date string
}

interface SessionState {
  recentFiles: SessionEntry[];
}

const MAX_RECENT_FILES = 20;

const initialState: SessionState = {
  recentFiles: [],
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    /** Add or update a file entry with playback position */
    savePlaybackPosition(
      state,
      action: PayloadAction<{
        fileUri: string;
        title: string;
        position: number;
        duration: number;
      }>,
    ) {
      const {fileUri, title, position, duration} = action.payload;
      const now = new Date().toISOString();

      // Remove existing entry for this URI
      const filtered = state.recentFiles.filter(f => f.fileUri !== fileUri);

      // Add to front
      state.recentFiles = [
        {fileUri, title, position, duration, lastPlayedAt: now},
        ...filtered,
      ].slice(0, MAX_RECENT_FILES);
    },

    /** Get saved position for a file (selector-like action — use in component) */
    removeRecentFile(state, action: PayloadAction<string>) {
      state.recentFiles = state.recentFiles.filter(
        f => f.fileUri !== action.payload,
      );
    },

    clearAllRecent(state) {
      state.recentFiles = [];
    },
  },
});

export const {savePlaybackPosition, removeRecentFile, clearAllRecent} =
  sessionSlice.actions;

/** Selector: get saved position for a specific URI */
export function selectSessionEntry(
  state: {session: SessionState},
  fileUri: string,
): SessionEntry | undefined {
  return state.session.recentFiles.find(f => f.fileUri === fileUri);
}

export default sessionSlice.reducer;
