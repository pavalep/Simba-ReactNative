import {createSelector, createSlice, PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '../index';
import type {
  DownloadRecord,
  DownloadStatus,
} from '../../services/downloadService';

/**
 * 49.x: reactive UI mirror of downloadService. The service's AsyncStorage
 * manifest is the source of truth (survives restarts + powers the sync offline
 * remap); this slice just feeds badges, buttons and the Downloads screen.
 * The slice is persisted via the redux-persist whitelist, then corrected by
 * hydrateDownloads() at boot and on every service event.
 */
interface DownloadsState {
  records: DownloadRecord[];
}

const initialState: DownloadsState = {
  records: [],
};

const downloadsSlice = createSlice({
  name: 'downloads',
  initialState,
  reducers: {
    hydrateDownloads(state, action: PayloadAction<DownloadRecord[]>) {
      state.records = action.payload;
    },
    upsertDownload(state, action: PayloadAction<DownloadRecord>) {
      const idx = state.records.findIndex(r => r.uri === action.payload.uri);
      if (idx >= 0) state.records[idx] = action.payload;
      else state.records.push(action.payload);
    },
    setDownloadStatus(
      state,
      action: PayloadAction<{uri: string; status: DownloadStatus; error?: string}>,
    ) {
      const record = state.records.find(r => r.uri === action.payload.uri);
      if (!record) return;
      record.status = action.payload.status;
      if (action.payload.error !== undefined) record.error = action.payload.error;
    },
    removeDownload(state, action: PayloadAction<string>) {
      state.records = state.records.filter(r => r.uri !== action.payload);
    },
  },
});

export const {
  hydrateDownloads,
  upsertDownload,
  setDownloadStatus,
  removeDownload,
} = downloadsSlice.actions;

const selectDownloadsState = (state: RootState) => state.downloads;

export const selectDownloads = createSelector(
  selectDownloadsState,
  s => s.records,
);

export const selectDownloadByUri = (uri: string) =>
  createSelector(selectDownloads, records =>
    records.find(r => r.uri === uri) ?? null,
  );

/** Set of completed-download uris — powers the offline badges (49.5). */
export const selectDownloadedUriSet = createSelector(selectDownloads, records =>
  new Set(records.filter(r => r.status === 'done').map(r => r.uri)),
);

export const selectDownloadsTotalBytes = createSelector(
  selectDownloads,
  records =>
    records
      .filter(r => r.status === 'done')
      .reduce((sum, r) => sum + (r.size || 0), 0),
);

export default downloadsSlice.reducer;
