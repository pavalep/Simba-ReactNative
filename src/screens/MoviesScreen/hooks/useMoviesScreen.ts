// ─── Movies Screen Hook ─────────────────────────────────────────────────
// v10.1 FAB-only formula: per-scope cache + infinite scroll + search
// persistence. No tabs — the FAB's FILTER group is the category picker.
//
// A "scope" is a (category, searchTerm) pair. Every combination is cached
// independently (`key = "${categoryId}|${term}"`), so:
//   • switching categories never loses results already loaded for that scope
//   • typing a search never clears the category browse data
//   • revisiting a category shows its cached list instantly
// Pagination is driven by IA's `numFound` — `loadMore` fetches the next
// page only while `items.length < numFound`.
//
// The active category is NOT owned here — the shell's useSectionOptions
// holds the FILTER state and `renderContent` passes the current key in
// (mirrors the Music hook). This hook is stateless re: category; the
// "All" default stream is the `all` category.

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

export function useMoviesScreen() {
  // ── Search (debounced upstream via SearchBar onDebouncedChange) ──
  // searchQuery = live input; searchTerm = settled (debounced) value.
  // The term persists across category switches by design.
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
      // Also appends JUNK_FILTER (drop test/template/screener etc.)
      // server-side — cheaper than client post-filter, matches the
      // "real films only" intent of the Movies section.
      const termFilter = term
        ? ` AND title:(${term.replace(/"/g, '')})`
        : '';
      const scopedQuery = withJunkFilter(`${category.query}${termFilter}`);

      if (mode === 'initial') {
        patchScope(categoryId, {isLoading: true, error: null});
      } else {
        patchScope(categoryId, {isLoadingMore: true, error: null});
      }

      try {
        const result = await searchInternetArchiveVideos(scopedQuery, {
          limit: PAGE_SIZE,
          page,
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

  /** Infinite scroll: fetch the next page when available.
   *  Guard against double-fires (RN's onEndReached can trigger while a
   *  previous fetch is still in flight — IA's search is slow, so the
   *  duplicate request makes the page feel stuck).
   *  Also rate-limit back-to-back triggers to one fetch per ~600ms
   *  (debounce) so a quick scroll-up-then-down doesn't queue a chain.
   */
  const lastLoadMoreAtRef = useRef<Record<string, number>>({});
  const loadMore = useCallback(
    (categoryId: string) => {
      const scope = getScope(categoryId);
      if (!scope.hasLoaded || scope.isLoading || scope.isLoadingMore) return;
      if (scope.items.length >= scope.numFound) return; // end of results

      const now = Date.now();
      const lastAt = lastLoadMoreAtRef.current[categoryId] ?? 0;
      if (now - lastAt < 600) return; // debounce back-to-back triggers
      lastLoadMoreAtRef.current[categoryId] = now;

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

  /** Pull-to-refresh: re-fetch page 1 while KEEPING items visible. The
   *  RefreshControl spins off `isLoading`; `hasLoaded` stays true, so the
   *  grid remains in the ready slot (the shared 'loading' skeleton is only
   *  for the first page-1 fetch). Guarded so a pull during any in-flight
   *  fetch can never stack requests (Phase 5.2 step 8). */
  const refresh = useCallback(
    (categoryId: string) => {
      const scope = getScope(categoryId);
      if (scope.isLoading || scope.isLoadingMore) return;
      fetchPage(categoryId, 1, 'initial');
    },
    [getScope, fetchPage],
  );

  return {
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
    refresh,
  };
}
