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
} from '../../../services/api/radioBrowserAdapter';
import {useApiQuery, useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import {useLiveFavoritesStore} from '../../../state';
import type {RadioStationResult} from '../../../types/api';
import type {RadioBrowseTag} from '../../../services/api/radioBrowserAdapter';

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
  tags: RadioBrowseTags;
  tagsLoaded: boolean;
  // favorites
  isFavoriteId: (id: string) => boolean;
  toggleFavorite: (station: RadioStationResult) => void;
  removeFavorite: (id: string) => void;
}

const EMPTY_FILTERS: RadioFilters = {
  genre: null,
  country: null,
  language: null,
};

const EMPTY_SCOPE: RadioScopeState = {
  items: [],
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
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
    queryFn: ({pageParam}) => {
      const page = pageParam as number;
      const term = searchTerm.trim();
      if (term) {
        return searchStations(term, {limit: PAGE_SIZE, page});
      }
      const filterSet: RadioFilterSet = {};
      if (filters.genre) filterSet.genre = filters.genre;
      if (filters.country) filterSet.country = filters.country;
      if (filters.language) filterSet.language = filters.language;
      if (Object.keys(filterSet).length > 0) {
        return getStationsByFilters(filterSet, {limit: PAGE_SIZE, page});
      }
      return getTopStations({limit: PAGE_SIZE, page});
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
    hasLoaded: !!stationsQ.data || !!stationsQ.error,
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

  const handleRefresh = useCallback(() => {
    void stationsQ.refetch();
  }, [stationsQ]);

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
  const favorites = useLiveFavoritesStore(s =>
    s.items.filter(f => f.kind === 'radio'),
  );
  const isFavoriteId = useCallback(
    (id: string) => favorites.some(f => f.id === id),
    [favorites],
  );
  const toggleFavorite = useCallback(
    (station: RadioStationResult) => {
      const existing = favorites.find(f => f.id === station.stationuuid);
      if (existing) {
        useLiveFavoritesStore.getState().removeLiveFavorite({
          kind: 'radio',
          id: station.stationuuid,
        });
        return;
      }
      useLiveFavoritesStore.getState().addLiveFavorite({
        kind: 'radio',
        id: station.stationuuid,
        name: station.name,
        url: station.urlResolved || station.url,
        image: station.favicon || '',
        subtitle: [station.country, station.tags?.split(',')[0]?.trim()]
          .filter(Boolean)
          .join(' · '),
        addedAt: new Date().toISOString(),
      });
    },
    [favorites],
  );
  const removeFavorite = useCallback(
    (id: string) => {
      useLiveFavoritesStore.getState().removeLiveFavorite({kind: 'radio', id});
    },
    [],
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
    refreshing: stationsQ.isFetching && items.length > 0,
    handleRefresh,
    tags,
    tagsLoaded,
    // favorites
    isFavoriteId,
    toggleFavorite,
    removeFavorite,
  };
}
