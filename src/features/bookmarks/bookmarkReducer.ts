import {createSelector, createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {resetAppState} from '../../store/slices/authSlice';
import type {MediaKind, MediaLane, MediaSource} from '../../types/media';
import {normalizeMediaClassification} from '../../types/media';

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

interface BookmarkState {
  items: Bookmark[];
}

interface BookmarkStateRoot {
  bookmark: BookmarkState;
}

const initialState: BookmarkState = {
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

const bookmarkSlice = createSlice({
  name: 'bookmark',
  initialState,
  reducers: {
    /** A14: explicit user action — create or update a single bookmark
     *  identified by `id`. Multiple bookmarks per file are allowed;
     *  each id encodes `(fileUri, position)` so saving at a different
     *  position creates a fresh entry. */
    addBookmark(
      state,
      action: PayloadAction<{bookmark: BookmarkInput; evictId?: string}>,
    ) {
      const {bookmark: input, evictId} = action.payload;
      // The id is now (fileUri, position)-derived; an existing entry
      // with the same id is the same bookmark being repositioned.
      const sameId = input.id ? state.items.findIndex(item => item.id === input.id) : -1;
      const samePosition = sameId >= 0
        ? state.items[sameId]
        : state.items.find(
            item => item.fileUri === input.fileUri && Math.abs(item.position - input.position) < 1,
          );
      const existing = sameId >= 0 ? state.items[sameId] : samePosition;
      const bookmark = buildBookmark(input, existing);
      const existingIndex = sameId >= 0 ? sameId : state.items.findIndex(item => item.id === bookmark.id);
      if (existingIndex >= 0) {
        state.items[existingIndex] = bookmark;
        return;
      }

      if (evictId) {
        state.items = state.items.filter(item => item.id !== evictId);
      }
      state.items = [bookmark, ...state.items].slice(0, MAX_BOOKMARK_ENTRIES);
    },

    /** A14: automatic player checkpoint now targets a single bookmark
     *  by `id` (no longer by fileUri — multiple per file). */
    updateBookmarkPosition(state, action: PayloadAction<BookmarkPositionUpdate>) {
      const bookmark = state.items.find(item => item.id === action.payload.id);
      if (!bookmark) return;
      bookmark.position = Math.max(0, Number(action.payload.position) || 0);
      if (typeof action.payload.duration === 'number' && action.payload.duration > 0) {
        bookmark.duration = action.payload.duration;
      }
    },

    removeBookmark(state, action: PayloadAction<string>) {
      state.items = state.items.filter(item => item.id !== action.payload);
    },

    updateBookmarkLabel(
      state,
      action: PayloadAction<{id: string; label: string}>,
    ) {
      const bookmark = state.items.find(item => item.id === action.payload.id);
      if (bookmark) bookmark.label = action.payload.label;
    },

    clearAllBookmarks(state) {
      state.items = [];
    },

    setBookmarks(state, action: PayloadAction<Bookmark[]>) {
      state.items = normalizeBookmarks(action.payload);
    },
  },
  extraReducers: builder => {
    builder.addCase(resetAppState, state => {
      state.items = [];
    });
  },
});

export const {
  addBookmark,
  updateBookmarkPosition,
  removeBookmark,
  updateBookmarkLabel,
  clearAllBookmarks,
  setBookmarks,
} = bookmarkSlice.actions;

export const selectAllBookmarks = (state: BookmarkStateRoot): Bookmark[] =>
  state.bookmark.items ?? [];

export const selectBookmarksForFile = createSelector(
  [selectAllBookmarks, (_state: BookmarkStateRoot, fileUri: string) => fileUri],
  (bookmarks, fileUri) => bookmarks.filter(bookmark => bookmark.fileUri === fileUri),
);

export const selectBookmarkCount = createSelector(
  [selectAllBookmarks],
  bookmarks => bookmarks.length,
);

export const selectBookmarkCountForFile = createSelector(
  [selectAllBookmarks, (_state: BookmarkStateRoot, fileUri: string) => fileUri],
  (bookmarks, fileUri) => bookmarks.filter(bookmark => bookmark.fileUri === fileUri).length,
);

export default bookmarkSlice.reducer;
