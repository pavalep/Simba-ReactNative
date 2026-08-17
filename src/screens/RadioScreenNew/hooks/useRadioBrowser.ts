// ─── Standalone Radio Browser Hook (v10.1 Wave 7) ─────────────────────
// FAB-only, tab-less: one content list driven by three simultaneous
// single-select filters (Genre + Country + Language) plus an optional
// search term. Per-scope cache (scope = filters + term), stale-response
// guards, infinite scroll, auto-retry on reconnect.
//
//   • no filters & no term  → top stations (default browse)
//   • term                  → search wins over filters
//   • any filter            → combined getStationsByFilters
//
// Search persists across filter changes: the scope key includes both,
// so every combination keeps its own cached page state.

import {useCallback, useEffect, useRef, useState} from 'react';
import {
  searchStations,
  getTopStations,
  getStationsByFilters,
  getGenres,
  getCountries,
  getLanguages,
  type RadioBrowseTag,
} from '../../../services/api/radioBrowserService';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import {useAppDispatch, useAppSelector} from '../../../store';
import {
  addLiveFavorite,
  removeLiveFavorite,
  selectLiveFavoritesByKind,
} from '../../../store/slices/liveFavoritesSlice';
import type {RadioStationResult} from '../../../types/api';

export type RadioFilterId = 'genre' | 'country' | 'language';

export interface RadioFilters {
  genre: string | null;
  country: string | null;
  language: string | null;
}

