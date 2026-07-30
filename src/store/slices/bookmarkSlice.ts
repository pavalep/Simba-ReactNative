import {createSlice, createSelector, PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '../index';

// ─── Types ─────────────────────────────────────────────────

export interface Bookmark {
  id: string;
  fileUri: string;
  title: string;
  position: number;
  duration: number;
  createdAt: string;  // ISO date string
  label: string;
  thumbnailPath?: string;
  mediaType?: 'video' | 'audio';
}

interface BookmarkState {
  items: Bookmark[];
}

const initialState: BookmarkState = {
  items: [],
};

// ─── Slice ─────────────────────────────────────────────────

const bookmarkSlice = createSlice({
  name: 'bookmark',
  initialState,
  reducers: {
    addBookmark(state, action: PayloadAction<Bookmark>) {
      const bookmark = action.payload;
      state.items = [
        bookmark,
        ...state.items.filter(item => item.id !== bookmark.id),
      ];
    },

    removeBookmark(state, action: PayloadAction<string>) {
      state.items = state.items.filter(item => item.id !== action.payload);
    },

    updateBookmarkLabel(
      state,
      action: PayloadAction<{id: string; label: string}>,
    ) {
      const {id, label} = action.payload;
      const existing = state.items.find(item => item.id === id);
      if (existing) {
        existing.label = label;
      }
    },

    clearAllBookmarks(state) {
      state.items = [];
    },

    /** Replace entire list (e.g. from AsyncStorage load) */
    setBookmarks(state, action: PayloadAction<Bookmark[]>) {
      state.items = action.payload;
    },
  },
});

export const {
  addBookmark,
  removeBookmark,
  updateBookmarkLabel,
  clearAllBookmarks,
  setBookmarks,
} = bookmarkSlice.actions;

// ─── Selectors ─────────────────────────────────────────────

export const selectAllBookmarks = (state: RootState): Bookmark[] =>
  state.bookmark.items ?? [];

export const selectBookmarksForFile = createSelector(
  [selectAllBookmarks, (_state: RootState, fileUri: string) => fileUri],
  (bookmarks, fileUri) =>
    bookmarks
      .filter(b => b.fileUri === fileUri)
      .sort((a, b) => a.position - b.position),
);

export const selectBookmarkCount = createSelector(
  [selectAllBookmarks],
  bookmarks => bookmarks.length,
);

export const selectBookmarkCountForFile = createSelector(
  [(state: RootState) => state.bookmark.items, (_state: RootState, fileUri: string) => fileUri],
  (bookmarks, fileUri) =>
    bookmarks.filter(b => b.fileUri === fileUri).length,
);

export default bookmarkSlice.reducer;
