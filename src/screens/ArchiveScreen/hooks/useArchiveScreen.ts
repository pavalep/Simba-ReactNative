// ─── Archive Screen Hook ────────────────────────────────────────────────
// WAVE B22 — rewritten for the browse grammar.
//
// WHAT THIS HOOK OWNS
// -------------------
// ONE query, keyed by the SCOPE (audio / video) and the SEARCH TERM.
//
// It used to run TWO parallel queries — one per media type — and expose
// whichever one the screen's own `mediaType` state pointed at. The
// mediatype was state the HOOK owned, so the screen had to own a second
// copy of it to render the chip row, and the two could disagree.
//
// It also never paged. The page was hard-coded to 1, `hasNextPage` was
// hard-coded `false` and `fetchNextPage` was `() => {}` — three lines
// that said "there is no more" without asking the source. The list
// stopped at 20 rows out of 52,794 (audio) or 6,809 (video) and said
// nothing at all about it.
//
// WHAT THE SOURCE ACTUALLY DOES (measured 2026-11-18)
// ----------------------------------------------------
// `src/infrastructure/api/internetArchive/adapter.ts` sends
// `rows` + `page` to `advancedsearch.php` and reads
// `response.numFound` back:
//
//   • `(old time radio) AND mediatype:(audio)`  → numFound 52,794
//   • `(classic films) AND mediatype:(movies)` → numFound 6,809
//   • `(beethoven) AND mediatype:(audio)`      → numFound 8,738
//   • `(jazz) AND mediatype:(movies)`           → numFound 23,622
//
// So the endpoint DOES report a total, and it DOES page — with one hard
// ceiling: the archive refuses to serve rows past 10,000. Measured today
// with `rows=20`: page 500 (10,000 rows) answers normally, page 501
// answers **HTTP 507 Insufficient Storage**. The same ceiling the Movies
// screen measured with `rows=40` (page 250 answers, page 251 is a 507),
// so it is the ENDPOINT's ceiling and not this query's.
//
// The hook therefore stops at that ceiling instead of asking for a page
// the server will refuse, and the footer says what the ending means —
// see `components/ArchiveContent.tsx`'s `windowEndLabel`.
//
// THE SCOPE AND THE TERM COMPOSE (one request)
// ---------------------------------------------
// The scope IS the mediatype clause and the term is the query text, and
// the adapter puts them in ONE request: `({term}) AND mediatype:(audio)`.
// There is no second request to combine, so the shell's
// `autoClearFilterOnSearch` / `autoClearSearchOnFilter` stay OFF on this
// screen: the scope and the term are answered together, and neither
// silently cancels the other.

