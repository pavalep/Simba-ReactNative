// ────────────────────────────────────────────────────────
// Simba Player — useAllAudioScreen Hook (Phase 20)
// ────────────────────────────────────────────────────────

import {useCallback, useMemo, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector} from '../../store';
import {selectAllTracks} from '../../store/slices/mediaSlice';
import type {ScannedTrack} from '../../store/slices/mediaSlice';

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
}

export function useAllAudioScreen(): UseAllAudioScreenResult {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('title');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const audioTracks = useAppSelector(state =>
    selectAllTracks(state).filter(t => t.mediaType === 'audio'),
  );

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
      navigation.navigate('AudioPlayer', {fileUri: uri, fileTitle: title});
    },
    [navigation],
  );

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
  };
}
