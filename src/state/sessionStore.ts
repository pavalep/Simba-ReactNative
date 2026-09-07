import {create} from 'zustand';
import type {MediaKind, MediaLane, MediaSource} from '../types/media';
import {normalizeMediaClassification} from '../types/media';

/**
 * V17 Phase 77: replaces the old `sessionSlice` Redux reducer with a
 * Zustand store. Transient state (NOT persisted): the `playCounts`
 * + `mediaLibrary` roll-up is recomputed at runtime from the
 * `recentHistory` feature's persisted history on cold start, so
 * there's no need to persist the roll-up itself.
 */

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

export interface SessionState {
  /** fileUri -> play count. */
  playCounts: Record<string, number>;
  /** Local/API library roll-up. Newest first; capped at MAX_MEDIA_LIBRARY. */
  mediaLibrary: MediaLibraryEntry[];
}

export interface SessionActions {
  /**
   * Update statistics and first-opened library metadata for a
   * playback event. Called from `recentHistory`'s `addRecent`
   * side-effect, which already records the row in its persisted
   * store.
   */
  recordPlaybackStats: (input: {
    fileUri: string;
    title: string;
    duration: number;
    mediaType?: MediaLane;
    type?: MediaKind;
    source?: MediaSource;
    provider?: string;
    folderId?: string;
  }) => void;
  /** Increment the play count for a single file. Currently unused by
   * any consumer (kept exported for forward-compat with future UI
   * that wants the count without the full library entry). */
  incrementPlayCount: (fileUri: string) => void;
  /** Reset both fields. Called from authSlice-equivalent reset on
   * logout. (V17 Phase 78 will wire this through `authStore`'s
   * `reset()` action.) */
  resetSession: () => void;
}

const MAX_MEDIA_LIBRARY = 200;

const initialState: SessionState = {
  playCounts: {},
  mediaLibrary: [],
};

export const useSessionStore = create<SessionState & SessionActions>()(
  (set) => ({
    ...initialState,

    recordPlaybackStats: (input) =>
      set((state) => {
        const {fileUri, title, duration, mediaType, type, source, provider, folderId} = input;
        const now = new Date().toISOString();
        const nextPlayCounts = {
          ...state.playCounts,
          [fileUri]: (state.playCounts[fileUri] || 0) + 1,
        };
        const libIndex = state.mediaLibrary.findIndex(
          (entry) => entry.fileUri === fileUri,
        );
        if (libIndex >= 0) {
          // Already in the library — keep the existing row; the
          // updated metadata isn't tracked in this slice (the
          // recentHistory feature owns the canonical row).
          return {playCounts: nextPlayCounts, mediaLibrary: state.mediaLibrary};
        }
        const classification = normalizeMediaClassification({
          source,
          type,
          mediaType,
          provider,
          folderId,
        });
        const nextLibrary = [
          ...state.mediaLibrary,
          {
            fileUri,
            title,
            duration,
            ...classification,
            dateAdded: now,
          },
        ];
        // Newest last -> trim to last MAX_MEDIA_LIBRARY entries.
        const trimmed =
          nextLibrary.length > MAX_MEDIA_LIBRARY
            ? nextLibrary.slice(-MAX_MEDIA_LIBRARY)
            : nextLibrary;
        return {playCounts: nextPlayCounts, mediaLibrary: trimmed};
      }),

    incrementPlayCount: (fileUri) =>
      set((state) => ({
        playCounts: {
          ...state.playCounts,
          [fileUri]: (state.playCounts[fileUri] || 0) + 1,
        },
      })),

    resetSession: () => set({...initialState}),
  }),
);
