// ────────────────────────────────────────────────────────
// Simba Player — useAlbumScreen Hook (Phase 17)
// ────────────────────────────────────────────────────────

import {useMemo, useCallback} from 'react';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../../../navigation/types';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useOpenPlaylist, usePlayer, usePlayerActivity} from '@simba-dev/react-native-media-player';
import {useMediaStore} from '../../../state';
import {usePlayerStore} from '../../../state';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AlbumScreen'>;
type Route = RouteProp<RootStackParamList, 'AlbumScreen'>;

export function useAlbumScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {openPlayer} = usePlayerActivity();
  // V15 Phase 64: `useOpenPlaylist` absorbs the "play all" two-step
  // pattern (entries extraction + start-track dispatch + openPlayer).
  const {openPlaylist} = useOpenPlaylist();

  const {albumName, artistName} = route.params;

  const tracks = useMediaStore(s =>
    s.tracks
      .filter(
        t =>
          (t.album || 'Unknown Album').toLowerCase() === albumName.toLowerCase() &&
          (t.artist || 'Unknown Artist').toLowerCase() === artistName.toLowerCase(),
      )
      .sort((a, b) => a.trackNumber - b.trackNumber),
  );
  const currentFile = usePlayerStore(state => state.currentFile);
  // V14 Phase 62: source of truth for isPlaying moves to the module.
  const {state: playerState} = usePlayer();
  const isPlaying = playerState.isPlaying;

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
      if (sortedTracks.length === 0) return;
      usePlayerStore.getState().loadPlaylistToPlayer(sortedTracks);
      if (indexInAlbum > 0) {
        usePlayerStore.getState().playFromPlaylist(indexInAlbum);
      }
      openPlaylist(sortedTracks, {type: 'audio', startIndex: indexInAlbum});
    },
    [sortedTracks, openPlaylist],
  );

  const handlePlayAll = useCallback(() => {
    if (sortedTracks.length === 0) return;
    usePlayerStore.getState().loadPlaylistToPlayer(sortedTracks);
    openPlaylist(sortedTracks, {type: 'audio'});
  }, [sortedTracks, openPlaylist]);

  const handleShuffleAll = useCallback(() => {
    if (sortedTracks.length === 0) return;
    usePlayerStore.getState().loadPlaylistToPlayer(sortedTracks);
    openPlaylist(sortedTracks, {type: 'audio', shuffle: true});
  }, [sortedTracks, openPlaylist]);

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
