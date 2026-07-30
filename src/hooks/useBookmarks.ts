import {useCallback, useEffect, useMemo} from 'react';
import {useAppDispatch, useAppSelector} from '../store';
import {
  addBookmark,
  removeBookmark,
  updateBookmarkLabel,
  clearAllBookmarks,
  setBookmarks,
  selectAllBookmarks,
  selectBookmarksForFile,
  selectBookmarkCount,
  selectBookmarkCountForFile,
  type Bookmark,
} from '../store/slices/bookmarkSlice';
import {
  loadBookmarks,
  saveBookmark as persistBookmark,
  deleteBookmark as persistDeleteBookmark,
  updateBookmarkLabel as persistUpdateLabel,
  clearAllBookmarksInStorage,
} from '../services/bookmarkService';

export interface UseBookmarksResult {
  allBookmarks: Bookmark[];
  bookmarksForFile: Bookmark[];
  bookmarkCount: number;
  bookmarkCountForFile: number;
  add: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  remove: (id: string) => void;
  updateLabel: (id: string, label: string) => void;
  clearAll: () => void;
}

/**
 * Bookmark CRUD hook.
 *
 * @param fileUri - Optional. If provided, returns `bookmarksForFile` filtered
 *                  to that file and `bookmarkCountForFile`.
 */
export function useBookmarks(fileUri?: string): UseBookmarksResult {
  const dispatch = useAppDispatch();

  const allBookmarks = useAppSelector(selectAllBookmarks);
  const bookmarksForFile = useAppSelector(state =>
    fileUri ? selectBookmarksForFile(state, fileUri) : [],
  );
  const bookmarkCount = useAppSelector(selectBookmarkCount);
  const bookmarkCountForFile = useAppSelector(state =>
    fileUri ? selectBookmarkCountForFile(state, fileUri) : 0,
  );

  // ── Hydrate from AsyncStorage on mount ──
  useEffect(() => {
    let mounted = true;
    loadBookmarks().then(stored => {
      if (mounted && stored.length > 0) {
        dispatch(setBookmarks(stored));
      }
    });
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  const add = useCallback(
    (input: Omit<Bookmark, 'id' | 'createdAt'>) => {
      const id = `bookmark-${input.fileUri}-${Math.round(input.position)}-${Date.now()}`;
      const bookmark: Bookmark = {
        ...input,
        id,
        createdAt: new Date().toISOString(),
      };
      dispatch(addBookmark(bookmark));
      persistBookmark(bookmark);
    },
    [dispatch],
  );

  const remove = useCallback(
    (id: string) => {
      dispatch(removeBookmark(id));
      persistDeleteBookmark(id);
    },
    [dispatch],
  );

  const updateLabel = useCallback(
    (id: string, label: string) => {
      dispatch(updateBookmarkLabel({id, label}));
      persistUpdateLabel(id, label);
    },
    [dispatch],
  );

  const clearAll = useCallback(() => {
    dispatch(clearAllBookmarks());
    clearAllBookmarksInStorage();
  }, [dispatch]);

  return useMemo(
    () => ({
      allBookmarks,
      bookmarksForFile,
      bookmarkCount,
      bookmarkCountForFile,
      add,
      remove,
      updateLabel,
      clearAll,
    }),
    [
      allBookmarks,
      bookmarksForFile,
      bookmarkCount,
      bookmarkCountForFile,
      add,
      remove,
      updateLabel,
      clearAll,
    ],
  );
}
