// ─── Radio Browser Hook ─────────────────────────────────────────────────
// V20.1: rewritten on `useApiQuery` + `useInfiniteApiQuery` per the
// V18 ideal. The pre-V18 implementation was 329 lines with a
// per-scope `Map<key, ScopeState>`, `seqRef` for stale-request
// cancellation, `guardRef` for in-flight dedup, `failedKeyRef`
// for auto-retry, `wasOnlineRef` for reconnect tracking, an
// `ensureLoadedRef` to swallow identical triggers, and a
// hand-rolled debounce of `searchQuery` → `searchTerm`. The
// V18-ideal version is ~140 lines: 2 useStates (for UI), 1
// useInfiniteApiQuery (for the active scope's stations), 3
// useApiQuery (for the tag sheets), no per-scope Map, no refs.
//
// The "scope" is just a TanStack queryKey. Every
// (filters, searchTerm) combination is its own cache entry;
// revisiting a combination shows its cached list instantly.
//
// The public surface (UseRadioBrowserReturn) is preserved
// where the screen consumer uses it; the methods that took
// `key` arguments in the legacy API now take no args (the
// hook tracks the active scope internally).

import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  searchStations,
  getStationsByFilters,
  getTopStations,
  getGenres,
  getCountries,
  getLanguages,
  type RadioFilterSet,
} from '../../../infrastructure/api/radioBrowser/adapter';
import {useApiQuery, useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import {usePullToRefresh} from '../../_shared/pullToRefresh';
import {useLiveFavoritesStore} from '../../../state';
import type {RadioStationResult} from '../../../types/api';
import type {RadioBrowseTag} from '../../../infrastructure/api/radioBrowser/adapter';
import {stationSubtitle} from '../related/stationRow';

const PAGE_SIZE = 30;
const TAGS_LIMIT = 40;

export type RadioFilterId = 'genre' | 'country' | 'language';

export interface RadioFilters {
  genre: string | null;
  country: string | null;
  language: string | null;
}

export interface RadioScopeState {
  items: RadioStationResult[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

export interface RadioBrowseTags {
  genres: RadioBrowseTag[];
  countries: RadioBrowseTag[];
  languages: RadioBrowseTag[];
}

interface UseRadioBrowserReturn {
  // filters + search
  filters: RadioFilters;
  setFilter: (id: RadioFilterId, key: string) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setSearchTerm: (q: string) => void;
  isSearchActive: boolean;
  isOnline: boolean;
  // data
  getScope: () => RadioScopeState;
  loadMore: () => void;
  retry: () => void;
  refreshing: boolean;
  handleRefresh: () => void;
  /**
   * Whether the source has another page.
   *
   * The hook owns it — it is TanStack's own `hasNextPage`. The screen used
   * to re-derive it from a SECOND copy of the page size
   * (`rows.length % PAGE_SIZE === 0`), which says "maybe more" whenever
   * the loaded count happens to be a multiple of 30 — including when the
   * server has no more pages. The footer's "tap to retry" button then
   * rendered and did nothing.
   */
  hasMore: boolean;
  tags: RadioBrowseTags;
  tagsLoaded: boolean;
  /**
   * Which tag groups have arrived.
   *
   * One group used to gate all three: a single failing tag query emptied
   * every group in the sheet, with no error and no retry.
   */
  tagsReady: {genres: boolean; countries: boolean; languages: boolean};
  // favorites
  isFavoriteId: (id: string) => boolean;
  toggleFavorite: (station: RadioStationResult) => void;
}

const EMPTY_FILTERS: RadioFilters = {
  genre: null,
  country: null,
  language: null,
};

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  return String(err);
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useRadioBrowser(initialTag?: string): UseRadioBrowserReturn {
  const {isOnline} = useNetworkStatus();

  // ── Filter + search state (UI-level concerns) ──
  const [filters, setFilters] = useState<RadioFilters>({
    genre: initialTag ?? null,
    country: null,
    language: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const isSearchActive = searchTerm.trim().length > 0;
  const activeFilterCount =
    (filters.genre ? 1 : 0) +
    (filters.country ? 1 : 0) +
    (filters.language ? 1 : 0);

  // ── Tag sheet (genres / countries / languages) — 3 parallel
  //    queries, no per-scope state machine ──
  const genresQ = useApiQuery<RadioBrowseTag[]>({
    queryKey: ['radioBrowser', 'tags', 'genres', TAGS_LIMIT],
    queryFn: () => getGenres(TAGS_LIMIT),
    staleTime: 5 * 60_000,
  });
  const countriesQ = useApiQuery<RadioBrowseTag[]>({
    queryKey: ['radioBrowser', 'tags', 'countries', TAGS_LIMIT],
    queryFn: () => getCountries(TAGS_LIMIT),
    staleTime: 5 * 60_000,
  });
  const languagesQ = useApiQuery<RadioBrowseTag[]>({
    queryKey: ['radioBrowser', 'tags', 'languages', TAGS_LIMIT],
    queryFn: () => getLanguages(TAGS_LIMIT),
    staleTime: 5 * 60_000,
  });

  // ── The big one: server-paginated stations per
  //    (filters, searchTerm) tuple. Radio-Browser supports
  //    `offset`/`limit` natively, so useInfiniteApiQuery is
  //    the right primitive (per-page network request; TanStack
  //    dedups and cancels overlapping pages). Every tuple
  //    is its own cache entry. ──
  const stationsQ = useInfiniteApiQuery<RadioStationResult[]>({
    queryKey: [
      'radioBrowser',
      'browse',
      filters,
      searchTerm.trim(),
    ],
    initialPageParam: 1,
    queryFn: ({pageParam, signal}) => {
      const page = pageParam as number;
      const term = searchTerm.trim();
      if (term) {
        return searchStations(term, {limit: PAGE_SIZE, page}, signal);
      }
      const filterSet: RadioFilterSet = {};
      if (filters.genre) filterSet.genre = filters.genre;
      if (filters.country) filterSet.country = filters.country;
      if (filters.language) filterSet.language = filters.language;
      if (Object.keys(filterSet).length > 0) {
        return getStationsByFilters(filterSet, {limit: PAGE_SIZE, page}, signal);
      }
      return getTopStations({limit: PAGE_SIZE, page}, signal);
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      // If the page is short, there are no more — stop here.
      if (lastPage.length < PAGE_SIZE) return undefined;
      return (lastPageParam as number) + 1;
    },
    staleTime: 60_000,
  });

  // ── Filter actions ──
  const setFilter = useCallback(
    (id: RadioFilterId, key: string) => {
      const next = key || null;
      setFilters(prev => {
        if (prev[id] === next) return prev;
        return {...prev, [id]: next};
      });
    },
    [],
  );
  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  // ── Data assembly (the only "per-scope" thing the hook tracks) ──
  const allPages = stationsQ.data?.pages ?? [];
  const items = useMemo(() => allPages.flat(), [allPages]);
  const hasMore = stationsQ.hasNextPage ?? false;

  // The consumer's surface. We expose `getScope()` (no args)
  // for API compat with the legacy hook — the screen consumer
  // can be updated to use `data` directly in a follow-up.
  const getScope = useCallback((): RadioScopeState => ({
    items,
    // "The query has settled WITH DATA" — not "the query settled".
    //
    // It used to be `!!data || !!error`, which is true when the FIRST
    // page failed, and both of the screen's failure branches tested
    // `!hasLoaded`. So a page-1 failure fell through every branch and
    // rendered an EMPTY LIST: no message, no spinner, no button, and
    // the "Could not load stations." toast never fired either.
    hasLoaded: !!stationsQ.data,
    isLoading: stationsQ.isFetching,
    isLoadingMore: stationsQ.isFetchingNextPage,
    error: errorMessage(stationsQ.error),
  }), [items, stationsQ.data, stationsQ.error, stationsQ.isFetching, stationsQ.isFetchingNextPage]);

  const loadMore = useCallback(() => {
    if (stationsQ.hasNextPage && !stationsQ.isFetchingNextPage) {
      void stationsQ.fetchNextPage();
    }
  }, [stationsQ]);

  const retry = useCallback(() => {
    void stationsQ.refetch();
  }, [stationsQ]);

  // The GESTURE owns the spinner, not the query. `isFetching` is also
  // true for a background refetch (the query is stale, the app comes
  // back to the foreground) and for the next PAGE — so binding the
  // refresh control to it puts a spinner for work the user never asked
  // for in the one place that says "refreshing". See
  // `src/screens/_shared/pullToRefresh.ts`.
  const {refreshing, refresh} = usePullToRefresh(stationsQ.refetch);
  const tags: RadioBrowseTags = useMemo(
    () => ({
      genres: genresQ.data ?? [],
      countries: countriesQ.data ?? [],
      languages: languagesQ.data ?? [],
    }),
    [genresQ.data, countriesQ.data, languagesQ.data],
  );
  const tagsLoaded =
    !!genresQ.data && !!countriesQ.data && !!languagesQ.data;

  // ── Favorites ──
  // V23 W24 (2026-11-05) — select the stable array, derive outside the
  // selector. Filtering inside the selector built a NEW array on every call,
  // so zustand's `Object.is` comparison never matched and the store drove an
  // unbounded re-render loop ("Maximum update depth exceeded").
  const allFavorites = useLiveFavoritesStore(s => s.items);
  const favorites = useMemo(
    () => allFavorites.filter(f => f.kind === 'radio'),
    [allFavorites],
  );
  const isFavoriteId = useCallback(
    (id: string) => favorites.some(f => f.id === id),
    [favorites],
  );
  const toggleFavorite = useCallback(
    (station: RadioStationResult) => {
      const existing = favorites.find(f => f.id === station.id);
      if (existing) {
        useLiveFavoritesStore.getState().removeLiveFavorite({
          kind: 'radio',
          id: station.id,
        });
        return;
      }
      useLiveFavoritesStore.getState().addLiveFavorite({
        kind: 'radio',
        id: station.id,
        name: station.name,
        url: station.url,
        image: station.image,
        // ONE rule for the subtitle — the same one the browse row uses.
        // It used to be built twice with two different rules, so the same
        // station read "Germany · pop,rock,news" in browse and
        // "Germany · pop" in favourites.
        subtitle: stationSubtitle(station),
        // The codec and the bitrate were DROPPED on the way in, so the
        // favourites row showed no "MP3 · 128 kbps" for a station whose
        // browse row showed it — even though the store type carries both
        // and the card renders them.
        codec: station.codec,
        bitrate: station.bitrate,
        addedAt: new Date().toISOString(),
      });
    },
    [favorites],
  );

  return {
    // filters + search
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    isOnline,
    // data
    getScope,
    loadMore,
    retry,
    refreshing,
    handleRefresh: refresh,
    hasMore,
    tags,
    tagsLoaded,
    tagsReady: {
      genres: !!genresQ.data,
      countries: !!countriesQ.data,
      languages: !!languagesQ.data,
    },
    // favorites
    isFavoriteId,
    toggleFavorite,
  };
}
