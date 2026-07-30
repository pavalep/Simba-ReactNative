// ────────────────────────────────────────────────────────
// Simba Player — useGenreScreen Hook (Phase 20)
// ────────────────────────────────────────────────────────

import {useMemo} from 'react';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useAppSelector} from '../../store';
import {selectAllTracks} from '../../store/slices/mediaSlice';
import type {ScannedTrack} from '../../store/slices/mediaSlice';
import type {RootStackParamList} from '../../navigation/types';

export interface UseGenreScreenResult {
  genre: string;
  tracks: ScannedTrack[];
  trackCount: number;
  handlePlayTrack: (uri: string, title: string) => void;
}

export function useGenreScreen(): UseGenreScreenResult {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'GenreScreen'>>();
  const {genre} = route.params;

  const allTracks = useAppSelector(selectAllTracks);

  const tracks = useMemo(
    () =>
      allTracks
        .filter(t => t.genre.toLowerCase() === genre.toLowerCase())
        .sort((a, b) => a.title.localeCompare(b.title)),
    [allTracks, genre],
  );

  const handlePlayTrack = (uri: string, title: string) => {
    navigation.navigate('AudioPlayer', {fileUri: uri, fileTitle: title});
  };

  return {
    genre,
    tracks,
    trackCount: tracks.length,
    handlePlayTrack,
  };
}
