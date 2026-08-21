// ────────────────────────────────────────────────────────
// Simba Player — useAlbumScreen Hook (Phase 17)
// ────────────────────────────────────────────────────────

import {useMemo, useCallback} from 'react';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useAppSelector, useAppDispatch} from '../../../store';
import {selectAlbumTracks} from '../../../store/slices/mediaSlice';
import {
  loadPlaylistToPlayer,
  playFromPlaylist,
  type PlaylistEntry,
} from '../../../store/slices/playerSlice';
import type {RootStackParamList} from '../../../navigation/types';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AlbumScreen'>;
type Route = RouteProp<RootStackParamList, 'AlbumScreen'>;

export function useAlbumScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const dispatch = useAppDispatch();

  const {albumName, artistName} = route.params;

  const tracks = useAppSelector(state =>
    selectAlbumTracks(state, albumName, artistName),
  );
  const currentFile = useAppSelector(state => state.player.currentFile);
  const playbackState = useAppSelector(state => state.player.playbackState);
  const isPlaying = playbackState === 'playing';

  // ── Derive sorted tracks ──
  const sortedTracks = useMemo(
    () =>
      [...tracks].sort((a, b) => {
        if (a.album !== b.album) return a.album.localeCompare(b.album);
        return a.trackNumber - b.trackNumber;
      }),
    [tracks],
  );

  // ── Derive album metadata ──
  const albumMeta = useMemo(() => {
    const year = sortedTracks.reduce(
      (max, t) => (t.year > max ? t.year : max),
      0,
    );
    const totalDuration = sortedTracks.reduce(
      (sum, t) => sum + (t.duration > 0 ? t.duration : 0),
      0,
    );
    const genreSet = new Set<string>();
    for (const t of sortedTracks) {
      if (t.genre && t.genre.trim()) {
        genreSet.add(t.genre.trim());
      }
    }
    return {
      year: year > 0 ? year : null,
      trackCount: sortedTracks.length,
      totalDuration,
      genres: Array.from(genreSet).slice(0, 3), // max 3 genre chips
      albumArtUri: sortedTracks[0]?.albumArtUri ?? '',
    };
  }, [sortedTracks]);

  // ── Format duration helper ──
  const formatDuration = useCallback((sec: number): string => {
    if (sec <= 0) return '--:--';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  const formatTotalDuration = useCallback((sec: number): string => {
    if (sec <= 0) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  // ── Handlers ──

  const handlePlayTrack = useCallback(
    (indexInAlbum: number) => {
      const entries: PlaylistEntry[] = sortedTracks.map(t => ({
        ...t,
      }));
      if (entries.length === 0) return;
      dispatch(loadPlaylistToPlayer(entries));
      if (indexInAlbum > 0) {
        dispatch(playFromPlaylist(indexInAlbum));
      }
      (navigation as any).navigate('AudioPlayer', {
        fileUri: entries[indexInAlbum].uri,
        fileTitle: entries[indexInAlbum].title,
      });
    },
    [sortedTracks, dispatch, navigation],
  );

  const handlePlayAll = useCallback(() => {
    const entries: PlaylistEntry[] = sortedTracks.map(t => ({
      ...t,
    }));
    if (entries.length === 0) return;
    dispatch(loadPlaylistToPlayer(entries));
    (navigation as any).navigate('AudioPlayer', {
      fileUri: entries[0].uri,
      fileTitle: entries[0].title,
    });
  }, [sortedTracks, dispatch, navigation]);

  const handleShuffleAll = useCallback(() => {
    const entries: PlaylistEntry[] = sortedTracks.map(t => ({
      ...t,
    }));
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    if (entries.length === 0) return;
    dispatch(loadPlaylistToPlayer(entries));
    (navigation as any).navigate('AudioPlayer', {
      fileUri: entries[0].uri,
      fileTitle: entries[0].title,
    });
  }, [sortedTracks, dispatch, navigation]);

  const handleGoToArtist = useCallback(() => {
    navigation.navigate('ArtistScreen', {artistName});
  }, [navigation, artistName]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const isCurrentTrack = useCallback(
    (uri: string) => currentFile?.uri === uri,
    [currentFile],
  );

  return {
    albumName,
    artistName,
    sortedTracks,
    albumMeta,
    isCurrentTrack,
    isPlaying,
    formatDuration: formatDuration,
    formatTotalDuration,
    handlers: {
      playTrack: handlePlayTrack,
      playAll: handlePlayAll,
      shuffleAll: handleShuffleAll,
      goToArtist: handleGoToArtist,
      goBack: handleGoBack,
    },
  };
}
