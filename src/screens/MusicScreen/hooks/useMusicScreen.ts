// ─── Music Screen Hook ─────────────────────────────────────────────────
// v10.1 FAB-only formula: per-scope cache + infinite scroll + search
// persistence. No tabs — the FAB's FILTER group is the genre picker.
//
// A "scope" is a (genre, searchTerm) pair. Every combination is cached
// independently (`key = "${genre}|${term}"`), so:
//   • switching genres never loses results already loaded for that scope
//   • typing a search never clears the genre browse data
//   • revisiting a genre shows its cached list instantly
// Fetch branches (single stream, filter-aware):
//   • search term → global Jamendo search
//   • genre ('' = none = "All") → genre browse / global popular
// Pagination via Jamendo's {limit, page} for ALL branches — the "All"
// stream paginates through `getPopularJamendoTracks(limit, page)`.
//
// The active genre is NOT owned here — the shell's useSectionOptions
// holds the FILTER state and `renderContent` passes the current key in
// (mirrors the Movies pilot). This hook is stateless re: genre.

import {useCallback, useRef, useState} from 'react';
import {
  searchJamendoTracks,
  getJamendoTracksByGenre,
  getPopularJamendoTracks,
} from '../../../services/api/jamendoService';
import type {JamendoTrackResult} from '../../../types/api';

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
export const EMPTY_SCOPE: MusicScopeState = {
  items: [],
  page: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

/** '' (empty string) = the "All" default stream (no genre filter). */
export function scopeCacheKey(genre: string, term: string): string {
  return `${genre}|${term.trim()}`;
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

export function useMusicScreen() {
  // ── Search (debounced upstream via SearchBar onDebouncedChange) ──
  // searchQuery = live input; searchTerm = settled (debounced) value.
  // The term persists across filter switches by design.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [scopes, setScopes] = useState<Record<string, MusicScopeState>>({});
  /** Monotonic per-key sequence — drops stale/out-of-order responses. */
  const seqRef = useRef<Record<string, number>>({});
  /** In-flight keys — one fetch per scope at a time. */
  const guardRef = useRef<Set<string>>(new Set());

  const isSearchActive = searchTerm.trim().length > 0;

  const keyFor = useCallback(
    (genre: string) => scopeCacheKey(genre, searchTerm),
    [searchTerm],
  );

  const getScope = useCallback(
    (genre: string): MusicScopeState =>
      scopes[keyFor(genre)] ?? EMPTY_SCOPE,
    [scopes, keyFor],
  );

  const patchScope = useCallback(
    (genre: string, patch: Partial<MusicScopeState>) => {
      const key = keyFor(genre);
      setScopes(prev => ({
        ...prev,
        [key]: {...(prev[key] ?? EMPTY_SCOPE), ...patch},
      }));
    },
    [keyFor],
  );

  const fetchPage = useCallback(
    async (genre: string, page: number, mode: 'initial' | 'more') => {
      const term = searchTerm.trim();
      const key = scopeCacheKey(genre, term);
      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] = (seqRef.current[key] ?? 0) + 1);

      if (mode === 'initial') {
        patchScope(genre, {isLoading: true, error: null});
      } else {
        patchScope(genre, {isLoadingMore: true, error: null});
      }

      try {
        // Single stream, filter-aware: a search term takes priority (global
        // search — same as the legacy Search tab); otherwise an active genre
        // browses that genre; '' = the popular "All" stream. All branches
        // paginate.
        let items: JamendoTrackResult[];
        if (term) {
          items = await searchJamendoTracks(term, {
            limit: PAGE_SIZE,
            page,
          });
        } else if (genre) {
          items = await getJamendoTracksByGenre(genre, {
            limit: PAGE_SIZE,
            page,
          });
        } else {
          items = await getPopularJamendoTracks(PAGE_SIZE, page);
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
      } catch (err) {
        if (seq !== (seqRef.current[key] ?? 0)) return;
        patchScope(genre, {
          isLoading: false,
          isLoadingMore: false,
          error: err instanceof Error ? err.message : 'Failed to load tracks',
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, patchScope],
  );

  /** Load page 1 for a genre if it isn't loaded yet (content mount). */
  const ensureLoaded = useCallback(
    (genre: string) => {
      const scope = getScope(genre);
      if (scope.hasLoaded || scope.isLoading) return;
      fetchPage(genre, 1, 'initial');
    },
    [getScope, fetchPage],
  );

  /** Infinite scroll: fetch the next page when available. */
  const loadMore = useCallback(
    (genre: string) => {
      const scope = getScope(genre);
      if (!scope.hasLoaded || scope.isLoading || scope.isLoadingMore) return;
      if (scope.items.length % PAGE_SIZE !== 0) return; // last page was partial
      if (scope.items.length === 0) return;
      fetchPage(genre, scope.page + 1, 'more');
    },
    [getScope, fetchPage],
  );

  /** Re-fetch page 1 after an error (invalidates any stale in-flight seq). */
  const retry = useCallback(
    (genre: string) => {
      const key = keyFor(genre);
      seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
      setScopes(prev => {
        const cur = prev[key];
        if (!cur) return prev;
        return {...prev, [key]: {...cur, items: [], hasLoaded: false}};
      });
      fetchPage(genre, 1, 'initial');
    },
    [keyFor, fetchPage],
  );

  /** Pull-to-refresh: re-fetch page 1 while KEEPING items visible. The
   *  RefreshControl spins off `isLoading`; `hasLoaded` stays true, so the
   *  list remains in the ready slot (the shared 'loading' skeleton is only
   *  for the first page-1 fetch). Guarded so a pull during any in-flight
   *  fetch can never stack requests. */
  const refresh = useCallback(
    (genre: string) => {
      const scope = getScope(genre);
      if (scope.isLoading || scope.isLoadingMore) return;
      fetchPage(genre, 1, 'initial');
    },
    [getScope, fetchPage],
  );

  return {
    // search
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    // per-scope data + actions
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refresh,
  };
}
