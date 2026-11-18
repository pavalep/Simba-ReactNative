// ─── Shows Screen Hook ──────────────────────────────────────────────────
//
// ONE scope at a time, ONE query per scope, and the scope is spelled
// out in the cache key — the same shape as the Music, Movies, Podcasts
// and Audiobooks screens.
//
// THE THREE SCOPES
// -----------------
//   term      — a term in the shell's search field → `/search/shows?q=`
//   today     — the "Airing today" scope → `/schedule`
//   catalogue — neither → `/shows?page=N`
//
// They are EXCLUSIVE, and the LAST thing the user chose is the one that
// applies. TVMaze cannot answer a term and a scope at the same time:
// `/search/shows` takes a term and nothing else (measured 2026-11-18: the
// same 10 results with `genre=Comedy` and with `genre=Zzzzznotagenre`),
// and `/schedule` takes no term at all. So the shell clears one when the
// other arrives — see `autoClearFilterOnSearch` / `autoClearSearchOnFilter`
// in `index.tsx`.
//
// THE CATALOGUE'S PAGES
// ---------------------
// The old hook stopped the list after the FIRST page and told the user
// it was finished. Two measurements explain why:
//
//   • TVMaze's `/shows` returns 235-250 shows per page (measured:
//     235, 240, 242, 243, 245, 248, 250 — the gaps are ids that were
//     deleted), so "this page was shorter than 250" is true on almost
//     every page. The old rule was exactly that, and page 1 holds 245
//     shows, so the list stopped at 245 of the catalogue's ~95,000 while
//     the footer said "You're all caught up."
//   • `/shows` pages by an ID WINDOW of 250 ids: page N carries the ids
//     [N·250 … N·250+249] (measured: page 1 → 250-499, page 2 →
//     500-749, page 381 → 95250-95499). The window's TOP id is present
//     on every page that has a successor and missing on the last one
//     (measured: page 382's highest id is 95734, and page 383 answers
//     HTTP 404).
//
// So the next page is asked for by the window, not by the count.

