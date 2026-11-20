// ─── Bookmarks — data hook ─────────────────────────────────────────────
//
// WAVE B16 (Wave B2) — rewritten.
//
// The hook used to own the search term as its own `useState`, because
// the page drew its own `SearchBar`. The search field is the shell's
// now, so the term belongs to the option model and reaches this hook
// through the provider.

import {useCallback, useMemo} from 'react';
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

export interface UseBookmarksScreenParams {
  /** The shell's search term — the provider owns it and pushes it down. */
  searchQuery?: string;
};

export interface UseBookmarksScreenResult {
  /** Every bookmark the user has. */
  allBookmarks: Bookmark[];
  /** How many bookmarks there are. */
  bookmarkCount: number;
  /** The bookmarks the search term keeps. */
  filteredBookmarks: Bookmark[];
  /** Open a bookmark at its saved position. */
  handlePress: (item: Bookmark) => void;
  /** Direct removal without confirm dialog. */
  removeBookmark: (id: string) => void;
  /** Direct clear all without confirm dialog. */
  clearAllBookmarks: () => void;
};

export function useBookmarksScreen({
  searchQuery = '',
}: UseBookmarksScreenParams = {}): UseBookmarksScreenResult {
  // W7 P26: `usePlayWithResume` replaces the direct `useResumeAwareLaunch().openPlayer`
  // call. Pre-P26, `handlePress` did not pass `startPositionMs` at all — every
  // bookmark open played from the beginning, silently ignoring the saved position.
  // The new hook threads the position through (with the seconds→ms conversion).
  // W22 F/U: `usePlayWithResume` now returns
  // `Result<PlaybackId, StreamError>` (matching `usePlaybackFacade().launch.openWithResume`).
  // Pre-W22 the return was `Promise<boolean>` and a `false` reply surfaced
  // a single generic toast. Now we branch on the 4 `StreamError` variants
  // so the user sees a specific reason. Today, the V12 bridge maps every
  // failure to `NetworkStreamError`; the W22 follow-up (native bridge
  // surfacing HTTP status codes) lights up the other variants without
  // changing the call site.
  const playWithResume = usePlayWithResume();
  const toast = useToast();
  const {allBookmarks, bookmarkCount, remove, clearAll} = useBookmarks();

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
    filteredBookmarks,
    handlePress,
    removeBookmark,
    clearAllBookmarks,
  };
}