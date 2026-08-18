// ─── Movies Screen Hook ─────────────────────────────────────────────────
// v10.2 FAB-only multi-select: per-scope cache + infinite scroll + search
// persistence. No tabs — the FAB's FILTER group is the category picker.
//
// v10.2 multi-select: multiple categories may be active at once. We
// concatenate their IA `subject` query clauses with `OR` and run a
// single search. Per-combination cache, so every distinct (sorted
// category set, search term) pair has its own page-1/page-N state.
//
// A "scope" is a ({categories sorted, searchTerm}, sortKey) tuple.
// Every combination is cached independently:
//   • adding a category to the active set invalidates that sorted set's
//     scope (fresh fetch)
//   • typing a search invalidates the term key (fresh fetch)
//   • revisiting a combination shows its cached list instantly
//
// Pagination is driven by IA's `numFound` — `loadMore` fetches the next
// page only while `items.length < numFound`. `sortKey` re-fetches the
// active scope.

import {useCallback, useRef, useState} from 'react';
import {MOVIE_CATEGORIES, withJunkFilter} from '../../../constants/movieCategories';
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
  /** Snapshot of the inputs that produced this scope — used to detect
   *  when the consumer flips the selection and we need to refetch. */
  categoryIds: string[];
  sortKey?: string;
  term: string;
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
  categoryIds: [],
  term: '',
};

/** Stable cache key — sorted ids ensure (a, b) and (b, a) hit the same
 *  cache entry. */
export function scopeCacheKey(
  categoryIds: readonly string[],
  term: string,
  sortKey?: string,
): string {
  const sorted = [...categoryIds].sort().join(',');
  return `${sorted}|${term.trim()}|${sortKey ?? ''}`;
}

/** Build the IA query string for one or more categories. Each category
 *  carries its own `subject(...)` clause; we OR them so the result set
 *  is the UNION of all selected categories. Empty selection = "All". */
function buildCombinedQuery(categoryIds: readonly string[]): string {
  if (categoryIds.length === 0) {
    return MOVIE_CATEGORIES.find(c => c.id === 'all')?.query
      ?? MOVIE_CATEGORIES[0]?.query
      ?? '';
  }
  // `.filter((c): c is string => c !== undefined)` — strict-TS-safe
  // narrowing; `.filter(Boolean)` alone can leave the element type
  // `string | undefined` in some configurations.
  const clauses = categoryIds
    .map(id => MOVIE_CATEGORIES.find(c => c.id === id)?.query)
    .filter((c): c is string => c !== undefined);
  if (clauses.length === 0) return '';
  if (clauses.length === 1) return clauses[0];
  // Each disjunct must be parenthesized on its own — IA's parser rejects
  // a bare `A OR B OR C` chain (AND binds tighter than OR), returning
  // zero results instead of the union.
  return clauses.map(c => `(${c})`).join(' OR ');
}

/** Map sort key (UI) to IA's `sort[]` parameter. undefined = IA default.
 *  All real sorting is delegated to IA so pagination appends in the
 *  correct order with zero client-side post-sorting. */
function sortParamFor(sortKey?: string): string | undefined {
  switch (sortKey) {
    case 'popular':
      return 'downloads desc';
    case 'newest':
      return 'date desc';
    case 'oldest':
      return 'date asc';
    case 'az':
      return 'title asc';
    case 'za':
      return 'title desc';
    case 'rating':
      return 'avg_rating desc';
    case undefined:
    default:
      return undefined;
  }
}

function dedupe(items: InternetArchiveVideoResult[]): InternetArchiveVideoResult[] {
  const seen = new Set<string>();
  return items.filter(i => {
    if (seen.has(i.identifier)) return false;
    seen.add(i.identifier);
    return true;
  });
}

export interface UseMoviesScreenParams {
  /** Currently active category ids (0+). */
  categoryIds: readonly string[];
  /** Currently active sort key (undefined = IA default). */
  sortKey?: string;
}

export interface UseMoviesScreenReturn {
  // search
  searchQuery: string;
  /** Raw (untrimmed) search term — the cache-key component the provider
   *  re-exposes so consumers can key load effects on it. */
  searchTerm: string;
  setSearchQuery: (q: string) => void;
  setSearchTerm: (t: string) => void;
  isSearchActive: boolean;
  // per-scope data + actions
  getScope: (categoryIds: readonly string[]) => MovieScopeState;
  ensureLoaded: (categoryIds: readonly string[]) => void;
  loadMore: (categoryIds: readonly string[]) => void;
  retry: (categoryIds: readonly string[]) => void;
  refresh: (categoryIds: readonly string[]) => void;
}

