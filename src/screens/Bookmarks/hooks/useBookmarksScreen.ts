import {useCallback, useMemo, useState} from 'react';
import {usePlayWithResume} from '../../../infrastructure/player';
import {useToast} from '../../../components/feedback/Toast';
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
  // W7 P28: surface failures to the user. Pre-P28, the bridge's
  // `false` return was silently swallowed — the bookmark "open"
  // was a no-op and the user saw nothing. The V12 bridge doesn't
  // surface rich error codes yet, so the catch block maps any
  // thrown error to a generic message. W22 follow-up: upgrade
  // `usePlayWithResume` to return `Result<PlaybackId, StreamError>`
  // and migrate this handler to the 4 typed variants.
  const toast = useToast();
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
      // W7 P28: wrap the playWithResume call so a bridge
      // rejection surfaces a toast (vs. silently failing pre-P28).
      const run = async () => {
        try {
          const accepted = await playWithResume({
            uri: item.fileUri,
            title: item.title,
            mediaType: item.type,
            positionSec: item.position,
          });
          if (!accepted) {
            toast.show('Could not open the bookmarked file.', 'error');
          }
        } catch {
          toast.show('Could not open the bookmarked file.', 'error');
        }
      };
      void run();
    },
    [playWithResume, toast],
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
