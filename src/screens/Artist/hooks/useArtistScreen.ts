// ────────────────────────────────────────────────────────
// Simba Player — useArtistScreen Hook (Phase 16)
// ────────────────────────────────────────────────────────

import {useMemo, useCallback} from 'react';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useAppSelector, useAppDispatch} from '../../../store';
import {selectArtistDiscography} from '../../../store/slices/mediaSlice';
import {loadPlaylistToPlayer, type PlaylistEntry} from '../../../store/slices/playerSlice';
import type {RootStackParamList} from '../../../navigation/types';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {usePlayer, usePlayerActivity} from '@simba-dev/react-native-media-player';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ArtistScreen'>;
type Route = RouteProp<RootStackParamList, 'ArtistScreen'>;

export function useArtistScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const dispatch = useAppDispatch();
  const {openPlayer} = usePlayerActivity();

  const {artistName} = route.params;

  const tracks = useAppSelector(state =>
    selectArtistDiscography(state, artistName),
  );

  const currentFile = useAppSelector(state => state.player.currentFile);
  // V14 Phase 62: `state.player.playbackState` (V11-mirror) is gone.
  // The module's `usePlayer()` is the source of truth for
  // isPlaying.
  const {state: playerState} = usePlayer();

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
      // V14 Phase 62: removed `dispatch(playFile(item))` — the
      // V11 mirror dispatch is gone. The module's `openPlayer`
      // call below is the single source of truth for triggering
      // playback. The consumer's `currentFile` is updated
      // separately via the playlist-loading reducers when
      // needed; for single-track play, the activity launches
      // and the module's PlayerState tracks everything.
      openPlayer({
        uri: item.uri,
        title: item.title,
        type: 'audio',
      });
    },
    [openPlayer],
  );

  const handlePlayAll = useCallback(() => {
    const entries: PlaylistEntry[] = allTracks.map(t => ({
      ...t,
    }));
    if (entries.length === 0) return;
    dispatch(loadPlaylistToPlayer(entries));
    openPlayer({
      uri: entries[0].uri,
      title: entries[0].title,
      type: 'audio',
    });
  }, [allTracks, dispatch, openPlayer]);

  const handleShuffleAll = useCallback(() => {
    const entries: PlaylistEntry[] = allTracks.map(t => ({
      ...t,
    }));
    // Fisher-Yates shuffle
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    if (entries.length === 0) return;
    dispatch(loadPlaylistToPlayer(entries));
    openPlayer({
      uri: entries[0].uri,
      title: entries[0].title,
      type: 'audio',
    });
  }, [allTracks, dispatch, openPlayer]);

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

  const isPlaying = playerState.isPlaying;

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
