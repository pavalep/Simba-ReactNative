// ─── Bookmarks — BookmarksDataProvider ─────────────────────────────────
// Sits ABOVE the shell so the page's scope has ONE owner.
//
// WAVE B16 (Wave B2) — this file is new.
//
// The provider exists for the same reason the Music, Movies, Podcasts,
// Audiobooks and All Audio screens have one: the scope must have ONE
// owner, and the shell's search field pushes into it.
//
// The scope is pushed DOWN from the content, not pulled up from it:
// `BrowseLayout` owns the search field, so the content reads `ctx.query`
// and hands it to the provider, which turns it into the hook's input.

import React, {useCallback, useContext, useMemo, useState, type ReactNode} from 'react';
import type {Bookmark} from '../../../features/bookmarks';
import {useBookmarksScreen} from '../hooks/useBookmarksScreen';

interface BookmarksDataContextValue {
  /** Every bookmark the user has. */
  allBookmarks: Bookmark[];
  /** How many bookmarks there are. */
  bookmarkCount: number;
  /** The bookmarks the search term keeps. */
  filteredBookmarks: Bookmark[];
  /** Open a bookmark at its saved position. */
  handlePress: (item: Bookmark) => void;
  /** Remove one bookmark — the caller confirms first. */
  removeBookmark: (id: string) => void;
  /** Push the shell's search field down into the scope. */
  setSearchQuery: (query: string) => void;
};

const BookmarksDataContext = React.createContext<BookmarksDataContextValue | null>(
  null,
);

export function useBookmarksData(): BookmarksDataContextValue {
  const ctx = useContext(BookmarksDataContext);
  if (!ctx) {
    throw new Error('useBookmarksData must be used inside <BookmarksDataProvider>.');
  }
  return ctx;
};

export const BookmarksDataProvider: React.FC<{children: ReactNode}> = ({children}) => {
  // The shell's search field owns the term; the provider owns the
  // scope it scopes, and hands the term to the hook.
  const [searchQuery, setSearchQuery] = useState('');

  const page = useBookmarksScreen({searchQuery});

  // The setters are stable identities, so the content's push-down
  // effect does not re-run on every render of the provider.
  const stableSetSearchQuery = useCallback((q: string) => setSearchQuery(q), []);

  const value = useMemo<BookmarksDataContextValue>(
    () => ({
      allBookmarks: page.allBookmarks,
      bookmarkCount: page.bookmarkCount,
      filteredBookmarks: page.filteredBookmarks,
      handlePress: page.handlePress,
      removeBookmark: page.removeBookmark,
      setSearchQuery: stableSetSearchQuery,
    }),
    [
      page.allBookmarks,
      page.bookmarkCount,
      page.filteredBookmarks,
      page.handlePress,
      page.removeBookmark,
      stableSetSearchQuery,
    ],
  );

  return (
    <BookmarksDataContext.Provider value={value}>
      {children}
    </BookmarksDataContext.Provider>
  );
};