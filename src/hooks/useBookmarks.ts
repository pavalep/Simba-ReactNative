/**
 * Compatibility bridge for older imports.
 * Bookmark state, persistence, retention, and commands live in features/bookmarks.
 */
export {
  useBookmarks,
  addBookmark,
  updateBookmarkPosition,
  removeBookmark,
  clearBookmarks,
} from '../features/bookmarks';

export type {
  Bookmark,
  BookmarkInput,
  BookmarkPositionUpdate,
  BookmarkAddOptions,
  BookmarkAddResult,
  BookmarkHandle,
} from '../features/bookmarks';
