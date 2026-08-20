import {useCallback, useEffect, useImperativeHandle, useMemo, useRef, type ForwardedRef} from 'react';
import {useAppDispatch, useAppSelector, type AppDispatch} from '../../store';
import {
  addBookmark as addBookmarkAction,
  clearAllBookmarks as clearAllBookmarksAction,
  removeBookmark as removeBookmarkAction,
  selectAllBookmarks,
  selectBookmarkCount,
  selectBookmarkCountForFile,
  selectBookmarksForFile,
  setBookmarks,
  updateBookmarkLabel as updateBookmarkLabelAction,
  updateBookmarkPosition as updateBookmarkPositionAction,
  type Bookmark,
  type BookmarkInput,
  type BookmarkPositionUpdate,
} from './bookmarkReducer';
import {MAX_BOOKMARK_ENTRIES} from './bookmarkReducer';
import {clearPersistedBookmarks, loadPersistedBookmarks, persistBookmarks} from './bookmarkPersistence';

export type {
  Bookmark,
  BookmarkInput,
  BookmarkPositionUpdate,
} from './bookmarkReducer';
export {MAX_BOOKMARK_ENTRIES} from './bookmarkReducer';

export type BookmarkAddResult =
  | {status: 'added'; bookmark: Bookmark}
  | {status: 'updated'; bookmark: Bookmark}
  | {
      status: 'requires-confirmation';
      candidate: Bookmark;
      requested: BookmarkInput;
    };

export interface BookmarkAddOptions {
  /** Must equal the returned candidate id after the user confirms eviction. */
  evictId?: string;
}

export interface BookmarkHandle {
  getBookmarks: () => Bookmark[];
  addBookmark: (input: BookmarkInput, options?: BookmarkAddOptions) => BookmarkAddResult;
  updateBookmarkPosition: (update: BookmarkPositionUpdate) => void;
  removeBookmark: (id: string) => void;
  updateBookmarkLabel: (id: string, label: string) => void;
  clearBookmarks: () => void;
}

function oldestBookmark(items: Bookmark[]): Bookmark | undefined {
  return items.reduce<Bookmark | undefined>((oldest, item) => {
    if (!oldest) return item;
    const oldestTime = Date.parse(oldest.createdAt);
    const itemTime = Date.parse(item.createdAt);
    return itemTime < oldestTime ? item : oldest;
  }, undefined);
}

function buildStableBookmarkId(fileUri: string): string {
  return `bookmark-${encodeURIComponent(fileUri)}`;
}

function dispatchAddBookmark(
  dispatch: AppDispatch,
  items: Bookmark[],
  input: BookmarkInput,
  options?: BookmarkAddOptions,
): BookmarkAddResult {
  const existing = items.find(item => item.fileUri === input.fileUri);
  if (!existing && items.length >= MAX_BOOKMARK_ENTRIES) {
    const candidate = oldestBookmark(items);
    if (candidate && options?.evictId !== candidate.id) {
      return {status: 'requires-confirmation', candidate, requested: input};
    }
  }

  const bookmark: Bookmark = {
    id: existing?.id ?? input.id ?? buildStableBookmarkId(input.fileUri),
    fileUri: input.fileUri,
    title: input.title || existing?.title || 'Untitled',
    position: Math.max(0, Number(input.position) || 0),
    duration: Math.max(0, Number(input.duration) || 0),
    createdAt: existing?.createdAt ?? input.createdAt ?? new Date().toISOString(),
    label: input.label || existing?.label || '',
    thumbnailPath: input.thumbnailPath || existing?.thumbnailPath,
    mediaType: input.mediaType ?? existing?.mediaType ?? 'video',
    type: input.type ?? existing?.type ?? 'video',
    source: input.source ?? existing?.source ?? 'api',
    provider: input.provider ?? existing?.provider,
    folderId: input.folderId ?? existing?.folderId,
  };

  dispatch(addBookmarkAction({bookmark, evictId: options?.evictId}));
  return {status: existing ? 'updated' : 'added', bookmark};
}

