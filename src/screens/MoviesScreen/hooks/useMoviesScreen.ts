// ─── Movies Screen Hook ─────────────────────────────────────────────────
// V18.6.2c: rewritten as a pure function of (categoryIds, searchTerm,
// sortKey). The pre-V18 implementation was 320 lines with a per-scope
// `Map<key, ScopeState>`, `seqRef` for stale-request cancellation,
// `guardRef` for in-flight dedup, `lastLoadMoreAtRef` for the scroll
// throttle, and a 3-branch (initial / more / retry) page handler.
// The V18-ideal version is ~100 lines.
//
// The active (categoryIds, searchTerm, sortKey) tuple becomes a
// single TanStack queryKey. Every combination is its own cache
// entry; revisiting a combination shows its cached list instantly.
// "Stale-request cancellation" is TanStack's own dedup — the
// queryKey changes when the inputs change, the in-flight query
// is cancelled, the new one fires. "In-flight dedup" is TanStack's
// per-key dedup.
//
// The hook returns the active scope's data + a refetch action.
// The "loadMore" is now client-side: we slice the FULL list (or
// filtered subset) in a useMemo and grow the display count as
// the user scrolls. (The IA advancedsearch API doesn't paginate
// the way we want — the page param drives the offset but the
// per-category filter is a single combined query — so a single
// fetch per scope is the right shape.)
//
// The public surface (UseMoviesScreenReturn) is preserved as
// much as possible so MoviesDataProvider can keep its API.

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useApiQuery} from '../../../hooks/useApiQuery';
import {MOVIE_CATEGORIES, withJunkFilter} from '../../../constants/movieCategories';
import {searchInternetArchiveVideos} from '../../../infrastructure/api/internetArchive/adapter';
import type {
  InternetArchiveVideoResult,
  PaginatedResult,
} from '../../../types/api';

const PAGE_SIZE = 20;
const FULL_LIMIT = 500; // IA advancedsearch is one-shot; we slice client-side

export interface MovieScopeState {
  items: InternetArchiveVideoResult[];
  numFound: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  categoryIds: string[];
  term: string;
  /** True if there are more items in the source beyond the displayed slice. */
  hasMore: boolean;
}

export interface UseMoviesScreenParams {
  categoryIds: readonly string[];
  searchTerm: string;
  sortKey?: string;
}

export interface UseMoviesScreenReturn {
  /** Scope data for the active inputs. */
  data: MovieScopeState;
  /** Increment the display count (client-side slice). */
  loadMore: () => void;
  /** Refetch the active scope. */
  refetch: () => void;
}

// ─── helpers ────────────────────────────────────────────────────────────

/** Stable cache key component — sorted ids ensure (a, b) and (b, a)
 *  hit the same cache entry. */
function sortedKey(categoryIds: readonly string[]): string {
  return [...categoryIds].sort().join(',');
}

/** Build the IA query string for one or more categories. Each category
 *  carries its own `subject(...)` clause; we OR them so the result
 *  set is the UNION of all selected categories. Empty selection
 *  = "All". */
function buildCombinedQuery(categoryIds: readonly string[]): string {
  if (categoryIds.length === 0) {
    return MOVIE_CATEGORIES.find(c => c.id === 'all')?.query
      ?? MOVIE_CATEGORIES[0]?.query
      ?? '';
  }
  const clauses = categoryIds
    .map(id => MOVIE_CATEGORIES.find(c => c.id === id)?.query)
    .filter((c): c is string => c !== undefined);
  if (clauses.length === 0) return '';
  if (clauses.length === 1) return clauses[0];
  // Each disjunct must be parenthesized on its own — IA's parser
  // rejects a bare `A OR B OR C` chain (AND binds tighter than OR).
  return clauses.map(c => `(${c})`).join(' OR ');
}

/** Map sort key (UI) to IA's `sort[]` parameter. undefined = IA
 *  default. All real sorting is delegated to IA so pagination
 *  appends in the correct order. */
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

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  return String(err);
}

// ─── hook ──────────────────────────────────────────────────────────────

export function useMoviesScreen({
  categoryIds,
  searchTerm,
  sortKey,
}: UseMoviesScreenParams): UseMoviesScreenReturn {
  const trimmed = searchTerm.trim();
  const cacheKey = sortedKey(categoryIds);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // The single source of truth for the active scope. Every
  // (sortedCategories, searchTerm, sortKey) tuple is its own
  // TanStack cache entry.
  const q = useApiQuery<PaginatedResult<InternetArchiveVideoResult>>({
    queryKey: ['ia', 'movies', cacheKey, trimmed, sortKey ?? ''],
    queryFn: () => {
      const categoryQuery = buildCombinedQuery(categoryIds);
      const termFilter = trimmed
        ? ` AND title:(${trimmed.replace(/"/g, '')})`
        : '';
      const scopedQuery = withJunkFilter(`${categoryQuery}${termFilter}`);
      return searchInternetArchiveVideos(scopedQuery, {
        limit: FULL_LIMIT,
        page: 1,
        sort: sortParamFor(sortKey),
      });
    },
    staleTime: 60_000,
  });

  // Reset the display count when the scope changes.
  // (Done in render via useState's initializer is hard with
  // dynamic inputs; use an effect to reset on key change.)
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [cacheKey, trimmed, sortKey]);

  const allItems = q.data?.items ?? [];
  const numFound = q.data?.numFound ?? 0;
  const items = useMemo(
    () => allItems.slice(0, displayCount),
    [allItems, displayCount],
  );
  const hasMore = allItems.length > displayCount;

  const data: MovieScopeState = useMemo(
    () => ({
      items,
      numFound,
      hasLoaded: !!q.data || !!q.error,
      isLoading: q.isFetching,
      isLoadingMore: false, // client-side slicing has no separate loading-more state
      error: errorMessage(q.error),
      categoryIds: [...categoryIds],
      term: trimmed,
      hasMore,
    }),
    [items, numFound, q.data, q.error, q.isFetching, categoryIds, trimmed, hasMore],
  );

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setDisplayCount(c => c + PAGE_SIZE);
  }, [hasMore]);

  const refetch = useCallback(() => {
    void q.refetch();
  }, [q]);

  return {data, loadMore, refetch};
}
