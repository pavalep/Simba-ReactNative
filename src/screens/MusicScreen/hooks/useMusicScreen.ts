// ─── Music Screen Hook ─────────────────────────────────────────────────
// v10.1 FAB-only formula: per-scope cache + infinite scroll + search
// persistence. No tabs — the FAB's FILTER group is the genre picker.
//
// A "scope" is a (genre, searchTerm) pair. Previously cached manually
// in a Map<key, MusicScopeState>. V18.3.3: TanStack's cache IS the
// per-scope cache (each unique queryKey is cached for staleTime ms).
// The hook tracks ONE active scope at a time; switching genres /
// search terms re-points the queryKey, and TanStack serves cached
// data instantly if the user has visited that scope before.
//
// Fetch branches (single stream, filter-aware):
//   • search term → global Jamendo search, WITH the genre tag when one
//     is selected — Jamendo answers both at once (see `fetchPage`)
//   • genre ('' = none = "All") → genre browse / global popular
// Pagination: every branch passes a PAGE number, and the adapter turns it
// into Jamendo's own `offset` — Jamendo has no `page` parameter. See
// `jamendoPaging` in the adapter for the measurement that proved it.

import {useCallback, useMemo, useState} from 'react';
import {
  searchJamendoTracks,
  getJamendoTracksByGenre,
  getPopularJamendoTracks,
  JAMENDO_RETRIES,
} from '../../../infrastructure/api/jamendo/adapter';
import type {JamendoTrackResult} from '../../../types/api';
import {useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {usePullToRefresh} from '../../_shared/pullToRefresh';

const PAGE_SIZE = 20;

function dedupe(items: JamendoTrackResult[]): JamendoTrackResult[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

async function fetchPage(
  term: string,
  genre: string,
  page: number,
): Promise<JamendoTrackResult[]> {
  if (term) {
    // The genre goes WITH the term, not instead of it.
    //
    // MEASURED on 2026-11-16 against the live API: Jamendo's `/tracks/`
    // honours `search` and `tags` together — `search=love&tags=rock`
    // returns the rock pool filtered by the term
    // (`(search+genre) ∩ genre = 3`, `(search+genre) ∩ search = 0`, and
    // `search ∩ genre = 0`). The old code dropped the genre the moment a
    // term arrived, while the chip strip kept showing it — a filter that
    // looked applied and was not.
    return searchJamendoTracks(term, {
      limit: PAGE_SIZE,
      page,
      ...(genre ? {tags: genre} : {}),
    });
  }
  if (genre) {
    return getJamendoTracksByGenre(genre, {limit: PAGE_SIZE, page});
  }
  return getPopularJamendoTracks(PAGE_SIZE, page);
}

/**
 * The end-of-stream rule.
 *
 * A page that came back SHORT is the last page — the source has nothing
 * more to give.
 *
 * The guard was described in a comment for a long time and was NOT in the
 * code: `lastPage` was bound to `_lastPage` and never read, so
 * `hasNextPage` was permanently `true`. The visible consequences were:
 * the filter button never got out of the way at the end of the list
 * (`MusicContent.tsx` → `BrowseLayout.tsx`'s `atListEnd` rule), and every
 * scroll to the end fetched another page — four HTTP requests on the
 * "All" branch, which walks its own order chain.
 *
 * It is a named function so the rule can be pinned by a test rather than
 * by a comment.
 */
export function nextMusicPage(
  lastPageLength: number,
  lastPageParam: unknown,
): number | undefined {
  if (lastPageLength < PAGE_SIZE) return undefined;
  if (typeof lastPageParam !== 'number') return undefined;
  return lastPageParam + 1;
}

export interface UseMusicScreenResult {
  /** Current active genre (FAB filter); '' = "All". */
  activeGenre: string;
  setActiveGenre: (genre: string) => void;
  /** Debounced search term; persists across filter switches. */
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  items: JamendoTrackResult[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
  /**
   * True while a user-started pull-to-refresh is running.
   *
   * NOT `isFetching`: that flag is also true while the next PAGE is
   * loading, and the refresh spinner then appeared at the top of the
   * list for a fetch the user never asked for. See
   * `src/screens/_shared/pullToRefresh.ts`.
   */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
}

export function useMusicScreen(): UseMusicScreenResult {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGenre, setActiveGenre] = useState('');

  const queryKey = useMemo(
    () => ['jamendo', 'music', activeGenre, searchTerm] as const,
    [activeGenre, searchTerm],
  );

  const query = useInfiniteApiQuery<JamendoTrackResult[]>({
    queryKey,
    queryFn: ({pageParam}) => fetchPage(searchTerm, activeGenre, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      nextMusicPage(lastPage.length, lastPageParam),
    staleTime: 60_000,
    retry: JAMENDO_RETRIES,
  });

  // Flatten all loaded pages + dedupe by id (Jamendo's offset pagination
  // can return the same row on adjacent pages).
  const items = useMemo(
    () => dedupe((query.data?.pages ?? []).flat()),
    [query.data],
  );

  // The pull-to-refresh gesture owns the spinner. The query's own
  // `isFetching` cannot: it is true while the next PAGE loads, and the
  // spinner then showed up at the top of the list mid-scroll.
  const {refreshing, refresh} = usePullToRefresh(query.refetch);

  return {
    activeGenre,
    setActiveGenre,
    setSearchTerm,
    isSearchActive: searchTerm.trim().length > 0,
    items,
    hasLoaded: !!query.data,
    isLoading: query.isFetching,
    isLoadingMore: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    error: query.error?.message ?? null,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    refetch: () => {
      void query.refetch();
    },
    refreshing,
    refresh,
  };
}