/**
 * Isolated Bookmark public API. A bookmark is created only through addBookmark,
 * normally called by an explicit bookmark action. Position updates never create
 * a new entry and never change createdAt, so overflow eviction remains predictable.
 */
export function useBookmarks(
  fileUri?: string,
  ref?: ForwardedRef<BookmarkHandle>,
): BookmarkHandle & {
  allBookmarks: Bookmark[];
  bookmarksForFile: Bookmark[];
  bookmarkCount: number;
  bookmarkCountForFile: number;
  add: (input: BookmarkInput, options?: BookmarkAddOptions) => BookmarkAddResult;
  remove: (id: string) => void;
  updateLabel: (id: string, label: string) => void;
  clearAll: () => void;
} {
  const dispatch = useAppDispatch();
  const allBookmarks = useAppSelector(selectAllBookmarks);
  const bookmarksForFile = useAppSelector(state =>
    fileUri ? selectBookmarksForFile(state, fileUri) : [],
  );
  const bookmarkCount = useAppSelector(selectBookmarkCount);
  const bookmarkCountForFile = useAppSelector(state =>
    fileUri ? selectBookmarkCountForFile(state, fileUri) : 0,
  );
  const hydratedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    void loadPersistedBookmarks().then(stored => {
      if (!mounted) return;
      if (stored.length > 0) dispatch(setBookmarks(stored));
      hydratedRef.current = true;
    });
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (hydratedRef.current) void persistBookmarks(allBookmarks);
  }, [allBookmarks]);

  const getBookmarks = useCallback(() => allBookmarks, [allBookmarks]);
  const add = useCallback(
    (input: BookmarkInput, options?: BookmarkAddOptions) =>
      dispatchAddBookmark(dispatch, allBookmarks, input, options),
    [allBookmarks, dispatch],
  );
  const updatePosition = useCallback(
    (update: BookmarkPositionUpdate) => {
      dispatch(updateBookmarkPositionAction(update));
    },
    [dispatch],
  );
  const remove = useCallback((id: string) => dispatch(removeBookmarkAction(id)), [dispatch]);
  const updateLabel = useCallback(
    (id: string, label: string) => dispatch(updateBookmarkLabelAction({id, label})),
    [dispatch],
  );
  const clearAll = useCallback(() => {
    dispatch(clearAllBookmarksAction());
    void clearPersistedBookmarks();
  }, [dispatch]);

  const handle = useMemo<BookmarkHandle>(
    () => ({
      getBookmarks,
      addBookmark: add,
      updateBookmarkPosition: updatePosition,
      removeBookmark: remove,
      updateBookmarkLabel: updateLabel,
      clearBookmarks: clearAll,
    }),
    [add, clearAll, getBookmarks, remove, updateLabel, updatePosition],
  );

  useImperativeHandle(ref, () => handle, [handle]);

  return {
    ...handle,
    allBookmarks,
    bookmarksForFile,
    bookmarkCount,
    bookmarkCountForFile,
    add,
    remove,
    updateLabel,
    clearAll,
  };
}

export function addBookmark(
  dispatch: AppDispatch,
  input: BookmarkInput,
  items: Bookmark[],
  options?: BookmarkAddOptions,
): BookmarkAddResult {
  return dispatchAddBookmark(dispatch, items, input, options);
}

export function updateBookmarkPosition(
  dispatch: AppDispatch,
  update: BookmarkPositionUpdate,
): void {
  dispatch(updateBookmarkPositionAction(update));
}

export function removeBookmark(dispatch: AppDispatch, id: string): void {
  dispatch(removeBookmarkAction(id));
}

export function clearBookmarks(dispatch: AppDispatch): void {
  dispatch(clearAllBookmarksAction());
  void clearPersistedBookmarks();
}
