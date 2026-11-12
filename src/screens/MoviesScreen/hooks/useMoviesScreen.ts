// ─── Movies Screen Hook ─────────────────────────────────────────────────
// The Movies list is the Internet Archive's movie collection, and the
// Archive paginates it properly: `rows` + `page` + `sort[]`.
//
// It used to be fetched in ONE shot with `limit: FULL_LIMIT (500)` and
// then sliced client-side. That had three consequences:
//
//   1. the list stopped SILENTLY at 500 items while the source had
//      30,884 — the user scrolled to the end and the grid simply ended,
//      with nothing on screen to say why;
//   2. "You're all caught up" — the footer's end-of-list line — was
//      UNREACHABLE, because it fires when `items.length >= numFound`
//      and 500 is never 30,884;
//   3. the footer's "Loading more…" branch was dead code, because
//      `isLoadingMore` was hard-coded `false` (there was no loading —
//      the slice grew instantly).
//
// The hook now pages the source with `useInfiniteApiQuery`, the same
// pattern the Podcasts screen uses (`usePodcastsScreen.ts`).
//
// THE CACHE KEY IS THE QUERY
// --------------------------
// The key used to be the CATEGORY IDS SORTED, while the query was built
// from the ids in the order they arrived — so two orderings of the same
// ids shared one cache entry but asked the server two different
// questions. The ids are now sorted ONCE, and the same sorted list
// builds both the query and the key, so the key and the question can
// never disagree.

import {useCallback, useMemo} from 'react';
import {useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {MOVIE_CATEGORIES, withJunkFilter} from '../../../constants/movieCategories';
import {searchInternetArchiveVideos} from '../../../infrastructure/api/internetArchive/adapter';
import type {
  InternetArchiveVideoResult,
  PaginatedResult,
} from '../../../types/api';

/** Items per page. Two grid rows of the two-column mosaic. */
const PAGE_SIZE = 40;

/**
 * The Internet Archive's paging limit.
 *
 * Measured on 2026-11-12 against the live endpoint: with `rows=40`,
 * page 250 (10,000 items) answers normally and **page 251 answers
 * HTTP 507 Insufficient Storage**. The Archive will not page past
 * 10,000 rows, so the hook stops there instead of asking for a page
 * the server will refuse — and the footer says what that means.
 */
const IA_MAX_RETRIEVABLE = 10_000;

export interface MovieScopeState {
  items: InternetArchiveVideoResult[];
  /** The source's total for the current query (not the loaded count). */
  numFound: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  categoryIds: string[];
  term: string;
  /** True if there are more items to fetch. */
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
  /** Fetch the next page (used by infinite scroll). */
  loadMore: () => void;
  /** Refetch the active scope. */
  refetch: () => void;
}

// ─── helpers ────────────────────────────────────────────────────────────

/**
 * Build the IA query string for one or more categories. Each category
 * carries its own `subject(...)` clause; we OR them so the result
 * set is the UNION of all selected categories. Empty selection
 * = "All".
 */
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

/**
 * Map sort key (UI) to IA's `sort[]` parameter.
 *
 * **undefined = the default, and the default is `downloads desc`** —
 * "Most popular".
 *
 * The Internet Archive's own order is RECENCY (the newest uploads
 * first), and the newest uploads under a subject tag are the long tail
 * of user uploads, not films. Measured on 2026-11-12 against the live
 * endpoint with the app's exact query: the Documentaries category
 * returned **38 television news segments out of its first 40 items**
 * in the archive's natural order, and **0** under `downloads desc`,
 * where it leads with Ken Burns, The World at War and PBS Nova. Comedy
 * (0/40), Western (0/40) and Silent Films (0/40) tell the same story.
 *
 * The keys are exactly the ones the Movies sheet offers
 * (`src/screens/MoviesScreen/related/browseConfig.ts`). The mappings
 * for `oldest`, `za` and `rating` used to live here as well; nothing
 * could ever produce them, so they were dead branches.
 */
function sortParamFor(sortKey?: string): string {
  switch (sortKey) {
    case 'newest':
      return 'date desc';
    case 'az':
      return 'title asc';
    case 'popular':
    case undefined:
    default:
      return 'downloads desc';
  }
}

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  return String(err);
}

// ─── hook ───────────────────────────────────────────────────────────────

export function useMoviesScreen({
  categoryIds,
  searchTerm,
  sortKey,
}: UseMoviesScreenParams): UseMoviesScreenReturn {
  const trimmed = searchTerm.trim();

  // The ids are sorted ONCE and the sorted list builds both the query
  // and the cache key. OR is commutative, so this changes nothing the
  // server sees — it only makes the key and the question identical.
  const sortedIds = useMemo(
    () => [...categoryIds].sort(),
    [categoryIds],
  );

  const query = useMemo(() => {
    const categoryQuery = buildCombinedQuery(sortedIds);
    const termFilter = trimmed
      ? ` AND title:(${trimmed.replace(/"/g, '')})`
      : '';
    return withJunkFilter(`${categoryQuery}${termFilter}`);
  }, [sortedIds, trimmed]);

  const q = useInfiniteApiQuery<PaginatedResult<InternetArchiveVideoResult>>({
    // The query string IS the scope: one cache entry per question. The
    // EFFECTIVE sort is the key, not the raw choice, so the default
    // order and an explicit "Most popular" share one cache entry
    // instead of fetching the same page twice.
    queryKey: ['ia', 'movies', query, sortParamFor(sortKey)],
    initialPageParam: 1,
    queryFn: ({pageParam}) =>
      searchInternetArchiveVideos(query, {
        limit: PAGE_SIZE,
        page: pageParam as number,
        sort: sortParamFor(sortKey),
      }),
    getNextPageParam: (lastPage, pages, lastPageParam) => {
      // A short page means the source has nothing more.
      if (lastPage.items.length < PAGE_SIZE) return undefined;
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      // Everything the source has.
      if (loaded >= lastPage.numFound) return undefined;
      // The Archive's own paging limit — asking for the next page here
      // would earn an HTTP 507.
      if (loaded >= IA_MAX_RETRIEVABLE) return undefined;
      return (lastPageParam as number) + 1;
    },
    staleTime: 60_000,
  });

  const pages = q.data?.pages ?? [];
  const items = useMemo(
    () => pages.flatMap(page => page.items),
    [pages],
  );
  const numFound = pages[0]?.numFound ?? 0;
  const hasMore = q.hasNextPage ?? false;

  const data: MovieScopeState = useMemo(
    () => ({
      items,
      numFound,
      hasLoaded: !!q.data || !!q.error,
      isLoading: q.isFetching,
      isLoadingMore: q.isFetchingNextPage,
      error: errorMessage(q.error),
      categoryIds: [...sortedIds],
      term: trimmed,
      hasMore,
    }),
    [items, numFound, q.data, q.error, q.isFetching, q.isFetchingNextPage, sortedIds, trimmed, hasMore],
  );

  const loadMore = useCallback(() => {
    if (q.isFetchingNextPage) return;
    if (q.hasNextPage) {
      void q.fetchNextPage();
      return;
    }
    // No next page but the last one failed: refetch so the footer can
    // offer a retry that actually retries.
    if (q.error) void q.refetch();
  }, [q]);

  const refetch = useCallback(() => {
    void q.refetch();
  }, [q]);

  return {data, loadMore, refetch};
}
