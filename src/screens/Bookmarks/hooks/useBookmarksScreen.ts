import {useCallback, useMemo, useState} from 'react';
import {
  isBlockedError,
  isExpiredError,
  isNetworkError,
  isUnsupportedError,
  usePlayWithResume,
} from '../../../infrastructure/player';
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
  // W22 F/U: `usePlayWithResume` now returns
  // `Result<PlaybackId, StreamError>` (matching `usePlaybackFacade().launch.openWithResume`).
  // Pre-W22 the return was `Promise<boolean>` and a `false` reply surfaced
  // a single generic toast. Now we branch on the 4 `StreamError` variants
  // so the user sees a specific reason. Today, the V12 bridge maps every
  // failure to `NetworkStreamError`; the W22 follow-up (native bridge
  // surfacing HTTP status codes) lights up the other variants without
  // changing the call site.
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
      // W22 F/U: typed `Result<PlaybackId, StreamError>` branching
      // (4 variants). The shared type guards live next to the
      // `StreamError` discriminated union in `streamErrors.ts` —
      // they're the same 4 used by `NowPlayingScreen.handleOpenFullPlayer`
      // (T23.07) so the per-variant toast strings stay consistent.
      void playWithResume({
        uri: item.fileUri,
        title: item.title,
        mediaType: item.type,
        positionSec: item.position,
      }).then(r => {
        if (r.ok) return;
        if (isNetworkError(r.error)) {
          toast.show('No connection. Bookmark will resume when online.', 'warning');
        } else if (isUnsupportedError(r.error)) {
          toast.show('This file format is not supported.', 'error');
        } else if (isExpiredError(r.error)) {
          toast.show('Sign in expired. Please sign in again.', 'warning');
        } else if (isBlockedError(r.error)) {
          toast.show('This content is not available in your region.', 'error');
        } else {
          toast.show('Could not open the bookmarked file.', 'error');
        }
      });
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
