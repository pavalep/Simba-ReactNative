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
import {usePlayerActivity} from '../../../infrastructure/player';
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

export function useAllAudioScreen(): UseAllAudioScreenResult {
  const {openPlayer} = usePlayerActivity();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('title');
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
      return a.artist.localeCompare(b.artist);
    });

    return result;
  }, [audioTracks, searchQuery, sortMode]);

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
