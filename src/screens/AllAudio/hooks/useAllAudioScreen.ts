// ────────────────────────────────────────────────────────
// Simba Player — useAllAudioScreen Hook (Phase 20)
// 54.3: pull-to-refresh triggers a media re-scan.
//
// V20.10: the manual `refreshing` state was redundant —
// `useMediaScanner()` already exposes `isScanning` from the
// Zustand store. The hook's `handleRefresh` is now a 1-liner
// that just calls `startScan(true)`, and the screen's
// `<RefreshControl>` reads `isScanning` directly.
// ────────────────────────────────────────────────────────

import {useCallback, useMemo, useState} from 'react';
// V17 Phase 86: `createSelector` from `@reduxjs/toolkit` removed.
import {useMediaScanner} from '../../../hooks/useMediaScanner';
import {useResumeAwareLaunch} from '../../../infrastructure/player';
import {useMediaAudioTracks} from '../../../state';

export type SortMode = 'title' | 'artist';
export type ViewMode = 'grid' | 'list';

export interface UseAllAudioScreenResult {
  audioTracks: ScannedTrack[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortMode: SortMode;
  toggleSort: () => void;
  viewMode: ViewMode;
  toggleViewMode: () => void;
  filteredTracks: ScannedTrack[];
  handlePlayTrack: (uri: string, title: string) => void;
  /** 54.3: pull-to-refresh state (now the store's `isScanning`). */
  refreshing: boolean;
  handleRefresh: () => void;
}

/**
 * The All Audio screen's hook.
 *
 * `initialSort` and `initialFilter` are the route's params. They were
 * declared by the route and sent by two callers, and the screen read
 * NEITHER of them:
 *
 *   • the Artist screen's "view all tracks" sent `filter: artistName`
 *     and the page opened showing every track on the device; and
 *   • the Library's "View All Artists" sent `sort: 'artist'` and the
 *     page opened sorted by title.
 *
 * A param the screen ignores is a promise the app does not keep, so
 * the screen keeps them now.
 */
export function useAllAudioScreen(
  initialSort?: string,
  initialFilter?: string,
): UseAllAudioScreenResult {
  const {openPlayer} = useResumeAwareLaunch();
  const [searchQuery, setSearchQuery] = useState('');
  // The route's `sort` picks the opening order; the toggle still works
  // after that, because the sort is the screen's own state.
  const [sortMode, setSortMode] = useState<SortMode>(
    initialSort === 'artist' ? 'artist' : 'title',
  );
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  // V20.10: `isScanning` comes from the media-scan store directly
  // (via `useMediaScanner()`). No local `refreshing` state — the
  // scan-in-flight boolean is the single source of truth.
  const {startScan, isScanning} = useMediaScanner();

  const audioTracks = useMediaAudioTracks();

  const toggleSort = useCallback(() => {
    setSortMode(s => (s === 'title' ? 'artist' : 'title'));
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(v => (v === 'grid' ? 'list' : 'grid'));
  }, []);

  const filteredTracks = useMemo(() => {
    let result = [...audioTracks];

    // The route's `filter` — the Artist screen's "view all tracks"
    // sends the artist's name, and the page is that artist's tracks.
    // The match is on the ARTIST, case-insensitively: the caller sends
    // the name it knows the track by.
    const artistFilter = initialFilter?.trim().toLowerCase();
    if (artistFilter) {
      result = result.filter(t => t.artist.toLowerCase() === artistFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q),
      );
    }

    // Apply sort
    result.sort((a, b) => {
      if (sortMode === 'title') return a.title.localeCompare(b.title);
      // The artist sort breaks ties on the TITLE: without it, two tracks
      // by the same artist keep the device's scan order, so the list's
      // order would change with the folder the media was found in.
      const byArtist = a.artist.localeCompare(b.artist);
      return byArtist !== 0 ? byArtist : a.title.localeCompare(b.title);
    });

    return result;
  }, [audioTracks, searchQuery, sortMode, initialFilter]);

  const handlePlayTrack = useCallback(
    (uri: string, title: string) => {
      openPlayer({
        uri,
        title,
        type: 'audio',
      });
    },
    [openPlayer],
  );

  // 54.3: pull-to-refresh — force a full re-scan of linked folders.
  // V20.10: no async wrapper / no spinner state — the store's
  // `isScanning` is the single source of truth for the
  // `<RefreshControl refreshing={...}>` boolean.
  const handleRefresh = useCallback(() => {
    startScan(true);
  }, [startScan]);

  return {
    audioTracks,
    searchQuery,
    setSearchQuery,
    sortMode,
    toggleSort,
    viewMode,
    toggleViewMode,
    filteredTracks,
    handlePlayTrack,
    refreshing: isScanning,
    handleRefresh,
  };
}

import type {ScannedTrack} from '../../../state';
