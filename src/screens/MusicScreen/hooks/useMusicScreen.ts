// ─── Music Screen Hook ─────────────────────────────────────────────────
// Phase 3 formula: per-scope cache + infinite scroll + search persistence.
//
// A "scope" is a (tab, searchTerm, selectedGenre) triple. Every combination
// is cached independently (`key = "${tab}|${term}|${genre}"`), so:
//   • toggling tabs never loses results already loaded for that scope
//   • typing a search never clears the genre browse data
//   • scrolling back to a visited tab shows its cached list instantly
// Pagination via Jamendo's {limit, page} for search/genres; popular tab
// uses popularity_total ordering with a single fetch (no page param).

import {useCallback, useEffect, useRef, useState} from 'react';
import {
  searchJamendoTracks,
  getJamendoTracksByGenre,
  getPopularJamendoTracks,
} from '../../../services/api/jamendoService';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {JamendoTrackResult} from '../../../types/api';

// ─── Tab types ──────────────────────────────────────────────────────────

export type MusicTab = 'search' | 'genres' | 'popular';

export const MUSIC_TABS: Array<{key: MusicTab; title: string}> = [
  {key: 'search', title: 'Search'},
  {key: 'genres', title: 'Genres'},
  {key: 'popular', title: 'Popular'},
];

export const JAMENDO_GENRES = [
  'rock',
  'pop',
  'jazz',
  'classical',
  'electronic',
  'hiphop',
  'metal',
  'blues',
  'country',
  'folk',
  'reggae',
  'latin',
] as const;

const PAGE_SIZE = 20;

// ─── Scope state ────────────────────────────────────────────────────────

export interface MusicScopeState {
  items: JamendoTrackResult[];
  /** Last loaded page (1-based). 0 = nothing loaded yet. */
  page: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

/** Shared immutable empty state — keeps memoized scenes stable. */
const EMPTY_SCOPE: MusicScopeState = {
  items: [],
  page: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

function scopeCacheKey(
  tab: MusicTab,
  term: string,
  genre: string,
): string {
  return `${tab}|${term.trim()}|${genre}`;
}

function dedupe(items: JamendoTrackResult[]): JamendoTrackResult[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useMusicScreen(initialTab?: string) {
  const {isOnline} = useNetworkStatus();

  const [selectedTab, setSelectedTab] = useState<MusicTab>(
    (initialTab as MusicTab) || 'search',
  );
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const isSearchActive = searchTerm.trim().length > 0;

  const [scopes, setScopes] = useState<Record<string, MusicScopeState>>({});
  const [refreshing, setRefreshing] = useState(false);

  const seqRef = useRef<Record<string, number>>({});
  const guardRef = useRef<Set<string>>(new Set());
  const failedKeyRef = useRef<string | null>(null);
  const wasOnlineRef = useRef(isOnline);

  const keyFor = useCallback(
    (tab: MusicTab) =>
      scopeCacheKey(tab, searchTerm, selectedGenre ?? ''),
    [searchTerm, selectedGenre],
  );

  const getScope = useCallback(
    (tab: MusicTab): MusicScopeState =>
      scopes[keyFor(tab)] ?? EMPTY_SCOPE,
    [scopes, keyFor],
  );

  const patchScope = useCallback(
    (tab: MusicTab, patch: Partial<MusicScopeState>) => {
      const key = keyFor(tab);
      setScopes(prev => ({
        ...prev,
        [key]: {...(prev[key] ?? EMPTY_SCOPE), ...patch},
      }));
    },
    [keyFor],
  );

  const fetchPage = useCallback(
    async (tab: MusicTab, page: number, mode: 'initial' | 'more') => {
      const term = searchTerm.trim();
      const genre = selectedGenre;
      const key = scopeCacheKey(tab, term, genre ?? '');

      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] = (seqRef.current[key] ?? 0) + 1);

      if (mode === 'initial') {
        patchScope(tab, {isLoading: true, error: null});
      } else {
        patchScope(tab, {isLoadingMore: true, error: null});
      }

      try {
        let items: JamendoTrackResult[] = [];

        if (tab === 'search' && term) {
          items = await searchJamendoTracks(term, {
            limit: PAGE_SIZE,
            page,
          });
        } else if (tab === 'genres' && genre) {
          items = await getJamendoTracksByGenre(genre, {
            limit: PAGE_SIZE,
            page,
          });
        } else if (tab === 'popular') {
          items = await getPopularJamendoTracks(PAGE_SIZE);
        }

        if (seq !== (seqRef.current[key] ?? 0)) return; // stale response

        setScopes(prev => {
          const cur = prev[key] ?? EMPTY_SCOPE;
          return {
            ...prev,
            [key]: {
              ...cur,
              items:
                mode === 'more'
                  ? dedupe([...cur.items, ...items])
                  : items,
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
          error:
            err instanceof Error
              ? err.message
              : 'Failed to load tracks',
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, selectedGenre, patchScope],
  );

  /** Load page 1 for a tab if it isn't loaded yet (scene mount). */
  const ensureLoaded = useCallback(
    (tab: MusicTab) => {
      // No-op when prerequisites aren't met
      if (tab === 'search' && !isSearchActive) return; // empty prompt state
      if (tab === 'genres' && !selectedGenre) return; // show genre chips prompt
      const scope = getScope(tab);
      if (scope.hasLoaded || scope.isLoading) return;
      fetchPage(tab, 1, 'initial');
    },
    [getScope, fetchPage, isSearchActive, selectedGenre],
  );

  /** Infinite scroll: fetch the next page when available. */
  const loadMore = useCallback(
    (tab: MusicTab) => {
      if (tab === 'popular') return; // no pagination — single fetch only
      const scope = getScope(tab);
      if (!scope.hasLoaded || scope.isLoading || scope.isLoadingMore)
        return;
      if (scope.items.length % PAGE_SIZE !== 0) return; // last page was partial
      if (scope.items.length === 0) return;
      fetchPage(tab, scope.page + 1, 'more');
    },
    [getScope, fetchPage],
  );

  /** Re-fetch page 1 after an error. */
  const retry = useCallback(
    (tab: MusicTab) => {
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
    retry(selectedTab);
    // Retry is synchronous (state update) + async (fetch). The scope's
    // isLoading will drop when the fetch completes — we mirror that
    // onto `refreshing` so the RefreshControl stops spinning.
    setRefreshing(false);
  }, [retry, selectedTab]);

  // ── Tab / genre selection (search text intentionally survives) ──
  const selectTab = useCallback((tab: MusicTab) => {
    setSelectedTab(tab);
  }, []);

  const selectGenre = useCallback((genre: string | null) => {
    setSelectedGenre(genre);
  }, []);

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

  return {
    selectedTab,
    selectTab,
    selectedGenre,
    selectGenre,
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
    // refresh
    refreshing,
    handleRefresh,
  };
}