import {useCallback, useMemo} from 'react';
import {useApiQuery, useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {
  searchShows,
  getShowsPage,
  getSchedule,
  TVMAZE_RETRIES,
} from '../../../infrastructure/api/tvmaze/adapter';
import {usePullToRefresh} from '../../_shared/pullToRefresh';
import {SHOWS_SCOPE_TODAY} from '../related/browseConfig';
import type {TVMazeShow} from '../../../types/api';

const SCHEDULE_TTL = 1_800_000; // 30 min
const CATALOGUE_TTL = 3_600_000; // 1 h
const SEARCH_TTL = 600_000; // 10 min

/** TVMaze's `/shows` pages by an ID WINDOW of 250 ids. */
const TVMAZE_PAGE_ID_WINDOW = 250;

/** Which of the three scopes the list is answering. */
export type ShowsScopeKind = 'term' | 'today' | 'catalogue';

export interface UseShowsScreenOptions {
  /**
   * The shell's scope-group selection: `'browse'` (the catalogue),
   * `'today'` (today's schedule) or `''` (the group's default) — or
   * `undefined` while the scope has not been pushed down yet.
   *
   * `undefined` means "the shell has not said yet", NOT "the default".
   * The provider sits ABOVE the shell, so it cannot read the shell's
   * filter directly: the content pushes the scope down from an effect.
   * A query that fired before that would ask for the WRONG scope — a
   * deep link asking for 'Airing today' would fetch the catalogue on the
   * way. So nothing is asked for until the scope is known.
   */
  scope: string | undefined;
  /** The shell's debounced search term. */
  searchTerm: string;
}

export interface UseShowsScreenResult {
  /** The scope the source is answering. */
  scopeKind: ShowsScopeKind;
  /** The shows the scope is answering. */
  items: TVMazeShow[];
  /**
   * The shows airing today.
   *
   * In the catalogue scope this is the rail — the list's header. In the
   * today scope it IS the list. One query owns the fact, so the two can
   * never disagree about which shows are on.
   */
  todayItems: TVMazeShow[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  /** The FIRST page's failure — the error card's business. */
  error: string | null;
  /** The failed NEXT PAGE's error — the footer's business. */
  pageError: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
  /**
   * True while a user-started pull-to-refresh is running.
   *
   * NOT `isFetching`: that flag is also true while the next PAGE loads,
   * and the refresh spinner then appeared at the top of the list for a
   * fetch the user never asked for. See
   * `src/screens/_shared/pullToRefresh.ts`.
   */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
  /** True while the shell's search field holds a term. */
  isSearchActive: boolean;
}

export function useShowsScreen({
  scope,
  searchTerm,
}: UseShowsScreenOptions): UseShowsScreenResult {
  const trimmedTerm = searchTerm.trim();
  // `undefined` = the shell has not said yet. `''` = the group's
  // default, which is the catalogue.
  const settled = scope !== undefined;
  const trimmedScope = (scope ?? '').trim();

  // The scope IS the cache key: one entry per question, and the question
  // is fully spelled out — the term and the kind.
  //
  // A term beats the scope group: the search endpoint cannot answer a
  // scope, and the shell clears the scope group when a term arrives
  // anyway (`autoClearFilterOnSearch`).
  const scopeKind: ShowsScopeKind = trimmedTerm
    ? 'term'
    : trimmedScope === SHOWS_SCOPE_TODAY
    ? 'today'
    : 'catalogue';

  // THE SCHEDULE — "what airs today".
  //
  // ONE query owns the fact: the rail (the catalogue scope's header) and
  // the today scope's list both read THIS result, so they cannot
  // disagree. It is not fetched in the term scope, which never shows it.
  const scheduleQ = useApiQuery<TVMazeShow[]>({
    queryKey: ['tvmaze', 'schedule'],
    queryFn: showsFromSchedule,
    // The term scope never shows the schedule, so it is not fetched —
    // and nothing is fetched until the scope is known.
    enabled: settled && scopeKind !== 'term',
    staleTime: SCHEDULE_TTL,
    retry: TVMAZE_RETRIES,
  });

  // THE LIST — the scope's own query.
  const listQ = useInfiniteApiQuery<TVMazeShow[]>({
    queryKey: ['tvmaze', scopeKind === 'term' ? 'search' : 'shows', trimmedTerm],
    queryFn: async ({pageParam}) => {
      if (scopeKind === 'term') return searchShows(trimmedTerm);
      return showsPage(pageParam as number);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      // The term scope answers ten shows and stops (measured: TVMaze's
      // `/search/shows` returns at most ten results), and the today scope
      // is ONE schedule — neither has another page.
      if (scopeKind !== 'catalogue') return undefined;
      const page = typeof lastPageParam === 'number' ? lastPageParam : 1;
      return hasNextCataloguePage(page, lastPage) ? page + 1 : undefined;
    },
    enabled: settled && scopeKind !== 'today',
    staleTime: scopeKind === 'term' ? SEARCH_TTL : CATALOGUE_TTL,
    retry: TVMAZE_RETRIES,
  });

  const todayItems = useMemo(() => scheduleQ.data ?? [], [scheduleQ.data]);
  const listItems = useMemo(
    () => dedupe((listQ.data?.pages ?? []).flat()),
    [listQ.data],
  );

  // The list answers ONE scope. In the today scope the list IS the
  // schedule — the same array the rail would draw.
  const items = scopeKind === 'today' ? todayItems : listItems;

  const error =
    scopeKind === 'today'
      ? scheduleQ.error?.message ?? null
      : listQ.error?.message ?? null;

  const hasLoaded =
    scopeKind === 'today'
      ? !!scheduleQ.data || !!scheduleQ.error
      : !!listQ.data || !!listQ.error;

  const isLoading =
    // Until the scope is known there is nothing to load YET — and the
    // list must not read that as "empty".
    !settled ||
    (scopeKind === 'today' ? scheduleQ.isFetching : listQ.isFetching);

  const isLoadingMore =
    scopeKind === 'catalogue' ? listQ.isFetchingNextPage : false;

  const hasNextPage =
    scopeKind === 'catalogue' ? listQ.hasNextPage ?? false : false;

  // ONE FAILURE, ONE MESSAGE. `error` is the FIRST page's failure and the
  // error card owns it; the footer's copy is only for a failed
  // load-more.
  const pageError =
    scopeKind === 'catalogue' && listQ.isFetchNextPageError
      ? listQ.error?.message ?? null
      : null;

  const fetchNextPage = useCallback(() => {
    if (scopeKind !== 'catalogue') return;
    if (listQ.isFetchingNextPage) return;
    if (listQ.hasNextPage) {
      void listQ.fetchNextPage();
      return;
    }
    // No next page but the last one failed: refetch so the footer can
    // offer a retry that actually retries.
    if (listQ.error) void listQ.refetch();
  }, [scopeKind, listQ]);

  /**
   * The refresh gesture refreshes EVERYTHING the scope is showing.
   *
   * In the catalogue scope that is the catalogue AND the rail — the rail
   * is on screen, so one gesture refreshes both.
   */
  const refetch = useCallback(async () => {
    const jobs: Array<Promise<unknown>> = [];
    if (scopeKind !== 'term') jobs.push(scheduleQ.refetch());
    if (scopeKind !== 'today') jobs.push(listQ.refetch());
    await Promise.all(jobs);
  }, [scopeKind, scheduleQ, listQ]);

  // The pull-to-refresh gesture owns the spinner. The query's own
  // `isFetching` cannot: it is true while the next PAGE loads, and the
  // spinner then showed up at the top of the list mid-scroll.
  const {refreshing, refresh} = usePullToRefresh(refetch);

  return {
    scopeKind,
    items,
    todayItems,
    hasLoaded,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    pageError,
    fetchNextPage,
    refetch,
    refreshing,
    refresh,
    isSearchActive: trimmedTerm.length > 0,
  };
}

/**
 * The schedule, deduped by show.
 *
 * TVMaze's `/schedule` answers EPISODES (measured 2026-11-18: 94 entries
 * covering 89 shows), so a show with three episodes on today appears
 * three times. The rail wants SHOWS, not airings.
 */
async function showsFromSchedule(): Promise<TVMazeShow[]> {
  const schedule = await getSchedule();
  const unique = new Map<number, TVMazeShow>();
  for (const entry of schedule) {
    if (!unique.has(entry.show.id)) {
      unique.set(entry.show.id, entry.show);
    }
  }
  return Array.from(unique.values());
}

/**
 * One page of the catalogue, with the end of the catalogue translated.
 *
 * The adapter's `genre` argument is deliberately NOT passed: TVMaze's
 * `/shows` ignores it (measured — every variant of the request returns
 * the identical page), so sending it would be a promise the source does
 * not keep.
 */
async function showsPage(page: number): Promise<TVMazeShow[]> {
  try {
    return await getShowsPage(page);
  } catch (error) {
    // A page PAST the end of the catalogue is a 404 (measured: the last
    // populated page is 382 and page 383 answers HTTP 404). That is not a
    // failure — it IS the end — so it becomes an empty page and the list
    // stops there instead of showing a load-more error at the end of a
    // list that is complete.
    if (isNotFound(error)) return [];
    throw error;
  }
}

/**
 * Does the catalogue have a page after this one?
 *
 * The page COUNT cannot answer it (see the header): TVMaze returns
 * 235-250 shows per page, so "shorter than 250" is true on almost every
 * page. The ID WINDOW can: page N carries the ids [N·250 … N·250+249],
 * and the window's TOP id is present on every page that has a successor
 * and missing on the last one.
 */
function hasNextCataloguePage(page: number, shows: TVMazeShow[]): boolean {
  const windowTop =
    page * TVMAZE_PAGE_ID_WINDOW + (TVMAZE_PAGE_ID_WINDOW - 1);
  return shows.some(show => show.id === windowTop);
}

/** Is this the API's "no such page" answer? */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 404
  );
}

function dedupe(items: TVMazeShow[]): TVMazeShow[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}
