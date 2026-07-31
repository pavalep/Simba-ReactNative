// ─── Live TV Screen Hook ────────────────────────────────────
// Phase 36.4/36.5: browse IPTV-org channels (all / by real
// category / favorites) + search. Favorites persisted via the
// liveFavorites slice; playback hands off to VideoPlayer with
// the channel list for channel up/down.

import {useState, useEffect, useCallback, useRef} from 'react';
import {
  getAllIPTVChannels,
  searchIPTVChannels,
  getChannelsByCategory,
  getIPTVCategories,
} from '../../../services/api/iptvService';
import {useDebounce} from '../../../hooks/useDebounce';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import {useAppDispatch, useAppSelector} from '../../../store';
import {
  addLiveFavorite,
  removeLiveFavorite,
  selectLiveFavoritesByKind,
} from '../../../store/slices/liveFavoritesSlice';
import type {IPTVChannelResult, IPTVCategory} from '../../../types/api';

export type LiveTVMode = 'all' | 'categories' | 'favorites';

const CHANNEL_LIMIT = 200;

export function useLiveTVScreen(initialCategoryId?: string) {
  const {isOnline} = useNetworkStatus();
  const dispatch = useAppDispatch();

  const [mode, setMode] = useState<LiveTVMode>(
    initialCategoryId ? 'categories' : 'all',
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategoryId ?? null,
  );
  const [categories, setCategories] = useState<IPTVCategory[]>([]);
  const [channels, setChannels] = useState<IPTVChannelResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const fetchingRef = useRef(false);
  const failedRef = useRef(false);

  const favorites = useAppSelector(s => selectLiveFavoritesByKind(s, 'tv'));

  const isFavoriteId = useCallback(
    (id: string) => favorites.some(f => f.id === id),
    [favorites],
  );

  // ── Channel loading ──
  const loadChannels = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const q = debouncedSearch.trim();
      let items: IPTVChannelResult[] = [];
      if (q) {
        items = await searchIPTVChannels(q, {limit: CHANNEL_LIMIT});
      } else if (mode === 'all') {
        items = await getAllIPTVChannels({limit: CHANNEL_LIMIT});
      } else if (mode === 'categories' && selectedCategory) {
        items = await getChannelsByCategory(selectedCategory, {
          limit: CHANNEL_LIMIT,
        });
      }
      setChannels(items);
      failedRef.current = false;
    } catch (err) {
      failedRef.current = true;
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, mode, selectedCategory]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // ── Category list (real data from iptv-org) ──
  useEffect(() => {
    let cancelled = false;
    if (debouncedSearch.trim() || mode !== 'categories') {
      setCategories([]);
      return;
    }
    (async () => {
      try {
        const list = await getIPTVCategories();
        if (!cancelled) setCategories(list);
      } catch {
        // Channel-level error state already covers failures
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
      loadChannels();
    }
  }, [isOnline, loadChannels]);

  const retry = useCallback(() => {
    setChannels([]);
    loadChannels();
  }, [loadChannels]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retry();
  }, [retry]);

  const handleModeChange = useCallback((next: LiveTVMode) => {
    setMode(next);
    setSelectedCategory(null);
    setSearchQuery('');
  }, []);

  const toggleFavorite = useCallback(
    (channel: IPTVChannelResult) => {
      const existing = favorites.find(f => f.id === channel.id);
      if (existing) {
        dispatch(removeLiveFavorite({kind: 'tv', id: channel.id}));
      } else {
        dispatch(
          addLiveFavorite({
            kind: 'tv',
            id: channel.id,
            name: channel.name,
            url: channel.url,
            image: channel.logo || '',
            subtitle: [channel.category, channel.country]
              .filter(Boolean)
              .join(' · '),
            addedAt: new Date().toISOString(),
          }),
        );
      }
    },
    [favorites, dispatch],
  );

  const removeFavorite = useCallback(
    (id: string) => {
      dispatch(removeLiveFavorite({kind: 'tv', id}));
    },
    [dispatch],
  );

  return {
    mode,
    setMode: handleModeChange,
    selectedCategory,
    setSelectedCategory,
    categories,
    channels,
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
