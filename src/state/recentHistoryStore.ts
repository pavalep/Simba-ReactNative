import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedAsyncStorage, CURRENT_PERSIST_VERSION} from './persistence';
import type {MediaKind, MediaLane, MediaSource} from '../types/media';
import {normalizeMediaClassification} from '../types/media';

/**
 * V17 Phase 82: replaces `recentHistoryReducer` (Redux + redux-persist
 * whitelist) with `useRecentHistoryStore` (Zustand + persist, key
 * 'recentHistory' to match the old redux-persist whitelist).
 *
 * The state holds a 20-entry "recently played" cap keyed by
 * `fileUri`; on every upsert the existing entry is evicted and
 * the new one becomes the head. Persisted via the shared
 * AsyncStorage helper.
 */

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

export interface RecentHistoryState {
  entries: RecentHistoryEntry[];
}

export interface RecentHistoryActions {
  /** Upsert the newest playback checkpoint and evict the oldest entry past the 20-item cap. */
  upsertRecentHistoryEntry: (input: RecentHistoryEntryInput) => void;
  removeRecentHistoryEntry: (fileUri: string) => void;
  clearRecentHistory: () => void;
  reset: () => void;
  setEntries: (entries: RecentHistoryEntry[]) => void;
}

const initialState: RecentHistoryState = {entries: []};

export const useRecentHistoryStore = create<RecentHistoryState & RecentHistoryActions>()(
  persist(
    (set) => ({
      ...initialState,

      upsertRecentHistoryEntry: (payload) =>
        set((s) => {
          const existing = s.entries.find(entry => entry.fileUri === payload.fileUri);
          const classification = normalizeMediaClassification({
            source: payload.source ?? existing?.source,
            type: payload.type ?? existing?.type,
            mediaType: payload.mediaType ?? existing?.mediaType,
            provider: payload.provider ?? existing?.provider,
            folderId: payload.folderId ?? existing?.folderId,
          });

          const next: RecentHistoryEntry = {
            fileUri: payload.fileUri,
            title: payload.title,
            position: Math.max(0, payload.position || 0),
            duration: Math.max(0, payload.duration || 0),
            lastPlayedAt: payload.lastPlayedAt ?? new Date().toISOString(),
            thumbnailPath: payload.thumbnailPath || existing?.thumbnailPath || '',
            ...classification,
          };

          return {
            entries: [
              next,
              ...s.entries.filter(entry => entry.fileUri !== payload.fileUri),
            ].slice(0, MAX_RECENT_HISTORY_ENTRIES),
          };
        }),

      removeRecentHistoryEntry: (fileUri) =>
        set((s) => ({entries: s.entries.filter(entry => entry.fileUri !== fileUri)})),

      clearRecentHistory: () => set({entries: []}),

      reset: () => set({...initialState}),

      setEntries: (entries) => set({entries: entries.slice(0, MAX_RECENT_HISTORY_ENTRIES)}),
    }),
    {
      name: 'recentHistory',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedAsyncStorage),
    },
  ),
);
