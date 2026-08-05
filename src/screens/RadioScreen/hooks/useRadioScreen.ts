// ─── Radio Screen Hook ──────────────────────────────────────────────
// Phase 3 formula: each browse mode is a TabView tab.
//   • search stays at screen level, scoped per (tab, term, tag)
//   • per-scope cache + pagination (Radio Browser offset/page support)
//   • Favorites tab = local Redux data (no API fetch)
//   • auto-retry on reconnect, pull-to-refresh

import {useCallback, useEffect, useRef, useState} from 'react';
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

export const RADIO_TABS: Array<{key: RadioBrowseMode; title: string}> = [
  {key: 'top', title: 'Top'},
  {key: 'genres', title: 'Genres'},
  {key: 'countries', title: 'Countries'},
  {key: 'languages', title: 'Languages'},
  {key: 'favorites', title: 'Favorites'},
];

const PAGE_SIZE = 30;

export interface RadioScopeState {
  items: RadioStationResult[];
  page: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

const EMPTY_SCOPE: RadioScopeState = {
  items: [],
  page: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

function scopeCacheKey(tab: RadioBrowseMode, term: string, tag: string): string {
  return `radio|${tab}|${term.trim()}|${tag}`;
}

function dedupe(items: RadioStationResult[]): RadioStationResult[] {
  const seen = new Set<string>();
  return items.filter(i => {
    if (seen.has(i.stationuuid)) return false;
    seen.add(i.stationuuid);
    return true;
  });
}

export function useRadioScreen(initialTab?: string) {
  const {isOnline} = useNetworkStatus();
  const dispatch = useAppDispatch();

  const [selectedTab, setSelectedTab] = useState<RadioBrowseMode>(
    (initialTab as RadioBrowseMode) || 'top',
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tags, setTags] = useState<RadioBrowseTag[]>([]);
  const [tagsLoaded, setTagsLoaded] = useState(false);

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const isSearchActive = searchTerm.trim().length > 0;

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
    (tab: RadioBrowseMode) => scopeCacheKey(tab, searchTerm, selectedTag ?? ''),
    [searchTerm, selectedTag],
  );

  const getScope = useCallback(
    (tab: RadioBrowseMode): RadioScopeState =>
      tab === 'favorites'
        ? {...EMPTY_SCOPE, items: favorites as unknown as RadioStationResult[], hasLoaded: true}
        : scopes[keyFor(tab)] ?? EMPTY_SCOPE,
    [scopes, keyFor, favorites],
  );

  const patchScope = useCallback(
    (tab: RadioBrowseMode, patch: Partial<RadioScopeState>) => {
      if (tab === 'favorites') return;
      const key = keyFor(tab);
      setScopes(prev => ({
        ...prev,
        [key]: {...(prev[key] ?? EMPTY_SCOPE), ...patch},
      }));
    },
    [keyFor],
  );

  const fetchPage = useCallback(
    async (tab: RadioBrowseMode, page: number, mode: 'initial' | 'more') => {
      if (tab === 'favorites') return;
      const term = searchTerm.trim();
      const tag = selectedTag;
      const key = scopeCacheKey(tab, term, tag ?? '');

      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] = (seqRef.current[key] ?? 0) + 1);

      patchScope(tab, {isLoading: mode === 'initial', isLoadingMore: mode === 'more', error: null});

      try {
        let items: RadioStationResult[] = [];

        if (term) {
          items = await searchStations(term, {limit: PAGE_SIZE, page});
        } else {
          switch (tab) {
            case 'top':
              items = await getTopStations({limit: PAGE_SIZE, page});
              break;
            case 'genres':
              if (tag) items = await getStationsByGenre(tag, {limit: PAGE_SIZE, page});
              break;
            case 'countries':
              if (tag) items = await getStationsByCountry(tag, {limit: PAGE_SIZE, page});
              break;
            case 'languages':
              if (tag) items = await getStationsByLanguage(tag, {limit: PAGE_SIZE, page});
              break;
          }
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
        patchScope(tab, {
          isLoading: false,
          isLoadingMore: false,
          error: err instanceof Error ? err.message : 'Failed to load stations',
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, selectedTag, patchScope],
  );

  const ensureLoaded = useCallback(
    (tab: RadioBrowseMode) => {
      if (tab === 'favorites') return;
      if ((tab === 'genres' || tab === 'countries' || tab === 'languages') && !selectedTag)
        return; // need a tag first
      const scope = getScope(tab);
      if (scope.hasLoaded || scope.isLoading) return;
      fetchPage(tab, 1, 'initial');
    },
    [getScope, fetchPage, selectedTag],
  );

  const loadMore = useCallback(
    (tab: RadioBrowseMode) => {
      if (tab === 'favorites') return;
      const scope = getScope(tab);
      if (!scope.hasLoaded || scope.isLoading || scope.isLoadingMore) return;
      if (scope.items.length % PAGE_SIZE !== 0) return;
      if (scope.items.length === 0) return;
      fetchPage(tab, scope.page + 1, 'more');
    },
    [getScope, fetchPage],
  );

  const retry = useCallback(
    (tab: RadioBrowseMode) => {
      if (tab === 'favorites') return;
      const key = keyFor(tab);
      seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
      setScopes(prev => {
        const cur = prev[key];
        if (!cur) return prev;
        return {...prev, [key]: {...cur, items: [], hasLoaded: false}};
      });
      fetchPage(tab, 1, 'initial');
    },
    [keyFor, fetchPage],
  );

  // ── Pull-to-refresh ──
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedTab !== 'favorites') retry(selectedTab);
    setRefreshing(false);
  }, [retry, selectedTab]);

  // ── Tags (genres/countries/languages) ──
  useEffect(() => {
    let cancelled = false;
    if (isSearchActive || selectedTab === 'top' || selectedTab === 'favorites') {
      setTags([]);
      setTagsLoaded(false);
      return;
    }
    setTagsLoaded(false);
    (async () => {
      try {
        const list =
          selectedTab === 'genres'
            ? await getGenres()
            : selectedTab === 'countries'
            ? await getCountries()
            : await getLanguages();
        if (!cancelled) {
          setTags(list);
          setTagsLoaded(true);
        }
      } catch {
        if (!cancelled) setTagsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTab, isSearchActive]);

  // ── Auto-retry on reconnect ──
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && failedKeyRef.current) {
      failedKeyRef.current = null;
      ensureLoaded(selectedTab);
    }
  }, [isOnline, ensureLoaded, selectedTab]);

  // ── Keep current tab loaded ──
  useEffect(() => {
    ensureLoaded(selectedTab);
  }, [selectedTab, ensureLoaded, keyFor]);

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

  return {
    selectedTab,
    setSelectedTab,
    selectedTag,
    setSelectedTag,
    tags,
    tagsLoaded,
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
    // favorites
    favorites,
    isFavoriteId,
    toggleFavorite,
    removeFavorite,
  };
}