import {useCallback, useMemo} from 'react';
import {useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {
  searchInternetArchiveAudio,
  searchInternetArchiveVideos,
  INTERNET_ARCHIVE_RETRIES,
  IA_MAX_RETRIEVABLE,
} from '../../../infrastructure/api/internetArchive/adapter';
import {usePullToRefresh} from '../../_shared/pullToRefresh';
// The archive's own paging ceiling — the ENDPOINT's limit, not this
// screen's. It is owned by the adapter that would earn the HTTP 507, so
// the Movies screen and this one cannot disagree about where the source
// stops.
import {
  ARCHIVE_SCOPE_DEFAULT_TERM,
  type ArchiveMediaType,
} from '../related/scopeConfig';
import type {
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
  PaginatedResult,
} from '../../../types/api';

/** Items per page. */
const PAGE_SIZE = 20;

/** One page of either mediatype. */
export type ArchivePage =
  | PaginatedResult<InternetArchiveItemResult>
  | PaginatedResult<InternetArchiveVideoResult>;

/** One row of either mediatype. */
export type ArchiveListItem =
  | InternetArchiveItemResult
  | InternetArchiveVideoResult;

export interface UseArchiveScreenParams {
  /** The active media scope — 'audio' or 'video'. */
  scope: ArchiveMediaType;
  /** The active search term (the shell's debounced query). */
  searchTerm: string;
}

export interface UseArchiveScreenResult {
  /** The active scope's items. */
  items: ArchiveListItem[];
  /** The source's total for the current query (not the loaded count). */
  numFound: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  /** The FIRST page's failure — the error card's business. */
  error: string | null;
  /** The failed NEXT PAGE's failure — the footer's business. */
  pageError: string | null;
  /** Fetch the next page. */
  loadMore: () => void;
  /** Refetch the active scope. */
  refetch: () => void;
  /**
   * True while a user-started pull-to-refresh is running.
   *
   * NOT `isFetching`: that flag is also true while the next PAGE loads,
   * and the refresh spinner then appears at the top of the list for a
   * fetch the user never asked for. See `_shared/pullToRefresh.ts`.
   */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
  /** The term the source is actually answering. */
  activeTerm: string;
  /**
   * True when the list ended at the archive's PAGING CEILING — the
   * archive has more rows than it will serve (10,000), so the list is
   * NOT "all caught up" and the footer must say what the ending is.
   *
   * False when the source genuinely ran out of rows: there "You're all
   * caught up." is the truth.
   */
  reachedPagingCeiling: boolean;
}

export function useArchiveScreen({
  scope,
  searchTerm,
}: UseArchiveScreenParams): UseArchiveScreenResult {
  const trimmed = searchTerm.trim();

  /**
   * The term the archive is asked for.
   *
   * The user's term always wins. The scope's curated browse default is
   * used only while there is no term — so switching the scope never
   * silently discards what the user searched for, and the scope chip
   * never contradicts the search field.
   *
   * Double quotes are stripped: the Internet Archive's query parser
   * treats a quote as a phrase delimiter, so an unbalanced one breaks
   * the whole query (the Movies screen does the same). A term that was
   * ONLY quotes leaves nothing to search for, so it falls back to the
   * scope's browse default rather than asking the archive for an empty
   * query — measured 2026-11-18: `() AND mediatype:(audio)` answers
   * with no total and no rows at all.
   */
  const activeTerm = useMemo(() => {
    const cleaned = trimmed.replace(/"/g, '').trim();
    if (cleaned.length > 0) {
      return cleaned;
    }
    return ARCHIVE_SCOPE_DEFAULT_TERM[scope];
  }, [trimmed, scope]);

  const q = useInfiniteApiQuery<ArchivePage>({
    // The scope AND the term are the cache key: one entry per question.
    queryKey: ['ia', 'archive', scope, activeTerm],
    initialPageParam: 1,
    queryFn: ({pageParam}) => {
      const page = pageParam as number;
      const options = {limit: PAGE_SIZE, page};
      // The scope picks the search: the audio search answers
      // `mediatype:(audio)`, the video search `mediatype:(movies)`.
      // Both carry the SAME term in the same request.
      return scope === 'audio'
        ? searchInternetArchiveAudio(activeTerm, options)
        : searchInternetArchiveVideos(activeTerm, options);
    },
    getNextPageParam: (lastPage, pages, lastPageParam) => {
      // A short page means the source has nothing more.
      if (lastPage.items.length < PAGE_SIZE) return undefined;
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      // Everything the source has.
      if (loaded >= lastPage.numFound) return undefined;
      // The archive's own paging ceiling — asking for the next page here
      // would earn an HTTP 507.
      if (loaded >= IA_MAX_RETRIEVABLE) return undefined;
      return (lastPageParam as number) + 1;
    },
    // The archive's searches are SLOW — the cold page 1 measured 25–45 s
    // (and the raw-mediatype browse did not answer inside 45 s at all) —
    // so the list stays fresh for ten minutes before it is refetched.
    // That is the value this screen has always used.
    staleTime: 600_000,
    retry: INTERNET_ARCHIVE_RETRIES,
  });

  const pages = q.data?.pages ?? [];
  const items = useMemo<ArchiveListItem[]>(() => {
    const out: ArchiveListItem[] = [];
    for (const page of pages) {
      // The page's items are one mediatype's shape — the scope in the
      // cache key says which, and the scope never changes under a
      // single cache entry.
      for (const item of page.items as ArchiveListItem[]) {
        out.push(item);
      }
    }
    return out;
  }, [pages]);
  const numFound = pages[0]?.numFound ?? 0;

  // The list stopped at the archive's paging ceiling, and the archive
  // still has rows it will not serve. That is the ONLY ending that is
  // not "all caught up".
  const reachedPagingCeiling =
    items.length >= IA_MAX_RETRIEVABLE && items.length < numFound;

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

  // The pull-to-refresh gesture owns the spinner. The query's own
  // `isFetching` cannot: it is true while the next PAGE loads, and the
  // spinner then shows up at the top of the list mid-scroll.
  const {refreshing, refresh} = usePullToRefresh(q.refetch);

  return {
    items,
    numFound,
    hasLoaded: !!q.data || !!q.error,
    isLoading: q.isFetching,
    isLoadingMore: q.isFetchingNextPage,
    hasNextPage: q.hasNextPage ?? false,
    error: q.error?.message ?? null,
    // ONE FAILURE, ONE MESSAGE. `error` is the FIRST page's failure and
    // the error card owns it; the footer's copy is only for a failed
    // load-more.
    pageError: q.isFetchNextPageError ? (q.error?.message ?? null) : null,
    loadMore,
    refetch,
    refreshing,
    refresh,
    activeTerm,
    reachedPagingCeiling,
  };
}
