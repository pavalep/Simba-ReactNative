// ─── History — HistoryDataProvider ─────────────────────────────────────
// Sits ABOVE the shell so the page's scope has ONE owner.
//
// WAVE B16 (Wave B2) — this file is new.
//
// The provider exists for the same reason the Music, Movies, Podcasts,
// Audiobooks and All Audio screens have one: the scope must have ONE
// owner, and the shell's filter and search field push into it.
//
// The scope is pushed DOWN from the content, not pulled up from it:
// `BrowseLayout` owns the filter and the search field, so the content
// reads `ctx` and hands them to the provider, which turns them into
// the hook's inputs.

import React, {useCallback, useContext, useMemo, useState, type ReactNode} from 'react';
import {useHistoryScreen} from '../hooks/useHistoryScreen';

interface HistoryDataContextValue {
  /** The entries the scope shows. */
  visibleEntries: ReturnType<typeof useHistoryScreen>['visibleEntries'];
  /** Resume an entry at its saved position. */
  playEntry: ReturnType<typeof useHistoryScreen>['playEntry'];
  /** Remove one entry — the caller confirms first. */
  removeEntry: ReturnType<typeof useHistoryScreen>['removeEntry'];
  /** Push the shell's media-type filter down into the scope. */
  setFilter: (filter: string) => void;
  /** Push the shell's search field down into the scope. */
  setQuery: (query: string) => void;
};

const HistoryDataContext = React.createContext<HistoryDataContextValue | null>(null);

export function useHistoryData(): HistoryDataContextValue {
  const ctx = useContext(HistoryDataContext);
  if (!ctx) {
    throw new Error('useHistoryData must be used inside <HistoryDataProvider>.');
  }
  return ctx;
};

export const HistoryDataProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const page = useHistoryScreen({filter, query});

  // The setters are stable identities, so the content's push-down
  // effects do not re-run on every render of the provider.
  const stableSetFilter = useCallback((next: string) => setFilter(next), []);
  const stableSetQuery = useCallback((next: string) => setQuery(next), []);

  const value = useMemo<HistoryDataContextValue>(
    () => ({
      visibleEntries: page.visibleEntries,
      playEntry: page.playEntry,
      removeEntry: page.removeEntry,
      setFilter: stableSetFilter,
      setQuery: stableSetQuery,
    }),
    [
      page.visibleEntries,
      page.playEntry,
      page.removeEntry,
      stableSetFilter,
      stableSetQuery,
    ],
  );

  return (
    <HistoryDataContext.Provider value={value}>
      {children}
    </HistoryDataContext.Provider>
  );
};