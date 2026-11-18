// ─── Audiobooks Screen Hook ────────────────────────────────────────────
// WAVE B16 — rewritten for the browse grammar.
//
// The hook used to own the scope ITSELF: `searchTerm` and `selectedGenre`
// were plain `useState` inside it, and it ran TWO parallel infinite
// queries — one for "by term", one for "by genre" — of which exactly one
// was enabled at a time.
//
// That made the screen a law unto itself:
//
//   • it had its own search field and its own genre chip row, so it did
//     not look like the Music / Movies / Podcasts screens;
//   • with NEITHER a term NOR a genre it enabled NO query at all, so the
//     screen opened on an empty list and a "search for audiobooks" prompt
//     — a browse page that shows nothing until you browse it;
//   • the two parallel queries meant two cache entries for one screen and
//     a hand-written priority rule ("the term wins over the genre") that
//     no other screen had to think about.
//
// It now has ONE query, keyed by the SCOPE, exactly like the Movies
// screen's: the search term and the genre are inputs, not state the
// hook owns, and the shell's filter and search field are the only places
// either of them comes from.
//
// THE SCOPE IS ONE THING AT A TIME
// --------------------------------
// LibriVox cannot answer a term AND a genre in one request, so the scope
// is a term OR a genre — never both. The screen's shell enforces that
// (see `autoClearFilterOnSearch` / `autoClearSearchOnFilter` in
// `index.tsx`): the LAST thing the user chose is the one that applies,
// and the chip strip always says what the source is really answering.
//
// The third scope is the feed's own listing — no term, no genre — which
// is the "All" the Movies and Music screens open on.

import {useCallback, useMemo} from 'react';
import {useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {
  searchAudiobooks,
  searchByGenre,
  getRecentAudiobooks,
  LIBRIVOX_RETRIES,
} from '../../../infrastructure/api/librivox/adapter';
import {usePullToRefresh} from '../../_shared/pullToRefresh';
import type {AudiobookResult} from '../../../types/api';

const PAGE_SIZE = 20;
const SEARCH_CACHE_TTL = 600_000; // 10 min

/** Which of the three scopes the feed is answering. */
export type AudiobooksScopeKind = 'term' | 'genre' | 'all';

export interface UseAudiobooksScreenOptions {
  /** The active genre, or '' for none. */
  genre: string;
  /** The active search term. */
  searchTerm: string;
}

export interface UseAudiobooksScreenResult {
  /** The books of the active scope. */
  items: AudiobookResult[];
  /** The scope the source is answering. */
  scopeKind: AudiobooksScopeKind;
  /** The scope's label, for the empty-state copy. */
  scopeLabel: string | undefined;
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
   * NOT `isFetching`: that flag is also true while the next PAGE is
   * loading, and the refresh spinner then appeared at the top of the list
   * for a fetch the user never asked for. See
   * `src/screens/_shared/pullToRefresh.ts`.
   */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
}

function dedupe(items: AudiobookResult[]): AudiobookResult[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

export function useAudiobooksScreen({
  genre,
  searchTerm,
}: UseAudiobooksScreenOptions): UseAudiobooksScreenResult {
  const trimmedTerm = searchTerm.trim();
  const trimmedGenre = genre.trim();

  // The scope IS the cache key: one entry per question, and the question
  // is fully spelled out — the term, the genre and the kind.
  const scopeKind: AudiobooksScopeKind = trimmedTerm
    ? 'term'
    : trimmedGenre
    ? 'genre'
    : 'all';

  const query = useInfiniteApiQuery<AudiobookResult[]>({
    queryKey: ['librivox', scopeKind, trimmedTerm, trimmedGenre],
    queryFn: ({pageParam}) => {
      const page = pageParam as number;
      const options = {limit: PAGE_SIZE, page};
      if (scopeKind === 'term') {
        return searchAudiobooks(trimmedTerm, options);
      }
      if (scopeKind === 'genre') {
        return searchByGenre(trimmedGenre, options);
      }
      return getRecentAudiobooks(options);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (typeof lastPageParam !== 'number') return undefined;
      // A short page means the feed has nothing more.
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPageParam + 1;
    },
    staleTime: SEARCH_CACHE_TTL,
    retry: LIBRIVOX_RETRIES,
  });

  const items = useMemo(
    () => dedupe((query.data?.pages ?? []).flat()),
    [query.data],
  );

  const fetchNextPage = useCallback(() => {
    if (query.isFetchingNextPage) return;
    if (query.hasNextPage) {
      void query.fetchNextPage();
      return;
    }
    // No next page but the last one failed: refetch so the footer can
    // offer a retry that actually retries.
    if (query.error) void query.refetch();
  }, [query]);

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  // The pull-to-refresh gesture owns the spinner. The query's own
  // `isFetching` cannot: it is true while the next PAGE loads, and the
  // spinner then showed up at the top of the list mid-scroll.
  const {refreshing, refresh} = usePullToRefresh(query.refetch);

  return {
    items,
    scopeKind,
    scopeLabel: scopeKind === 'genre' ? trimmedGenre : undefined,
    hasLoaded: !!query.data || !!query.error,
    isLoading: query.isFetching,
    isLoadingMore: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    error: query.error?.message ?? null,
    // ONE FAILURE, ONE MESSAGE. `error` is the FIRST page's failure and
    // the error card owns it; the footer's copy is only for a failed
    // load-more.
    pageError: query.isFetchNextPageError ? (query.error?.message ?? null) : null,
    fetchNextPage,
    refetch,
    refreshing,
    refresh,
  };
}
