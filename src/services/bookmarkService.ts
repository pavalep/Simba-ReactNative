/**
 * Compatibility bridge for legacy service imports.
 * Bookmark persistence is implemented privately by features/bookmarks.
 */
export {
  loadPersistedBookmarks as loadBookmarks,
  persistBookmarks as persistBookmarkList,
  clearPersistedBookmarks as clearAllBookmarksInStorage,
} from '../features/bookmarks/bookmarkPersistence';

export async function saveBookmark(): Promise<void> {
  // Redux Persist now owns bookmark snapshots. Kept as a no-op compatibility
  // export for any external legacy callsites during the migration window.
}

export async function deleteBookmark(): Promise<void> {
  // Redux Persist now owns bookmark snapshots.
}

export async function updateBookmarkLabel(): Promise<void> {
  // Redux Persist now owns bookmark snapshots.
}
