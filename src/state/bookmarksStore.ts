import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';
import type {MediaKind, MediaLane, MediaSource} from '../types/media';
import {normalizeMediaClassification} from '../types/media';

/**
 * V17 Phase 81: replaces `bookmarkReducer` (Redux + redux-persist
 * whitelist + a side `simba_bookmarks` AsyncStorage mirror in
 * `bookmarkPersistence.ts`) with `useBookmarksStore` (Zustand +
 * persist, key='bookmark' to match the old redux-persist
 * whitelist). The on-device data migration is a no-op: test
 * devices reinstall per the V17 charter, and bookmarks don't
 * carry anything that can't be recreated by tapping the button
 * again.
 *
 * The `bookmarkPersistence.ts` helpers are no longer used by
 * the store; consumers that need explicit AsyncStorage IO
 * (none in the current codebase) can import them but should
 * prefer the store's built-in persistence.
 */

export const MAX_BOOKMARK_ENTRIES = 20;

export interface Bookmark {
  /**
   * A14: stable identity is now `(fileUri, position)`-derived so multiple
   * bookmarks per file are allowed. Old persisted data with fileUri-only
   * ids continues to work (one-per-file) until the user saves a new
   * bookmark at a different position, which then creates a distinct
   * entry.
   */
  id: string;
  fileUri: string;
  title: string;
  /** Position in seconds at the time of save. */
  position: number;
  duration: number;
  /** Original explicit-bookmark creation time. Used for overflow eviction. */
  createdAt: string;
  label: string;
  thumbnailPath?: string;
  mediaType: MediaLane;
  type: MediaKind;
  source: MediaSource;
  provider?: string;
  folderId?: string;
}

export type BookmarkInput = Omit<Bookmark, 'id' | 'createdAt'> & {
  createdAt?: string;
  id?: string;
};

export interface BookmarkPositionUpdate {
  /** A14: identifies a single bookmark by id (no longer by fileUri). */
  id: string;
  position: number;
  duration?: number;
}

export interface BookmarksState {
  items: Bookmark[];
}

export interface BookmarksActions {
  /** A14: explicit user action — create or update a single bookmark
   *  identified by `id`. Multiple bookmarks per file are allowed;
   *  each id encodes `(fileUri, position)` so saving at a different
   *  position creates a fresh entry. */
  addBookmark: (input: {bookmark: BookmarkInput; evictId?: string}) => void;

  /** A14: automatic player checkpoint now targets a single bookmark
   *  by `id` (no longer by fileUri — multiple per file). */
  updateBookmarkPosition: (update: BookmarkPositionUpdate) => void;

  removeBookmark: (id: string) => void;
  updateBookmarkLabel: (input: {id: string; label: string}) => void;
  clearAllBookmarks: () => void;
  setBookmarks: (items: Bookmark[]) => void;
  reset: () => void;
}

const initialState: BookmarksState = {
  items: [],
};

function safeDate(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildBookmark(input: BookmarkInput, existing?: Bookmark): Bookmark {
  const classification = normalizeMediaClassification({
    source: input.source ?? existing?.source,
    type: input.type ?? existing?.type,
    mediaType: input.mediaType ?? existing?.mediaType,
    provider: input.provider ?? existing?.provider,
    folderId: input.folderId ?? existing?.folderId,
  });

  return {
    id: existing?.id ?? input.id ?? `bookmark-${encodeURIComponent(input.fileUri)}`,
    fileUri: input.fileUri,
    title: input.title || existing?.title || 'Untitled',
    position: Math.max(0, Number(input.position) || 0),
    duration: Math.max(0, Number(input.duration) || 0),
    createdAt: existing?.createdAt ?? input.createdAt ?? new Date().toISOString(),
    label: input.label || existing?.label || '',
    thumbnailPath: input.thumbnailPath || existing?.thumbnailPath,
    ...classification,
  };
}

/** Normalize persisted data. A14: dedup by `id` (not by `fileUri`), so
 *  multiple bookmarks per file are preserved. */
export function normalizeBookmarks(items: Bookmark[]): Bookmark[] {
  const byId = new Map<string, Bookmark>();

  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item.id !== 'string' || item.id.length === 0) {
      continue;
    }
    if (typeof item.fileUri !== 'string' || item.fileUri.length === 0) {
      continue;
    }
    const existing = byId.get(item.id);
    if (!existing || safeDate(item.createdAt) > safeDate(existing.createdAt)) {
      byId.set(item.id, buildBookmark(item, existing));
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => safeDate(b.createdAt) - safeDate(a.createdAt))
    .slice(0, MAX_BOOKMARK_ENTRIES);
}

export const useBookmarksStore = create<BookmarksState & BookmarksActions>()(
  persist(
    (set) => ({
      ...initialState,

      addBookmark: ({bookmark: input, evictId}) =>
        set((s) => {
          const sameId = input.id
            ? s.items.findIndex(item => item.id === input.id)
            : -1;
          const samePosition = sameId >= 0
            ? s.items[sameId]
            : s.items.find(
                item =>
                  item.fileUri === input.fileUri &&
                  Math.abs(item.position - input.position) < 1,
              );
          const existing = sameId >= 0 ? s.items[sameId] : samePosition;
          const bookmark = buildBookmark(input, existing);
          const existingIndex = sameId >= 0
            ? sameId
            : s.items.findIndex(item => item.id === bookmark.id);
          if (existingIndex >= 0) {
            const next = s.items.slice();
            next[existingIndex] = bookmark;
            return {items: next};
          }

          if (evictId) {
            const filtered = s.items.filter(item => item.id !== evictId);
            return {items: [bookmark, ...filtered].slice(0, MAX_BOOKMARK_ENTRIES)};
          }
          return {items: [bookmark, ...s.items].slice(0, MAX_BOOKMARK_ENTRIES)};
        }),

      updateBookmarkPosition: (update) =>
        set((s) => ({
          items: s.items.map(item =>
            item.id === update.id
              ? {
                  ...item,
                  position: Math.max(0, Number(update.position) || 0),
                  duration:
                    typeof update.duration === 'number' && update.duration > 0
                      ? update.duration
                      : item.duration,
                }
              : item,
          ),
        })),

      removeBookmark: (id) =>
        set((s) => ({items: s.items.filter(item => item.id !== id)})),

      updateBookmarkLabel: ({id, label}) =>
        set((s) => ({
          items: s.items.map(item =>
            item.id === id ? {...item, label} : item,
          ),
        })),

      clearAllBookmarks: () => set({items: []}),

      setBookmarks: (items) => set({items: normalizeBookmarks(items)}),

      reset: () => set({...initialState}),
    }),
    {
      name: 'bookmark',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
    },
  ),
);