export interface RadioScopeState {
  items: RadioStationResult[];
  page: number;
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

const PAGE_SIZE = 30;

const EMPTY_SCOPE: RadioScopeState = {
  items: [],
  page: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

const EMPTY_FILTERS: RadioFilters = {
  genre: null,
  country: null,
  language: null,
};

function scopeCacheKey(
  filters: RadioFilters,
  term: string,
): string {
  const {genre, country, language} = filters;
  return `radio|${genre ?? ''}|${country ?? ''}|${language ?? ''}|${term.trim()}`;
}

function dedupe(items: RadioStationResult[]): RadioStationResult[] {
  const seen = new Set<string>();
  return items.filter(i => {
    if (seen.has(i.stationuuid)) return false;
    seen.add(i.stationuuid);
    return true;
  });
}

export function useRadioBrowser(initialTag?: string) {
  const {isOnline} = useNetworkStatus();
  const dispatch = useAppDispatch();

  // ── Filters ──
  // P53: a Home rail tile can deep-link straight into a genre; seed the
  // Genre filter so the list is populated on first paint.
  const [filters, setFilters] = useState<RadioFilters>({
    ...EMPTY_FILTERS,
    genre: initialTag ?? null,
  });

  const setFilter = useCallback((id: RadioFilterId, key: string) => {
    setFilters(prev => ({
      ...prev,
      [id]: key ? key : null,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const isSearchActive = searchTerm.trim().length > 0;

  // ── Scopes ──
  const [scopes, setScopes] = useState<Record<string, RadioScopeState>>({});
  const [refreshing, setRefreshing] = useState(false);

  const seqRef = useRef<Record<string, number>>({});
  const guardRef = useRef<Set<string>>(new Set());
  const failedKeyRef = useRef<string | null>(null);
  const wasOnlineRef = useRef(isOnline);

  // ── Redux favorites ──
  const favorites = useAppSelector(s => selectLiveFavoritesByKind(s, 'radio'));

  const isFavoriteId = useCallback(
    (id: string) => favorites.some(f => f.id === id),
    [favorites],
  );

  const keyFor = useCallback(
    () => scopeCacheKey(filters, searchTerm),
    [filters, searchTerm],
  );

  const getScope = useCallback(
    (): RadioScopeState => scopes[keyFor()] ?? EMPTY_SCOPE,
    [scopes, keyFor],
  );

  const patchScope = useCallback(
    (patch: Partial<RadioScopeState>) => {
      const key = keyFor();
      setScopes(prev => ({
        ...prev,
        [key]: {...(prev[key] ?? EMPTY_SCOPE), ...patch},
      }));
    },
    [keyFor],
  );

  const fetchPage = useCallback(
    async (page: number, mode: 'initial' | 'more') => {
      const term = searchTerm.trim();
      const key = keyFor();

      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] = (seqRef.current[key] ?? 0) + 1);

      patchScope({
        isLoading: mode === 'initial',
        isLoadingMore: mode === 'more',
        error: null,
      });

      try {
        let items: RadioStationResult[] = [];
        if (term) {
          items = await searchStations(term, {limit: PAGE_SIZE, page});
        } else if (
          filters.genre ||
          filters.country ||
          filters.language
        ) {
          items = await getStationsByFilters(
            {
              genre: filters.genre ?? undefined,
              country: filters.country ?? undefined,
              language: filters.language ?? undefined,
            },
            {limit: PAGE_SIZE, page},
          );
        } else {
          items = await getTopStations({limit: PAGE_SIZE, page});
        }

        if (seq !== (seqRef.current[key] ?? 0)) return;

        setScopes(prev => {
          const cur = prev[key] ?? EMPTY_SCOPE;
          return {
            ...prev,
            [key]: {
              ...cur,
              items: mode === 'more' ? dedupe([...cur.items, ...items]) : items,
              page,
              hasLoaded: true,
              isLoading: false,
              isLoadingMore: false,
              error: null,
            },
          };
        });
        failedKeyRef.current = null;
      } catch (err) {
        if (seq !== (seqRef.current[key] ?? 0)) return;
        failedKeyRef.current = key;
        patchScope({
          isLoading: false,
          isLoadingMore: false,
          error:
            err instanceof Error ? err.message : 'Failed to load stations',
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, filters, keyFor, patchScope],
  );

  const ensureLoaded = useCallback(() => {
    const scope = getScope();
    if (scope.hasLoaded || scope.isLoading) return;
    fetchPage(1, 'initial');
  }, [getScope, fetchPage]);

  const loadMore = useCallback(() => {
    const scope = getScope();
    if (!scope.hasLoaded || scope.isLoading || scope.isLoadingMore) return;
    if (scope.items.length === 0) return;
    if (scope.items.length % PAGE_SIZE !== 0) return;
    fetchPage(scope.page + 1, 'more');
  }, [getScope, fetchPage]);

  const retry = useCallback(() => {
    const key = keyFor();
    seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
    setScopes(prev => {
      const cur = prev[key];
      if (!cur) return prev;
      return {...prev, [key]: {...cur, items: [], hasLoaded: false}};
    });
    fetchPage(1, 'initial');
  }, [keyFor, fetchPage]);

  // ── Pull-to-refresh ──
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retry();
    setRefreshing(false);
  }, [retry]);

  // ── Browse metadata (all three groups at once — the sheet shows them
  //    simultaneously) ──
  const [tags, setTags] = useState<RadioBrowseTags>({
    genres: [],
    countries: [],
    languages: [],
  });
  const [tagsLoaded, setTagsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTagsLoaded(false);
    (async () => {
      try {
        const [genres, countries, languages] = await Promise.all([
          getGenres(),
          getCountries(),
          getLanguages(),
        ]);
        if (!cancelled) {
          setTags({genres, countries, languages});
          setTagsLoaded(true);
        }
      } catch {
        if (!cancelled) setTagsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Auto-retry on reconnect ──
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && failedKeyRef.current) {
      failedKeyRef.current = null;
      ensureLoaded();
    }
  }, [isOnline, ensureLoaded]);

  // ── Keep current scope loaded (ref-stashed so it fires only when the
  //    scope key changes, not on every parent re-render) ──
  const scopeKey = keyFor();
  const ensureLoadedRef = useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;
  useEffect(() => {
    ensureLoadedRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  // ── Redux actions ──
  const toggleFavorite = useCallback(
    (station: RadioStationResult) => {
      const existing = favorites.find(f => f.id === station.stationuuid);
      if (existing) {
        dispatch(removeLiveFavorite({kind: 'radio', id: station.stationuuid}));
      } else {
        dispatch(
          addLiveFavorite({
            kind: 'radio',
            id: station.stationuuid,
            name: station.name,
            url: station.urlResolved || station.url,
            image: station.favicon || '',
            subtitle: [station.country, station.tags].filter(Boolean).join(' · '),
            codec: station.codec,
            bitrate: station.bitrate,
            addedAt: new Date().toISOString(),
          }),
        );
      }
    },
    [favorites, dispatch],
  );

  const removeFavorite = useCallback(
    (id: string) => {
      dispatch(removeLiveFavorite({kind: 'radio', id}));
    },
    [dispatch],
  );

  const activeFilterCount =
    (filters.genre ? 1 : 0) +
    (filters.country ? 1 : 0) +
    (filters.language ? 1 : 0);

  return {
    // filters
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    // search
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    isOnline,
    // scope
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refreshing,
    handleRefresh,
    // browse metadata
    tags,
    tagsLoaded,
    // favorites
    favorites,
    isFavoriteId,
    toggleFavorite,
    removeFavorite,
  };
}
