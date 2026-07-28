import {createSlice, createSelector, PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '../index';

export interface SessionEntry {
  fileUri: string;
  title: string;
  position: number;
  duration: number;
  lastPlayedAt: string; // ISO date string
  /** Absolute path to a cached thumbnail screenshot for this file, or empty. */
  thumbnailPath: string;
  /** Discriminates between video and audio files for grouped UI. */
  mediaType?: 'video' | 'audio';
}

/** Tracked media file in the user's library (populated as files are played). */
export interface MediaLibraryEntry {
  fileUri: string;
  title: string;
  duration: number;
  mediaType: 'video' | 'audio';
  dateAdded: string; // ISO date — first time file was opened
}

interface SessionState {
  recentFiles: SessionEntry[];
  /** Per-file play count, keyed by fileUri. */
  playCounts: Record<string, number>;
  /** Growing library of all files the user has ever opened. */
  mediaLibrary: MediaLibraryEntry[];
}

const MAX_RECENT_FILES = 20;
const MAX_MEDIA_LIBRARY = 200;

const initialState: SessionState = {
  recentFiles: [],
  playCounts: {},
  mediaLibrary: [],
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
        thumbnailPath?: string;
        mediaType?: 'video' | 'audio';
      }>,
    ) {
      const {fileUri, title, position, duration, thumbnailPath, mediaType} = action.payload;
      const now = new Date().toISOString();

      // Remove existing entry for this URI
      const filtered = state.recentFiles.filter(f => f.fileUri !== fileUri);

      // Preserve existing thumbnail/mediaType if not provided or capture failed
      const existingEntry = state.recentFiles.find(f => f.fileUri === fileUri);
      const resolvedThumbnail = thumbnailPath || existingEntry?.thumbnailPath || '';
      const resolvedMediaType = mediaType ?? existingEntry?.mediaType ?? 'video';

      // Add to front
      state.recentFiles = [
        {fileUri, title, position, duration, lastPlayedAt: now, thumbnailPath: resolvedThumbnail, mediaType: resolvedMediaType},
        ...filtered,
      ].slice(0, MAX_RECENT_FILES);

      // ── Increment play count (5.2) ──
      state.playCounts[fileUri] = (state.playCounts[fileUri] || 0) + 1;

      // ── Add to media library on first open (5.4) ──
      const libIndex = state.mediaLibrary.findIndex(e => e.fileUri === fileUri);
      if (libIndex < 0) {
        state.mediaLibrary.push({
          fileUri,
          title,
          duration,
          mediaType: resolvedMediaType,
          dateAdded: now,
        });
        if (state.mediaLibrary.length > MAX_MEDIA_LIBRARY) {
          state.mediaLibrary = state.mediaLibrary.slice(-MAX_MEDIA_LIBRARY);
        }
      }
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

    /** (5.2) Directly increment a file's play count outside savePlaybackPosition. */
    incrementPlayCount(state, action: PayloadAction<string>) {
      state.playCounts[action.payload] = (state.playCounts[action.payload] || 0) + 1;
    },
  },
});

export const {savePlaybackPosition, removeRecentFile, clearAllRecent, incrementPlayCount} =
  sessionSlice.actions;

/** Selector: get saved position for a specific URI */
export function selectSessionEntry(
  state: {session: SessionState},
  fileUri: string,
): SessionEntry | undefined {
  return state.session.recentFiles.find(f => f.fileUri === fileUri);
}

// ─── Phase 5 Selectors ─────────────────────────────────────────

/** (5.2) Frequently Played — items with playCount >= 3, sorted desc. */
export const selectFrequentlyPlayed = createSelector(
  [(state: RootState) => state.session.recentFiles,
   (state: RootState) => state.session.playCounts],
  (recentFiles, playCounts) =>
    recentFiles
      .filter(entry => (playCounts[entry.fileUri] || 0) >= 3)
      .sort(
        (a, b) =>
          (playCounts[b.fileUri] || 0) - (playCounts[a.fileUri] || 0),
      )
      .slice(0, 8),
);

/** (5.4) Recently Added — last 10 items from mediaLibrary newest first. */
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

/** (5.7) Weighted featured items — combines recency, engagement, frequency, time-of-day. */
export const selectWeightedFeatured = createSelector(
  [(state: RootState) => state.session.recentFiles,
   (state: RootState) => state.session.playCounts],
  (recentFiles, playCounts) => {
    const now = Date.now();
    const currentHour = new Date().getHours();
    // Evening bonus (6PM–10PM)
    const timeOfDayBonus = (currentHour >= 18 && currentHour <= 22) ? 1.2 : 1.0;

    const scored = (recentFiles ?? []).map(entry => {
      const hoursSincePlayed =
        (now - new Date(entry.lastPlayedAt).getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 1 - hoursSincePlayed / 168); // decays over 1 week

      const completionRatio =
        entry.duration > 0
          ? Math.min(entry.position / entry.duration, 1)
          : 0;
      // Engagement sweet-spot: 30%–80% completion
      const completionFactor =
        completionRatio > 0.3 && completionRatio < 0.8 ? 1.5 : 0.8;

      const playCount = playCounts[entry.fileUri] || 0;
      const frequencyScore = Math.min(playCount, 10) / 10;

      const weightedScore =
        recencyScore * 0.30 +
        completionFactor * 0.25 +
        frequencyScore * 0.30 +
        timeOfDayBonus * 0.15;

      return {...entry, weightedScore, playCount};
    });

    return scored.sort((a, b) => b.weightedScore - a.weightedScore).slice(0, 12);
  },
);

export default sessionSlice.reducer;
