import {useCallback, useImperativeHandle, useMemo, type ForwardedRef} from 'react';
import {
  useBookmarksStore,
  MAX_BOOKMARK_ENTRIES,
  BOOKMARK_POSITION_TOLERANCE_SEC,
} from '../../state';
import type {
  Bookmark,
  BookmarkInput,
  BookmarkPositionUpdate,
} from '../../state';
import {mediaKey} from '../../infrastructure/player/playbackProgress';

export type {
  Bookmark,
  BookmarkInput,
  BookmarkPositionUpdate,
} from '../../state';
export {MAX_BOOKMARK_ENTRIES} from '../../state';

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

/**
 * Two bookmarks count as "the same moment" when they are within this
 * many seconds of each other.
 *
 * Defined in the store, re-exported here. It used to exist twice — the
 * store compared `< 1`, and the player's toggle would have had to
 * re-derive it. When two sides disagree, the toggle reports "not
 * bookmarked" on a position the store considers bookmarked, and
 * pressing it silently creates a duplicate. Putting the definition
 * under the store keeps the dependency pointing one way (feature →
 * state), not both.
 */
export {BOOKMARK_POSITION_TOLERANCE_SEC} from '../../state/bookmarksStore';

/** Do these two positions refer to the same bookmarked moment? */
export function isSameBookmarkPosition(a: number, b: number): boolean {
  return Math.abs(a - b) < BOOKMARK_POSITION_TOLERANCE_SEC;
}

/**
 * Bookmarks belonging to one media item.
 *
 * Compares on the **normalised** URI (W9.4), matching how the resume
 * reader and the history store key media. A raw comparison would miss a
 * bookmark saved as `/a/b.mkv` when the player is playing
 * `file:///a/b.mkv` — the same file, one entry, invisible.
 */
export function bookmarksForUri(
  items: readonly Bookmark[],
  uri: string | undefined,
): Bookmark[] {
  if (!uri) return [];
  const key = mediaKey(uri);
  return items.filter(b => mediaKey(b.fileUri) === key);
}

/** A14: bookmark id is now `(fileUri, position)`-derived so multiple
 *  bookmarks per file are allowed. Two saves at the same position
 *  collapse to one id; saves at different positions get different ids.
 *  Old persisted ids (fileUri-only) are still matched by the
 *  `addBookmark` reducer's "same position" fallback. */
function buildStableBookmarkId(fileUri: string, position: number): string {
  const posBucket = Math.floor(Math.max(0, position));
  return `bookmark-${encodeURIComponent(fileUri)}-${posBucket}`;
}

function dispatchAddBookmark(
  items: Bookmark[],
  input: BookmarkInput,
  options?: BookmarkAddOptions,
): BookmarkAddResult {
  // A14: "existing" is now the entry matching the position-scoped id,
  // or the most recent per file at a near-identical position
  // (within 1 second — keeps taps on the same frame idempotent).
  const sameId = input.id ? items.findIndex(item => item.id === input.id) : -1;
  const samePosition = sameId >= 0
    ? items[sameId]
    : items.find(
        item => item.fileUri === input.fileUri && Math.abs(item.position - input.position) < 1,
      );
  const existing = sameId >= 0 ? items[sameId] : samePosition;

  // A full list is only worth interrupting the user for when WE are the
  // ones choosing what to drop. An `evictId` means the caller already
  // asked, and what it wants to remove — the 21st-bookmark flow has the
  // user pick the victim from a list. The old gate compared the
  // requested id against `oldestBookmark` and refused anything that
  // wasn't the oldest, so a user who deliberately chose which bookmark
  // to give up would silently get "requires-confirmation" again and the
  // bookmark would never be saved.
  if (!existing && items.length >= MAX_BOOKMARK_ENTRIES && options?.evictId == null) {
    const candidate = oldestBookmark(items);
    if (candidate) {
      return {status: 'requires-confirmation', candidate, requested: input};
    }
  }

  const bookmark: Bookmark = {
    id: existing?.id ?? input.id ?? buildStableBookmarkId(input.fileUri, input.position),
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

  useBookmarksStore.getState().addBookmark({bookmark, evictId: options?.evictId});
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
  const allBookmarks = useBookmarksStore(s => s.items);
  const bookmarksForFile = useMemo(
    () => (fileUri ? allBookmarks.filter(b => b.fileUri === fileUri) : []),
    [allBookmarks, fileUri],
  );
  const bookmarkCount = allBookmarks.length;
  const bookmarkCountForFile = bookmarksForFile.length;

  const getBookmarks = useCallback(() => allBookmarks, [allBookmarks]);
  const add = useCallback(
    (input: BookmarkInput, options?: BookmarkAddOptions) =>
      dispatchAddBookmark(allBookmarks, input, options),
    [allBookmarks],
  );
  const updatePosition = useCallback((update: BookmarkPositionUpdate) => {
    useBookmarksStore.getState().updateBookmarkPosition(update);
  }, []);
  const remove = useCallback((id: string) => {
    useBookmarksStore.getState().removeBookmark(id);
  }, []);
  const updateLabel = useCallback((id: string, label: string) => {
    useBookmarksStore.getState().updateBookmarkLabel({id, label});
  }, []);
  const clearAll = useCallback(() => {
    useBookmarksStore.getState().clearAllBookmarks();
  }, []);

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
  input: BookmarkInput,
  items: Bookmark[],
  options?: BookmarkAddOptions,
): BookmarkAddResult {
  return dispatchAddBookmark(items, input, options);
}

export function updateBookmarkPosition(update: BookmarkPositionUpdate): void {
  useBookmarksStore.getState().updateBookmarkPosition(update);
}

export function removeBookmark(id: string): void {
  useBookmarksStore.getState().removeBookmark(id);
}

export function clearBookmarks(): void {
  useBookmarksStore.getState().clearAllBookmarks();
}
