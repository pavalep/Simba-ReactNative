// ─── Archive Screen Hook ────────────────────────────────────────────────
// Phase 3 formula: per-scope cache + infinite scroll + search persistence.
//
// A "scope" is a (tab, searchTerm) pair. Every combination is cached
// independently (`key = "${tab}|${term}"`), so:
//   • toggling Audio/Video never loses results already loaded for that scope
//   • typing a search never clears the browse data of the other tab
//   • scrolling back to a visited tab shows its cached list instantly
// Pagination is driven by IA's `numFound` — `loadMore` fetches the next
// page only while `items.length < numFound`.

import {useCallback, useEffect, useRef, useState} from 'react';
import {
  searchInternetArchiveAudio,
  searchInternetArchiveVideos,
} from '../../../services/api/internetArchiveService';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
} from '../../../types/api';

export type ArchiveTab = 'audio' | 'video';

const PAGE_SIZE = 20;
const DEFAULT_AUDIO_QUERY = 'old time radio';
const DEFAULT_VIDEO_QUERY = 'classic films';

// ─── Scope state ────────────────────────────────────────────────────────
// The audio/video scope states differ only in the item type.

export interface AudioScopeState {
  items: InternetArchiveItemResult[];
  /** Total matches across all pages (drives hasMore). */
  numFound: number;
  /** Last loaded page (1-based). 0 = nothing loaded yet. */
  page: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

export interface VideoScopeState {
  items: InternetArchiveVideoResult[];
  numFound: number;
  page: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

/** Non-item scope fields are identical across tabs — one patch type. */
type ScopePatch = Partial<Omit<AudioScopeState, 'items'>>;

export const EMPTY_AUDIO_SCOPE: AudioScopeState = {
  items: [],
  numFound: 0,
  page: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

export const EMPTY_VIDEO_SCOPE: VideoScopeState = {
  items: [],
  numFound: 0,
  page: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

export function scopeCacheKey(tab: ArchiveTab, term: string): string {
  return `${tab}|${term.trim()}`;
}

function dedupeById<T extends {identifier: string}>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(i => {
    if (seen.has(i.identifier)) return false;
    seen.add(i.identifier);
    return true;
  });
}

export function useArchiveScreen(initialTab?: ArchiveTab, initialQuery?: string) {
  const {isOnline} = useNetworkStatus();

  const [tab, setTab] = useState<ArchiveTab>(initialTab ?? 'audio');

  // ── Search (debounced upstream via SearchBar onDebouncedChange) ──
  // searchQuery = live input; searchTerm = settled (debounced) value.
  // The term persists across tab switches by design.
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? '');
  const [searchTerm, setSearchTerm] = useState(initialQuery ?? '');

  const [audioScopes, setAudioScopes] = useState<Record<string, AudioScopeState>>({});
  const [videoScopes, setVideoScopes] = useState<Record<string, VideoScopeState>>({});
  /** Monotonic per-key sequence — drops stale/out-of-order responses. */
  const seqRef = useRef<Record<string, number>>({});
  /** In-flight keys — one fetch per scope at a time. */
  const guardRef = useRef<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const isSearchActive = searchTerm.trim().length > 0;

  const keyFor = useCallback(
    (t: ArchiveTab) => scopeCacheKey(t, searchTerm),
    [searchTerm],
  );

  const getScope = useCallback(
    (t: ArchiveTab): AudioScopeState | VideoScopeState => {
      const key = keyFor(t);
      return t === 'audio'
        ? audioScopes[key] ?? EMPTY_AUDIO_SCOPE
        : videoScopes[key] ?? EMPTY_VIDEO_SCOPE;
    },
    [audioScopes, videoScopes, keyFor],
  );

  const patchScope = useCallback(
    (t: ArchiveTab, patch: ScopePatch) => {
      const key = keyFor(t);
      if (t === 'audio') {
        setAudioScopes(prev => ({
          ...prev,
          [key]: {...(prev[key] ?? EMPTY_AUDIO_SCOPE), ...patch},
        }));
      } else {
        setVideoScopes(prev => ({
          ...prev,
          [key]: {...(prev[key] ?? EMPTY_VIDEO_SCOPE), ...patch},
        }));
      }
    },
    [keyFor],
  );

  const fetchPage = useCallback(
    async (t: ArchiveTab, page: number, mode: 'initial' | 'more') => {
      const term = searchTerm.trim();
      const key = scopeCacheKey(t, term);
      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] = (seqRef.current[key] ?? 0) + 1);

      // Bare search term, or the tab's default browse query.
      const query = term || (t === 'audio' ? DEFAULT_AUDIO_QUERY : DEFAULT_VIDEO_QUERY);

      patchScope(
        t,
        mode === 'initial'
          ? {isLoading: true, error: null}
          : {isLoadingMore: true, error: null},
      );

      try {
        if (t === 'audio') {
          const result = await searchInternetArchiveAudio(query, {
            limit: PAGE_SIZE,
            page,
          });
          if (seq !== (seqRef.current[key] ?? 0)) return; // stale response
          setAudioScopes(prev => {
            const cur = prev[key] ?? EMPTY_AUDIO_SCOPE;
            return {
              ...prev,
              [key]: {
                ...cur,
                items:
                  mode === 'more' ? dedupeById([...cur.items, ...result.items]) : result.items,
                numFound: result.numFound,
                page,
                hasLoaded: true,
                isLoading: false,
                isLoadingMore: false,
                error: null,
              },
            };
          });
        } else {
          const result = await searchInternetArchiveVideos(query, {
            limit: PAGE_SIZE,
            page,
          });
          if (seq !== (seqRef.current[key] ?? 0)) return; // stale response
          setVideoScopes(prev => {
            const cur = prev[key] ?? EMPTY_VIDEO_SCOPE;
            return {
              ...prev,
              [key]: {
                ...cur,
                items:
                  mode === 'more' ? dedupeById([...cur.items, ...result.items]) : result.items,
                numFound: result.numFound,
                page,
                hasLoaded: true,
                isLoading: false,
                isLoadingMore: false,
                error: null,
              },
            };
          });
        }
      } catch (err) {
        if (seq !== (seqRef.current[key] ?? 0)) return;
        patchScope(t, {
          isLoading: false,
          isLoadingMore: false,
          error: err instanceof Error ? err.message : 'Failed to load archive results',
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, patchScope],
  );

  /** Load page 1 for a tab if it isn't loaded yet (scene mount). */
  const ensureLoaded = useCallback(
    (t: ArchiveTab) => {
      const scope = getScope(t);
      if (scope.hasLoaded || scope.isLoading) return;
      fetchPage(t, 1, 'initial');
    },
    [getScope, fetchPage],
  );

  /** Infinite scroll: fetch the next page when available. */
  const loadMore = useCallback(
    (t: ArchiveTab) => {
      const scope = getScope(t);
      if (!scope.hasLoaded || scope.isLoading || scope.isLoadingMore) return;
      if (scope.items.length >= scope.numFound) return; // end of results
      fetchPage(t, scope.page + 1, 'more');
    },
    [getScope, fetchPage],
  );

  /** Re-fetch page 1 after an error (invalidates any stale in-flight seq). */
  const retry = useCallback(
    (t: ArchiveTab) => {
      const key = keyFor(t);
      seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
      if (t === 'audio') {
        setAudioScopes(prev => {
          const cur = prev[key];
          if (!cur) return prev;
          return {...prev, [key]: {...cur, items: [], hasLoaded: false}};
        });
      } else {
        setVideoScopes(prev => {
          const cur = prev[key];
          if (!cur) return prev;
          return {...prev, [key]: {...cur, items: [], hasLoaded: false}};
        });
      }
      fetchPage(t, 1, 'initial');
    },
    [keyFor, fetchPage],
  );

  /** Pull-to-refresh the visible tab's current scope. */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retry(tab);
  }, [retry, tab]);

  /** Instant submit (quick-search chips) — sets both live + settled term. */
  const submitSearch = useCallback((term: string) => {
    setSearchQuery(term);
    setSearchTerm(term);
  }, []);

  /** Tab switch — search text intentionally survives. */
  const selectTab = useCallback((t: ArchiveTab) => {
    setTab(t);
  }, []);

  // Keep the active tab's scope loaded when it (or the search term)
  // changes — covers the very first mount and every new search term.
  // [FIX-PODCASTS-LOOP] Stash ensureLoaded in a ref so the effect only
  // re-fires when the tab or search term actually changes — not on
  // every parent re-render.
  const ensureLoadedRef = useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;
  useEffect(() => {
    ensureLoadedRef.current(tab);
  }, [tab, keyFor]);

  // ── Auto-retry a failed scope when connectivity returns ──
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && getScope(tab).error) {
      retry(tab);
    }
  }, [isOnline, getScope, tab, retry]);

  return {
    tab,
    selectTab,
    // search
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    submitSearch,
    isSearchActive,
    // connectivity / refresh
    isOnline,
    refreshing,
    handleRefresh,
    // per-scope data + actions
    getScope,
    ensureLoaded,
    loadMore,
    retry,
  };
}
