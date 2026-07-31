// ─── Radio Screen Hook ──────────────────────────────────────
// Phase 36.1/36.3: browse radio stations by top / genre /
// country / language / favorites + search. Favorites are
// persisted via the liveFavorites slice.

import {useState, useEffect, useCallback, useRef} from 'react';
import {
  searchStations,
  getTopStations,
  getStationsByGenre,
  getStationsByCountry,
  getStationsByLanguage,
  getGenres,
  getCountries,
  getLanguages,
  type RadioBrowseTag,
} from '../../../services/api/radioBrowserService';
import {useDebounce} from '../../../hooks/useDebounce';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import {useAppDispatch, useAppSelector} from '../../../store';
import {
  addLiveFavorite,
  removeLiveFavorite,
  selectLiveFavoritesByKind,
} from '../../../store/slices/liveFavoritesSlice';
import type {RadioStationResult} from '../../../types/api';

export type RadioBrowseMode =
  | 'top'
  | 'genres'
  | 'countries'
  | 'languages'
  | 'favorites';

const STATION_LIMIT = 50;

export function useRadioScreen(initialTab?: string) {
  const {isOnline} = useNetworkStatus();
  const dispatch = useAppDispatch();

  const [mode, setMode] = useState<RadioBrowseMode>(
    (initialTab as RadioBrowseMode) || 'top',
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tags, setTags] = useState<RadioBrowseTag[]>([]);
  const [stations, setStations] = useState<RadioStationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const fetchingRef = useRef(false);
  const failedRef = useRef(false);

  const favorites = useAppSelector(s => selectLiveFavoritesByKind(s, 'radio'));

  const isFavoriteId = useCallback(
    (id: string) => favorites.some(f => f.id === id),
    [favorites],
  );

  // ── Station loading (top / tag / search) ──
  const loadStations = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const q = debouncedSearch.trim();
      let items: RadioStationResult[] = [];
      if (q) {
        items = await searchStations(q, {limit: STATION_LIMIT});
      } else if (mode === 'top') {
        items = await getTopStations({limit: STATION_LIMIT});
      } else if (mode === 'genres' && selectedTag) {
        items = await getStationsByGenre(selectedTag, {limit: STATION_LIMIT});
      } else if (mode === 'countries' && selectedTag) {
        items = await getStationsByCountry(selectedTag, {
          limit: STATION_LIMIT,
        });
      } else if (mode === 'languages' && selectedTag) {
        items = await getStationsByLanguage(selectedTag, {
          limit: STATION_LIMIT,
        });
      }
      setStations(items);
      failedRef.current = false;
    } catch (err) {
      failedRef.current = true;
      setError(err instanceof Error ? err.message : 'Failed to load stations');
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, mode, selectedTag]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  // ── Browse tags (genres / countries / languages) ──
  useEffect(() => {
    let cancelled = false;
    if (
      debouncedSearch.trim() ||
      mode === 'top' ||
      mode === 'favorites'
    ) {
      setTags([]);
      return;
    }
    (async () => {
      try {
        const list =
          mode === 'genres'
            ? await getGenres()
            : mode === 'countries'
            ? await getCountries()
            : await getLanguages();
        if (!cancelled) setTags(list);
      } catch {
        // Station-level error state already covers failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, debouncedSearch]);

  // ── Auto-retry the failed query when connectivity returns ──
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && failedRef.current) {
      failedRef.current = false;
      loadStations();
    }
  }, [isOnline, loadStations]);

  const retry = useCallback(() => {
    setStations([]);
    loadStations();
  }, [loadStations]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retry();
  }, [retry]);

  const handleModeChange = useCallback((next: RadioBrowseMode) => {
    setMode(next);
    setSelectedTag(null);
    setSearchQuery('');
  }, []);

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
            subtitle: [station.country, station.tags]
              .filter(Boolean)
              .join(' · '),
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

  return {
    mode,
    setMode: handleModeChange,
    selectedTag,
    setSelectedTag,
    tags,
    stations,
    favorites,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    isOnline,
    refreshing,
    handleRefresh,
    retry,
    isFavoriteId,
    toggleFavorite,
    removeFavorite,
  };
}
