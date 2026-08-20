import {createSelector, createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {resetAppState} from '../../store/slices/authSlice';
import type {MediaKind, MediaLane, MediaSource} from '../../types/media';
import {normalizeMediaClassification} from '../../types/media';

export const MAX_RECENT_HISTORY_ENTRIES = 20;

export interface RecentHistoryEntry {
  fileUri: string;
  title: string;
  position: number;
  duration: number;
  lastPlayedAt: string;
  thumbnailPath: string;
  mediaType: MediaLane;
  type: MediaKind;
  source: MediaSource;
  provider?: string;
  folderId?: string;
}

export interface RecentHistoryEntryInput {
  fileUri: string;
  title: string;
  position: number;
  duration: number;
  thumbnailPath?: string;
  mediaType?: MediaLane;
  type?: MediaKind;
  source?: MediaSource;
  provider?: string;
  folderId?: string;
  lastPlayedAt?: string;
}

interface RecentHistoryState {
  entries: RecentHistoryEntry[];
}

interface RecentHistoryStateRoot {
  recentHistory: RecentHistoryState;
}

const initialState: RecentHistoryState = {
  entries: [],
};

const recentHistorySlice = createSlice({
  name: 'recentHistory',
  initialState,
  reducers: {
    /** Upsert the newest playback checkpoint and evict the oldest entry past the 20-item cap. */
    upsertRecentHistoryEntry(state, action: PayloadAction<RecentHistoryEntryInput>) {
      const payload = action.payload;
      const existing = state.entries.find(entry => entry.fileUri === payload.fileUri);
      const classification = normalizeMediaClassification({
        source: payload.source ?? existing?.source,
        type: payload.type ?? existing?.type,
        mediaType: payload.mediaType ?? existing?.mediaType,
        provider: payload.provider ?? existing?.provider,
        folderId: payload.folderId ?? existing?.folderId,
      });

      state.entries = [
        {
          fileUri: payload.fileUri,
          title: payload.title,
          position: Math.max(0, payload.position || 0),
          duration: Math.max(0, payload.duration || 0),
          lastPlayedAt: payload.lastPlayedAt ?? new Date().toISOString(),
          thumbnailPath: payload.thumbnailPath || existing?.thumbnailPath || '',
          ...classification,
        },
        ...state.entries.filter(entry => entry.fileUri !== payload.fileUri),
      ].slice(0, MAX_RECENT_HISTORY_ENTRIES);
    },
    removeRecentHistoryEntry(state, action: PayloadAction<string>) {
      state.entries = state.entries.filter(entry => entry.fileUri !== action.payload);
    },
    clearRecentHistory(state) {
      state.entries = [];
    },
  },
  extraReducers: builder => {
    builder.addCase(resetAppState, state => {
      state.entries = [];
    });
  },
});

export const {
  upsertRecentHistoryEntry,
  removeRecentHistoryEntry,
  clearRecentHistory,
} = recentHistorySlice.actions;

export const selectRecentHistoryEntries = (
  state: RecentHistoryStateRoot,
): RecentHistoryEntry[] => state.recentHistory.entries;

export const selectRecentHistoryEntry = createSelector(
  [selectRecentHistoryEntries, (_state: RecentHistoryStateRoot, fileUri: string) => fileUri],
  (entries, fileUri) => entries.find(entry => entry.fileUri === fileUri),
);

export const selectRecentHistoryForDisplay = createSelector(
  [selectRecentHistoryEntries],
  entries => entries.slice(0, MAX_RECENT_HISTORY_ENTRIES),
);

export default recentHistorySlice.reducer;
