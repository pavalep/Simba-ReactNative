// ────────────────────────────────────────────────────────
// Simba Player — useArtistScreen Hook (Phase 16)
// ────────────────────────────────────────────────────────

import {useMemo, useCallback} from 'react';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useAppSelector, useAppDispatch} from '../../store';
import {selectArtistDiscography} from '../../store/slices/mediaSlice';
import {loadPlaylistToPlayer, playFile, type PlaylistEntry} from '../../store/slices/playerSlice';
import type {RootStackParamList} from '../../navigation/types';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ArtistScreen'>;
type Route = RouteProp<RootStackParamList, 'ArtistScreen'>;

export function useArtistScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const dispatch = useAppDispatch();

  const {artistName} = route.params;

  const tracks = useAppSelector(state =>
    selectArtistDiscography(state, artistName),
  );

  const currentFile = useAppSelector(state => state.player.currentFile);
  const playbackState = useAppSelector(state => state.player.playbackState);

  // ── Derive discography (unique albums sorted by year desc) ──
  const discography = useMemo(() => {
    const map = new Map<
      string,
      {title: string; year: number; trackCount: number; albumArtUri: string}
    >();
    for (const t of tracks) {
      const key = t.album;
      const existing = map.get(key);
      if (!existing || t.year > (existing?.year ?? 0)) {
        map.set(key, {
          title: t.album,
          year: t.year,
          trackCount: (existing?.trackCount ?? 0) + 1,
          albumArtUri: t.albumArtUri || existing?.albumArtUri || '',
        });
      } else if (existing) {
        existing.trackCount += 1;
        if (t.albumArtUri && !existing.albumArtUri) {
          existing.albumArtUri = t.albumArtUri;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.year - a.year);
  }, [tracks]);

  // ── All tracks sorted by album then trackNumber ──
  const allTracks = useMemo(
    () =>
      [...tracks].sort((a, b) => {
        if (a.album !== b.album) return a.album.localeCompare(b.album);
        return a.trackNumber - b.trackNumber;
      }),
    [tracks],
  );

  // ── Top 5 tracks (first 5 by album/track order) ──
  const topTracks = useMemo(() => allTracks.slice(0, 5), [allTracks]);

  // ── Tracks beyond top 5 ──
  const remainingTracks = useMemo(() => allTracks.slice(5), [allTracks]);

  // ── Stats ──
  const stats = useMemo(
    () => ({
      albumCount: discography.length,
      trackCount: tracks.length,
    }),
    [discography.length, tracks.length],
  );

  // ── Handlers ──

  const handlePlayTrack = useCallback(
    (item: PlaylistEntry) => {
      dispatch(playFile(item));
      (navigation as any).navigate('AudioPlayer', {
        fileUri: item.uri,
        fileTitle: item.title,
      });
    },
    [dispatch, navigation],
  );

  const handlePlayAll = useCallback(() => {
    const entries: PlaylistEntry[] = allTracks.map(t => ({
      uri: t.uri,
      title: t.title,
      duration: t.duration,
    }));
    if (entries.length === 0) return;
    dispatch(loadPlaylistToPlayer(entries));
    (navigation as any).navigate('AudioPlayer', {
      fileUri: entries[0].uri,
      fileTitle: entries[0].title,
    });
  }, [allTracks, dispatch, navigation]);

  const handleShuffleAll = useCallback(() => {
    const entries: PlaylistEntry[] = allTracks.map(t => ({
      uri: t.uri,
      title: t.title,
      duration: t.duration,
    }));
    // Fisher-Yates shuffle
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
  }, [allTracks, dispatch, navigation]);

  const handleNavigateToAlbum = useCallback(
    (albumName: string) => {
      navigation.navigate('AlbumScreen', {albumName, artistName});
    },
    [navigation, artistName],
  );

  const handleSeeAllTracks = useCallback(() => {
    (navigation as any).navigate('AllAudioScreen', {filter: artistName});
  }, [navigation, artistName]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ── Check if a track is currently playing ──
  const isCurrentTrack = useCallback(
    (uri: string) => currentFile?.uri === uri,
    [currentFile],
  );

  const isPlaying = useMemo(
    () => playbackState === 'playing',
    [playbackState],
  );

  return {
    artistName,
    discography,
    topTracks,
    remainingTracks,
    allTracks,
    stats,
    currentFile,
    isCurrentTrack,
    isPlaying,
    handlers: {
      playTrack: handlePlayTrack,
      playAll: handlePlayAll,
      shuffleAll: handleShuffleAll,
      navigateToAlbum: handleNavigateToAlbum,
      seeAllTracks: handleSeeAllTracks,
      goBack: handleGoBack,
    },
  };
}