export function useMoviesScreenParams({
  categoryIds,
  sortKey,
}: UseMoviesScreenParams): UseMoviesScreenReturn {
  // ── Search (debounced upstream via SearchBar onDebouncedChange) ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [scopes, setScopes] = useState<Record<string, MovieScopeState>>({});
  /** Monotonic per-key sequence — drops stale/out-of-order responses. */
  const seqRef = useRef<Record<string, number>>({});
  /** In-flight keys — one fetch per scope at a time. */
  const guardRef = useRef<Set<string>>(new Set());

  const isSearchActive = searchTerm.trim().length > 0;

  const keyFor = useCallback(
    (ids: readonly string[]) =>
      scopeCacheKey(ids, searchTerm, sortKey),
    [searchTerm, sortKey],
  );

  const getScope = useCallback(
    (ids: readonly string[]): MovieScopeState =>
      scopes[keyFor(ids)] ?? EMPTY_SCOPE,
    [scopes, keyFor],
  );

  const patchScope = useCallback(
    (ids: readonly string[], patch: Partial<MovieScopeState>) => {
      const key = keyFor(ids);
      setScopes(prev => ({
        ...prev,
        [key]: {...(prev[key] ?? EMPTY_SCOPE), ...patch},
      }));
    },
    [keyFor],
  );

  const fetchPage = useCallback(
    async (
      ids: readonly string[],
      page: number,
      mode: 'initial' | 'more',
    ) => {
      const term = searchTerm.trim();
      const key = keyFor(ids);
      const sortClause = sortParamFor(sortKey);
      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] = (seqRef.current[key] ?? 0) + 1);

      // Combine selected categories with OR; append the search term
      // scoped to title; append the junk filter to drop test clips.
      const categoryQuery = buildCombinedQuery(ids);
      const termFilter = term
        ? ` AND title:(${term.replace(/"/g, '')})`
        : '';
      const scopedQuery = withJunkFilter(`${categoryQuery}${termFilter}`);

      if (mode === 'initial') {
        patchScope(ids, {isLoading: true, error: null, term});
      } else {
        patchScope(ids, {isLoadingMore: true, error: null, term});
      }

      try {
        const result = await searchInternetArchiveVideos(scopedQuery, {
          limit: PAGE_SIZE,
          page,
          sort: sortClause,
        });
        if (seq !== (seqRef.current[key] ?? 0)) return; // stale response

        setScopes(prev => {
          const cur = prev[key] ?? EMPTY_SCOPE;
          return {
            ...prev,
            [key]: {
              ...cur,
              categoryIds: [...ids],
              sortKey,
              term,
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
        patchScope(ids, {
          isLoading: false,
          isLoadingMore: false,
          error: err instanceof Error ? err.message : 'Failed to load movies',
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, sortKey, patchScope, keyFor],
  );

  /** Load page 1 for a combination if it isn't loaded yet (scene mount). */
  const ensureLoaded = useCallback(
    (ids: readonly string[]) => {
      const scope = getScope(ids);
      if (scope.hasLoaded || scope.isLoading) return;
      fetchPage(ids, 1, 'initial');
    },
    [getScope, fetchPage],
  );

  /** Infinite scroll: fetch the next page when available. */
  const lastLoadMoreAtRef = useRef<Record<string, number>>({});
  const loadMore = useCallback(
    (ids: readonly string[]) => {
      const scope = getScope(ids);
      if (!scope.hasLoaded || scope.isLoading || scope.isLoadingMore) return;
      if (scope.items.length >= scope.numFound) return;

      const now = Date.now();
      const lastAt = lastLoadMoreAtRef.current[keyFor(ids)] ?? 0;
      if (now - lastAt < 600) return;
      lastLoadMoreAtRef.current[keyFor(ids)] = now;

      fetchPage(ids, scope.page + 1, 'more');
    },
    [getScope, fetchPage, keyFor],
  );

  /** Re-fetch page 1 after an error (invalidates any stale in-flight seq). */
  const retry = useCallback(
    (ids: readonly string[]) => {
      const key = keyFor(ids);
      seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
      setScopes(prev => {
        const cur = prev[key];
        if (!cur) return prev;
        return {
          ...prev,
          [key]: {...cur, items: [], hasLoaded: false, error: null},
        };
      });
      fetchPage(ids, 1, 'initial');
    },
    [keyFor, fetchPage],
  );

  /** Pull-to-refresh: re-fetch page 1 while KEEPING items visible. */
  const refresh = useCallback(
    (ids: readonly string[]) => {
      const scope = getScope(ids);
      if (scope.isLoading || scope.isLoadingMore) return;
      fetchPage(ids, 1, 'initial');
    },
    [getScope, fetchPage],
  );

  return {
    searchQuery,
    searchTerm,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refresh,
  };
}