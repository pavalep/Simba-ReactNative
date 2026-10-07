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
 * The state holds a "recently played" cap keyed by `fileUri`; on
 * every upsert the existing entry is evicted and the new one becomes
 * the head, so the list is newest-first by construction and the
 * furthest-oldest entry falls off the tail. Persisted via the shared
 * AsyncStorage helper.
 */

/**
 * How many entries "Recently Played" keeps.
 *
 * Ten, not twenty, and not "as many as fit". This is a recency list,
 * not an archive — its job is to answer "what did I just watch", and a
 * list that still surfaces something from a month ago stops answering
 * that question. Ten is also roughly what fits in two horizontal
 * swipes on a phone, so the rail never has to silently truncate (which
 * is exactly what it used to do: this constant was 20 while the rail
 * defaulted to rendering 8).
 *
 * Eviction is positional, not sorted: the upsert prepends and slices,
 * so an entry only survives while it stays inside the newest N. That
 * is LRU on recency, and it costs one array operation.
 */
export const MAX_RECENT_HISTORY_ENTRIES = 10;

export interface RecentHistoryEntry {
  fileUri: string;
  title: string;
  position: number;
  duration: number;
  lastPlayedAt: string;
  thumbnailPath: string;
  /**
   * A frame captured from the video at `position`, on this device.
   *
   * Distinct from `thumbnailPath`, which is catalogue artwork and says
   * what the film is. This says *where in it you were*, which is the
   * only thing a continue-watching rail is actually promising. It is
   * absent until playback has run long enough to be worth resuming
   * from, and absent for live streams, which have no seekable position.
   */
  resumeThumbnailPath?: string;
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
  /** See `RecentHistoryEntry.resumeThumbnailPath`. */
  resumeThumbnailPath?: string;
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
            // Carried across an update, not re-derived. A checkpoint
            // that arrives without a captured frame (a live stream, a
            // capture that failed, a position too near the start to be
            // worth resuming to) must not DELETE the frame a previous
            // session captured — the newest frame is always the most
            // useful one, and losing it would blank the card.
            resumeThumbnailPath:
              payload.resumeThumbnailPath ?? existing?.resumeThumbnailPath,
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
