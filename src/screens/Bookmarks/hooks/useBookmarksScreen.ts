import {useCallback, useMemo, useState} from 'react';
import {usePlayWithResume} from '../../../infrastructure/player';
import {useBookmarks} from '../../../features/bookmarks';
import type {Bookmark} from '../../../features/bookmarks';

export interface UseBookmarksScreenResult {
  allBookmarks: ReturnType<typeof useBookmarks>['allBookmarks'];
  bookmarkCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredBookmarks: ReturnType<typeof useBookmarks>['allBookmarks'];
  handlePress: (item: Bookmark) => void;
  /** Direct removal without confirm dialog */
  removeBookmark: (id: string) => void;
  /** Direct clear all without confirm dialog */
  clearAllBookmarks: () => void;
}

export function useBookmarksScreen(): UseBookmarksScreenResult {
  // W7 P26: `usePlayWithResume` replaces the direct `usePlayerActivity().openPlayer`
  // call. Pre-P26, `handlePress` did not pass `startPositionMs` at all — every
  // bookmark open played from the beginning, silently ignoring the saved position.
  // The new hook threads the position through (with the seconds→ms conversion).
  const playWithResume = usePlayWithResume();
  const {allBookmarks, bookmarkCount, remove, clearAll} = useBookmarks();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return allBookmarks;
    const q = searchQuery.toLowerCase();
    return allBookmarks.filter(
      bookmark =>
        bookmark.title.toLowerCase().includes(q) ||
        bookmark.label?.toLowerCase().includes(q) ||
        bookmark.fileUri.toLowerCase().includes(q),
    );
  }, [allBookmarks, searchQuery]);

  const handlePress = useCallback(
    (item: Bookmark) => {
      // W7 P26: thread the bookmark's `position` (in SECONDS — see
      // `src/state/bookmarksStore.ts:49` for the type contract) through
      // to the bridge as `startPositionMs`. The hook does the
      // seconds→ms conversion in one place.
      void playWithResume({
        uri: item.fileUri,
        title: item.title,
        mediaType: item.type,
        positionSec: item.position,
      });
    },
    [playWithResume],
  );

  const removeBookmark = useCallback(
    (id: string) => {
      remove(id);
    },
    [remove],
  );

  const clearAllBookmarks = useCallback(() => {
    clearAll();
  }, [clearAll]);

  return {
    allBookmarks,
    bookmarkCount,
    searchQuery,
    setSearchQuery,
    filteredBookmarks,
    handlePress,
    removeBookmark,
    clearAllBookmarks,
  };
}
