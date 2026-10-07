import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';
// W9.4: identity is normalised, so `file:///a/b.mkv` and `/a/b.mkv` are
// one entry. Imported from the player facade's shared vocabulary rather
// than reimplemented here — the resume reader must key on exactly the
// same string this store writes.
import {mediaKey} from '../infrastructure/player/playbackProgress';
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

/**
 * Upsert a playback checkpoint.
 *
 * Identity is the **normalised** media URI, so two spellings of the same
 * file collapse onto one shelf entry rather than appearing twice. See
 * `normalizeMediaUri` in `infrastructure/player/playbackProgress.ts`
 * for what is and is not collapsed, and for why the URI is the identity
 * in this app (there is no provider id available to key on).
 *
 * **This single upsert implements two opposite policies at once**, which
 * is worth stating because it is easy to get backwards:
 *
 *   - **Collapse retries.** Two checkpoints for the same media (the
 *     30 s interval firing again, a second React root mounting, a
 *     PiP/background overlap) must not create a second row. They
 *     cannot: the key matches, so this is an update.
 *   - **Keep genuine rewatches.** Replaying a film you already watched
 *     is a new viewing, and it moves the entry back to the head with a
 *     fresh `lastPlayedAt` and a reset `position` — visible in History
 *     and Stats, not silently merged away.
 *
 * Plembfin (a production Plex/Emby/Jellyfin/Trakt sync hub) documents
 * the same split: *"Duplicate delivery of the same event is collapsed
 * instead of creating noisy history rows… while a new play at a later
 * time remains visible in History and Stats."*
 */
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
          const key = mediaKey(payload.fileUri);
          const existing = s.entries.find(entry => mediaKey(entry.fileUri) === key);
          const classification = normalizeMediaClassification({
            source: payload.source ?? existing?.source,
            type: payload.type ?? existing?.type,
            mediaType: payload.mediaType ?? existing?.mediaType,
            provider: payload.provider ?? existing?.provider,
            folderId: payload.folderId ?? existing?.folderId,
          });

          const next: RecentHistoryEntry = {
            // Store the NORMALISED spelling, not the incoming one. Every
            // later comparison in the app goes through `mediaKey`, but
            // persisting the canonical form keeps the persisted payload
            // itself stable, so a re-render can never flip the value.
            fileUri: key,
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
              ...s.entries.filter(entry => mediaKey(entry.fileUri) !== key),
            ].slice(0, MAX_RECENT_HISTORY_ENTRIES),
          };
        }),

      removeRecentHistoryEntry: (fileUri) =>
        set((s) => {
          const key = mediaKey(fileUri);
          return {entries: s.entries.filter(entry => mediaKey(entry.fileUri) !== key)};
        }),

      clearRecentHistory: () => set({entries: []}),

      reset: () => set({...initialState}),

      setEntries: (entries) => set({entries: entries.slice(0, MAX_RECENT_HISTORY_ENTRIES)}),
    }),
    {
      name: 'recentHistory',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
    },
  ),
);
