import {createSlice, createSelector, type PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '../index';
import {resetAppState} from './authSlice';
import type {MediaKind, MediaLane, MediaSource} from '../../types/media';
import {normalizeMediaClassification} from '../../types/media';
import type {RecentHistoryEntry} from '../../features/recentHistory/recentHistoryReducer';
import type {Bookmark} from '../../features/bookmarks/bookmarkReducer';

/** Compatibility alias for consumers that still use the old session entry name. */
export type SessionEntry = RecentHistoryEntry;

/** Tracked media file in the user's library (populated as files are played). */
export interface MediaLibraryEntry {
  fileUri: string;
  title: string;
  duration: number;
  mediaType: MediaLane;
  type: MediaKind;
  source: MediaSource;
  dateAdded: string;
  provider?: string;
  folderId?: string;
}

/** Compatibility alias for consumers that still use the old session bookmark name. */
export type BookmarkEntry = Bookmark;

interface SessionState {
  playCounts: Record<string, number>;
  mediaLibrary: MediaLibraryEntry[];
}

const MAX_MEDIA_LIBRARY = 200;

const initialState: SessionState = {
  playCounts: {},
  mediaLibrary: [],
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    /** Update statistics and first-opened library metadata for a playback event. */
    recordPlaybackStats(
      state,
      action: PayloadAction<{
        fileUri: string;
        title: string;
        duration: number;
        mediaType?: MediaLane;
        type?: MediaKind;
        source?: MediaSource;
        provider?: string;
        folderId?: string;
      }>,
    ) {
      const {fileUri, title, duration, mediaType, type, source, provider, folderId} = action.payload;
      const now = new Date().toISOString();
      state.playCounts[fileUri] = (state.playCounts[fileUri] || 0) + 1;

      const libIndex = state.mediaLibrary.findIndex(entry => entry.fileUri === fileUri);
      if (libIndex < 0) {
        const classification = normalizeMediaClassification({
          source,
          type,
          mediaType,
          provider,
          folderId,
        });
        state.mediaLibrary.push({
          fileUri,
          title,
          duration,
          ...classification,
          dateAdded: now,
        });
        if (state.mediaLibrary.length > MAX_MEDIA_LIBRARY) {
          state.mediaLibrary = state.mediaLibrary.slice(-MAX_MEDIA_LIBRARY);
        }
      }
    },

    incrementPlayCount(state, action: PayloadAction<string>) {
      state.playCounts[action.payload] = (state.playCounts[action.payload] || 0) + 1;
    },
  },
  extraReducers: builder => {
    builder.addCase(resetAppState, state => {
      state.playCounts = {};
      state.mediaLibrary = [];
    });
  },
});

export const {
  recordPlaybackStats,
  incrementPlayCount,
} = sessionSlice.actions;

/** Recently added local/API library records, newest first. */
export const selectRecentlyAdded = createSelector(
  [(state: RootState) => state.session.mediaLibrary],
  library =>
    [...(library ?? [])]
      .sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
      )
      .slice(0, 10),
);

export default sessionSlice.reducer;
