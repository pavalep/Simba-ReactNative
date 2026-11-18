// ─── Audiobooks Screen — AudiobooksDataProvider ────────────────────────
// Sits ABOVE the shell so the single content stream shares ONE query
// instance, and owns the per-book press handler.
//
// WAVE B16 — this file is new.
//
// The provider exists for the same reason the Music and Movies screens
// have one: the content component must not reach for the navigation
// prop, and the scope (the genre, the search term) must have ONE owner
// that the shell's filter and search field push into.
//
// The scope is pushed DOWN from the content, not pulled up from it:
// `BrowseLayout` owns the filter and the search field, so the content
// reads `ctx.options.filter` and `ctx.query` and hands them to the
// provider, which turns them into the hook's inputs.

import React, {useCallback, useMemo, useState, type ReactNode} from 'react';
import {navigate} from '../../../navigation/navigationHelper';
import {useAudiobooksScreen} from '../hooks/useAudiobooksScreen';
import type {AudiobookResult} from '../../../types/api';

interface AudiobooksDataContextValue {
  /** The active scope's data. */
  items: AudiobookResult[];
  /** Which scope the feed is answering — 'term' | 'genre' | 'all'. */
  scopeKind: 'term' | 'genre' | 'all';
  /** The scope's own label, for the empty-state copy. */
  scopeLabel: string | undefined;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  /** The failed NEXT PAGE's error — the footer's copy, not the list's. */
  pageError: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
  /** The pull-to-refresh gesture's state. */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
  /** The active genre — '' when none. */
  activeGenre: string;
  /** The active search term. */
  activeSearchTerm: string;
  /** Push the shell's filter down into the scope. */
  setActiveGenre: (genre: string) => void;
  /** Push the shell's search field down into the scope. */
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  /** A row tap opens the BOOK'S OWN PAGE. */
  handleBookPress: (book: AudiobookResult) => void;
}

const AudiobooksDataContext = React.createContext<AudiobooksDataContextValue | null>(
  null,
);

function useAudiobooksData(): AudiobooksDataContextValue {
  const ctx = React.useContext(AudiobooksDataContext);
  if (!ctx) {
    throw new Error(
      'useAudiobooksData must be used inside <AudiobooksDataProvider>.',
    );
  }
  return ctx;
}

export {useAudiobooksData};

export const AudiobooksDataProvider: React.FC<{
  children: ReactNode;
}> = ({children}) => {
  // The active scope. The content pushes the shell's filter and search
  // term down here; the hook reads them as inputs.
  const [activeGenre, setActiveGenre] = useState('');
  const [activeSearchTerm, setSearchTerm] = useState('');

  const books = useAudiobooksScreen({
    genre: activeGenre,
    searchTerm: activeSearchTerm,
  });

  /**
   * A row tap opens the BOOK'S OWN PAGE.
   *
   * The book is a collection of chapters, not a playable file, so the
   * list row has no play action of its own — the detail screen carries
   * the chapter list, and the chapter list is what the player is given.
   * That is the grammar every other catalogue row in the app uses: the
   * Music row opens the track's page, the Movie row opens the film's
   * page, and the Podcast row opens the feed's page.
   */
  const handleBookPress = useCallback((book: AudiobookResult) => {
    navigate('AudiobookDetail', {bookId: book.id, bookTitle: book.title});
  }, []);

  const isSearchActive = activeSearchTerm.trim().length > 0;

  const value = useMemo<AudiobooksDataContextValue>(
    () => ({
      items: books.items,
      scopeKind: books.scopeKind,
      scopeLabel: books.scopeLabel,
      hasLoaded: books.hasLoaded,
      isLoading: books.isLoading,
      isLoadingMore: books.isLoadingMore,
      hasNextPage: books.hasNextPage,
      error: books.error,
      pageError: books.pageError,
      fetchNextPage: books.fetchNextPage,
      refetch: books.refetch,
      refreshing: books.refreshing,
      refresh: books.refresh,
      activeGenre,
      activeSearchTerm,
      setActiveGenre,
      setSearchTerm,
      isSearchActive,
      handleBookPress,
    }),
    [
      books.items,
      books.scopeKind,
      books.scopeLabel,
      books.hasLoaded,
      books.isLoading,
      books.isLoadingMore,
      books.hasNextPage,
      books.error,
      books.pageError,
      books.fetchNextPage,
      books.refetch,
      books.refreshing,
      books.refresh,
      activeGenre,
      activeSearchTerm,
      isSearchActive,
      handleBookPress,
    ],
  );

  return (
    <AudiobooksDataContext.Provider value={value}>
      {children}
    </AudiobooksDataContext.Provider>
  );
};
