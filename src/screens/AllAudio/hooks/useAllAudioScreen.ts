// ────────────────────────────────────────────────────────
// Simba Player — useAllAudioScreen Hook (Phase 20)
// 54.3: pull-to-refresh triggers a media re-scan.
// ────────────────────────────────────────────────────────

import {useCallback, useMemo, useState} from 'react';
import {createSelector} from '@reduxjs/toolkit';
import {useAppSelector} from '../../../store';
import {selectAllTracks} from '../../../store/slices/mediaSlice';
import {useMediaScanner} from '../../../hooks/useMediaScanner';
import {usePlaybackCommands} from '../../../modules/playback/PlaybackContext';
import type {ScannedTrack} from '../../../store/slices/mediaSlice';

// 59.2: stable selector — inline filters re-ran on EVERY store dispatch
// (incl. mpv position ticks) and re-rendered the whole screen.
const selectAudioTracks = createSelector([selectAllTracks], tracks =>
  tracks.filter(t => t.mediaType === 'audio'),
);

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
  /** 54.3: pull-to-refresh state + handler */
  refreshing: boolean;
  handleRefresh: () => void;
}

export function useAllAudioScreen(): UseAllAudioScreenResult {
  const {openPlayer} = usePlaybackCommands();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('title');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const {startScan} = useMediaScanner();

  const audioTracks = useAppSelector(selectAudioTracks);

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
        duration: 0,
        source: 'local',
        type: 'audio',
        mediaType: 'audio',
      });
    },
    [openPlayer],
  );

  // 54.3: pull-to-refresh — force a full re-scan of linked folders
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await startScan(true);
    setRefreshing(false);
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
    refreshing,
    handleRefresh,
  };
}
