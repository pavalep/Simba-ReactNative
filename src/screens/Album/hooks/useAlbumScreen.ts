// ────────────────────────────────────────────────────────
// Simba Player — useAlbumScreen Hook (Phase 17)
// ────────────────────────────────────────────────────────

import {useMemo, useCallback} from 'react';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../../../navigation/types';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  resolveStreamType,
  useOpenPlaylist,
  usePlayer,
  usePlayerActivity,
} from '../../../infrastructure/player';
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

  // V21 F5 A5 — select the stable array, derive outside the selector.
  // Filtering inside the selector built a NEW array on every call, so the
  // selector result never compared equal and the store could drive an
  // unbounded re-render loop ("Maximum update depth exceeded").
  const allLibraryTracks = useMediaStore(s => s.tracks);
  const tracks = useMemo(
    () =>
      allLibraryTracks
        .filter(
          t =>
            (t.album || 'Unknown Album').toLowerCase() === albumName.toLowerCase() &&
            (t.artist || 'Unknown Artist').toLowerCase() === artistName.toLowerCase(),
        )
        .sort((a, b) => a.trackNumber - b.trackNumber),
    [allLibraryTracks, albumName, artistName],
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
      // V21 F5 A5 — derive the lane from the track the user tapped.
      // It used to be a literal `'audio'`, which sent a scanned video file
      // (the media store holds both lanes; `fileEntriesToTracks` sets
      // `type` from the extension) to the audio player.
      const tapped = sortedTracks[indexInAlbum] ?? sortedTracks[0];
      openPlaylist(sortedTracks, {
        type: resolveStreamType(tapped.type),
        startIndex: indexInAlbum,
      });
    },
    [sortedTracks, openPlaylist],
  );

  const handlePlayAll = useCallback(() => {
    if (sortedTracks.length === 0) return;
    usePlayerStore.getState().loadPlaylistToPlayer(sortedTracks);
    openPlaylist(sortedTracks, {type: resolveStreamType(sortedTracks[0]!.type)});
  }, [sortedTracks, openPlaylist]);

  const handleShuffleAll = useCallback(() => {
    if (sortedTracks.length === 0) return;
    usePlayerStore.getState().loadPlaylistToPlayer(sortedTracks);
    openPlaylist(sortedTracks, {
      // The seam shuffles internally and picks its own start index, so the
      // first entry is the only lane we can know before it runs. It is the
      // same lane `loadPlaylistToPlayer` filtered the queue to.
      type: resolveStreamType(sortedTracks[0]!.type),
      shuffle: true,
    });
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
