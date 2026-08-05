// ─── Movies Screen Hook ─────────────────────────────────────────────────
// Phase 3 formula: per-scope cache + infinite scroll + search persistence.
//
// A "scope" is a (category, searchTerm) pair. Every combination is cached
// independently (`key = "${categoryId}|${term}"`), so:
//   • toggling tabs never loses results already loaded for that scope
//   • typing a search never clears the category browse data
//   • scrolling back to a visited tab shows its cached list instantly
// Pagination is driven by IA's `numFound` — `loadMore` fetches the next
// page only while `items.length < numFound`.

import {useCallback, useEffect, useRef, useState} from 'react';
import {MOVIE_CATEGORIES} from '../../../constants/movieCategories';
import {searchInternetArchiveVideos} from '../../../services/api/internetArchiveService';
import type {InternetArchiveVideoResult} from '../../../types/api';

const PAGE_SIZE = 20;

export interface MovieScopeState {
  items: InternetArchiveVideoResult[];
  /** Total matches across all pages (drives hasMore). */
  numFound: number;
  /** Last loaded page (1-based). 0 = nothing loaded yet. */
  page: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

/** Shared immutable empty state — keeps memoized scenes stable. */
export const EMPTY_SCOPE: MovieScopeState = {
  items: [],
  numFound: 0,
  page: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

export function scopeCacheKey(categoryId: string, term: string): string {
  return `${categoryId}|${term.trim()}`;
}

function dedupe(items: InternetArchiveVideoResult[]): InternetArchiveVideoResult[] {
  const seen = new Set<string>();
  return items.filter(i => {
    if (seen.has(i.identifier)) return false;
    seen.add(i.identifier);
    return true;
  });
}

export function useMoviesScreen(initialCategoryId?: string) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategoryId ?? MOVIE_CATEGORIES[0]?.id ?? '',
  );

  // ── Search (debounced upstream via SearchBar onDebouncedChange) ──
  // searchQuery = live input; searchTerm = settled (debounced) value.
  // The term persists across tab switches by design.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [scopes, setScopes] = useState<Record<string, MovieScopeState>>({});
  /** Monotonic per-key sequence — drops stale/out-of-order responses. */
  const seqRef = useRef<Record<string, number>>({});
  /** In-flight keys — one fetch per scope at a time. */
  const guardRef = useRef<Set<string>>(new Set());

  const isSearchActive = searchTerm.trim().length > 0;

  const keyFor = useCallback(
    (categoryId: string) => scopeCacheKey(categoryId, searchTerm),
    [searchTerm],
  );

  const getScope = useCallback(
    (categoryId: string): MovieScopeState =>
      scopes[keyFor(categoryId)] ?? EMPTY_SCOPE,
    [scopes, keyFor],
  );

  const patchScope = useCallback(
    (categoryId: string, patch: Partial<MovieScopeState>) => {
      const key = keyFor(categoryId);
      setScopes(prev => ({
        ...prev,
        [key]: {...(prev[key] ?? EMPTY_SCOPE), ...patch},
      }));
    },
    [keyFor],
  );

  const fetchPage = useCallback(
    async (categoryId: string, page: number, mode: 'initial' | 'more') => {
      const category = MOVIE_CATEGORIES.find(c => c.id === categoryId);
      if (!category) return;

      const term = searchTerm.trim();
      const key = scopeCacheKey(categoryId, term);
      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] = (seqRef.current[key] ?? 0) + 1);

      // Scoped query: category subject + optional title term, so search
      // is filtered *within* the active category instead of replacing it.
      const scopedQuery = term
        ? `(${category.query}) AND title:(${term.replace(/"/g, '')})`
        : category.query;

      if (mode === 'initial') {
        patchScope(categoryId, {isLoading: true, error: null});
      } else {
        patchScope(categoryId, {isLoadingMore: true, error: null});
      }

      try {
        const result = await searchInternetArchiveVideos(scopedQuery, {
          limit: PAGE_SIZE,
          page,
          sort: category.sort,
        });
        if (seq !== (seqRef.current[key] ?? 0)) return; // stale response

        setScopes(prev => {
          const cur = prev[key] ?? EMPTY_SCOPE;
          return {
            ...prev,
            [key]: {
              ...cur,
              items:
                mode === 'more'
                  ? dedupe([...cur.items, ...result.items])
                  : result.items,
              numFound: result.numFound,
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
        patchScope(categoryId, {
          isLoading: false,
          isLoadingMore: false,
          error: err instanceof Error ? err.message : 'Failed to load movies',
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, patchScope],
  );

  /** Load page 1 for a category if it isn't loaded yet (scene mount). */
  const ensureLoaded = useCallback(
    (categoryId: string) => {
      const scope = getScope(categoryId);
      if (scope.hasLoaded || scope.isLoading) return;
      fetchPage(categoryId, 1, 'initial');
    },
    [getScope, fetchPage],
  );

  /** Infinite scroll: fetch the next page when available. */
  const loadMore = useCallback(
    (categoryId: string) => {
      const scope = getScope(categoryId);
      if (!scope.hasLoaded || scope.isLoading || scope.isLoadingMore) return;
      if (scope.items.length >= scope.numFound) return; // end of results
      fetchPage(categoryId, scope.page + 1, 'more');
    },
    [getScope, fetchPage],
  );

  /** Re-fetch page 1 after an error (invalidates any stale in-flight seq). */
  const retry = useCallback(
    (categoryId: string) => {
      const key = keyFor(categoryId);
      seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
      setScopes(prev => {
        const cur = prev[key];
        if (!cur) return prev;
        return {...prev, [key]: {...cur, items: [], hasLoaded: false}};
      });
      fetchPage(categoryId, 1, 'initial');
    },
    [keyFor, fetchPage],
  );

  /** Tab switch — search text intentionally survives. */
  const selectCategory = useCallback((id: string) => {
    setSelectedCategory(id);
  }, []);

  // Keep the current category scoped-loaded when it (or the search term)
  // changes — covers the very first mount and every new search term.
  useEffect(() => {
    if (selectedCategory) {
      ensureLoaded(selectedCategory);
    }
  }, [selectedCategory, ensureLoaded, keyFor]);

  return {
    selectedCategory,
    selectCategory,
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
