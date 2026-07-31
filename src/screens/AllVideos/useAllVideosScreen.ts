// ────────────────────────────────────────────────────────
// Simba Player — useAllVideosScreen Hook (Phase 20)
// 54.3: pull-to-refresh triggers a media re-scan.
// ────────────────────────────────────────────────────────

import {useCallback, useMemo, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector} from '../../store';
import {selectAllTracks} from '../../store/slices/mediaSlice';
import {useMediaScanner} from '../../hooks/useMediaScanner';
import type {ScannedTrack} from '../../store/slices/mediaSlice';

export type SortMode = 'title' | 'date';
export type ViewMode = 'grid' | 'list';

export interface UseAllVideosScreenResult {
  videoTracks: ScannedTrack[];
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

export function useAllVideosScreen(): UseAllVideosScreenResult {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('title');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const {startScan} = useMediaScanner();

  const videoTracks = useAppSelector(state =>
    selectAllTracks(state).filter(t => t.mediaType === 'video'),
  );

  const toggleSort = useCallback(() => {
    setSortMode(s => (s === 'title' ? 'date' : 'title'));
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(v => (v === 'grid' ? 'list' : 'grid'));
  }, []);

  const filteredTracks = useMemo(() => {
    let result = [...videoTracks];

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
      return b.year - a.year; // date: most recent first
    });

    return result;
  }, [videoTracks, searchQuery, sortMode]);

  const handlePlayTrack = useCallback(
    (uri: string, title: string) => {
      navigation.navigate('VideoPlayer', {fileUri: uri, fileTitle: title});
    },
    [navigation],
  );

  // 54.3: pull-to-refresh — force a full re-scan of linked folders
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await startScan(true);
    setRefreshing(false);
  }, [startScan]);

  return {
    videoTracks,
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
