// ─── Audiobooks Screen Hook ──────────────────────────────────────────
// Phase 3 formula: per-scope cache + infinite scroll + search persistence.
//
// A "scope" is a (tab, searchTerm, selectedGenre) triplet. Every
// combination is cached independently, so:
//   • toggling tabs never loses results already loaded for that scope
//   • typing a search never clears the genre/tab browse data
//   • scrolling back to a visited tab shows its cached list instantly
// Pagination: LibriVox has no total-count field, so hasMore is derived
// from `items.length === PAGE_SIZE`.

import {useCallback, useEffect, useRef, useState} from 'react';
import {
  searchAudiobooks,
  searchByGenre,
  getRecentAudiobooks,
} from '../../../services/api/librivoxService';
import type {AudiobookResult} from '../../../types/api';

export type AudiobooksTab = 'search' | 'genres' | 'recent';

const PAGE_SIZE = 20;

export interface AudiobookScopeState {
  items: AudiobookResult[];
  /** Last loaded page (1-based). 0 = nothing loaded yet. */
  page: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

/** Shared immutable empty state — keeps memoized scenes stable. */
const EMPTY_SCOPE: AudiobookScopeState = {
  items: [],
  page: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

function scopeCacheKey(tab: AudiobooksTab, term: string, genre: string): string {
  return `${tab}|${term.trim()}|${genre}`;
}

function dedupe(items: AudiobookResult[]): AudiobookResult[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

export function useAudiobooksScreen(initialTab?: string, initialGenre?: string) {
  const [selectedTab, setSelectedTab] = useState<AudiobooksTab>(
    (initialTab as AudiobooksTab) || 'search',
  );
  const [selectedGenre, setSelectedGenre] = useState<string | null>(
    initialGenre ?? null,
  );

  // ── Search (debounced upstream via SearchBar onDebouncedChange) ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [scopes, setScopes] = useState<Record<string, AudiobookScopeState>>({});
  const seqRef = useRef<Record<string, number>>({});
  const guardRef = useRef<Set<string>>(new Set());

  const isSearchActive = searchTerm.trim().length > 0;

  const keyFor = useCallback(
    (tab: AudiobooksTab) =>
      scopeCacheKey(tab, searchTerm, selectedGenre ?? ''),
    [searchTerm, selectedGenre],
  );

  const getScope = useCallback(
    (tab: AudiobooksTab): AudiobookScopeState =>
      scopes[keyFor(tab)] ?? EMPTY_SCOPE,
    [scopes, keyFor],
  );

  const patchScope = useCallback(
    (tab: AudiobooksTab, patch: Partial<AudiobookScopeState>) => {
      const key = keyFor(tab);
      setScopes(prev => ({
        ...prev,
        [key]: {...(prev[key] ?? EMPTY_SCOPE), ...patch},
      }));
    },
    [keyFor],
  );

  const fetchPage = useCallback(
    async (tab: AudiobooksTab, page: number, mode: 'initial' | 'more') => {
      const term = searchTerm.trim();
      const genre = selectedGenre;
      const key = scopeCacheKey(tab, term, genre ?? '');
      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] = (seqRef.current[key] ?? 0) + 1);

      if (mode === 'initial') {
        patchScope(tab, {isLoading: true, error: null});
      } else {
        patchScope(tab, {isLoadingMore: true, error: null});
      }

      try {
        let items: AudiobookResult[] = [];

        if (tab === 'search' && term) {
          items = await searchAudiobooks(term, {limit: PAGE_SIZE, page});
        } else if (tab === 'genres' && genre) {
          items = await searchByGenre(genre, {limit: PAGE_SIZE, page});
        } else if (tab === 'recent') {
          items = await getRecentAudiobooks({limit: PAGE_SIZE, page});
        }

        if (seq !== (seqRef.current[key] ?? 0)) return; // stale response

        setScopes(prev => {
          const cur = prev[key] ?? EMPTY_SCOPE;
          return {
            ...prev,
            [key]: {
              ...cur,
              items:
                mode === 'more'
                  ? dedupe([...cur.items, ...items])
                  : items,
              page,
              hasLoaded: true,
              isLoading: false,
              isLoadingMore: false,
              error: null,
            },
          };
        });
      } catch (err) {
        if (seq !== (seqRef.current[key] ?? 0)) return;
        patchScope(tab, {
          isLoading: false,
          isLoadingMore: false,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to load audiobooks',
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, selectedGenre, patchScope],
  );

  const ensureLoaded = useCallback(
    (tab: AudiobooksTab) => {
      // For 'search' tab with no term, or 'genres' tab with no genre
      // selected, there's nothing to fetch yet — don't trigger a load.
      if (tab === 'search' && !searchTerm.trim()) return;
      if (tab === 'genres' && !selectedGenre) return;
      const scope = getScope(tab);
      if (scope.hasLoaded || scope.isLoading) return;
      fetchPage(tab, 1, 'initial');
    },
    [getScope, fetchPage, searchTerm, selectedGenre],
  );

  const loadMore = useCallback(
    (tab: AudiobooksTab) => {
      const scope = getScope(tab);
      if (!scope.hasLoaded || scope.isLoading || scope.isLoadingMore) return;
      if (scope.items.length % PAGE_SIZE !== 0) return; // partial page = end
      if (scope.items.length === 0) return; // nothing to load more of
      fetchPage(tab, scope.page + 1, 'more');
    },
    [getScope, fetchPage],
  );

  const retry = useCallback(
    (tab: AudiobooksTab) => {
      const key = keyFor(tab);
      seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
      setScopes(prev => {
        const cur = prev[key];
        if (!cur) return prev;
        return {...prev, [key]: {...cur, items: [], hasLoaded: false}};
      });
      fetchPage(tab, 1, 'initial');
    },
    [keyFor, fetchPage],
  );

  const selectTab = useCallback((tab: AudiobooksTab) => {
    setSelectedTab(tab);
  }, []);

  const selectGenre = useCallback(
    (genre: string) => {
      setSelectedGenre(prev => (prev === genre ? null : genre));
    },
    [],
  );

  // Keep the current tab scoped-loaded when it (or the search term, or
  // selected genre) changes.
  useEffect(() => {
    ensureLoaded(selectedTab);
  }, [selectedTab, ensureLoaded, keyFor]);

  return {
    selectedTab,
    selectTab,
    selectedGenre,
    selectGenre,
    // search
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    // per-scope data + actions
    getScope,
    ensureLoaded,
    loadMore,
    retry,
  };
}
