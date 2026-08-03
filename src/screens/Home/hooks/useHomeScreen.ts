import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTheme} from '../../../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../../../store';
import {CommonActions} from '@react-navigation/native';
import {type HomeScreenProps} from '../../../navigation/types';
import type {RootStackParamList} from '../../../navigation/types';
import {pickMediaFile, getMediaType} from '../../../services/fileService';
import {
  selectWeightedFeatured,
  selectBookmarks,
} from '../../../store/slices/sessionSlice';
import {selectAllPlaylists} from '../../../store/slices/playlistSlice';
import {selectAllTracks} from '../../../store/slices/mediaSlice';
import {selectFollowedPodcasts} from '../../../store/slices/followedPodcastsSlice';
import type {FollowedPodcast} from '../../../store/slices/followedPodcastsSlice';
import type {SessionEntry} from '../../../store/slices/sessionSlice';
import {useAuth} from '../../../hooks/useAuth';

// ── Types ──

export type HomeSection =
  | {type: 'GREETING'}
  | {type: 'HERO'; data: SessionEntry | null}
  | {type: 'SHELF'; title: string; items: any[]; seeAllRoute?: keyof RootStackParamList}
  | {type: 'GENRE'; genres: {name: string; count: number}[]}
  | {type: 'PLAYLISTS'; items: any[]}
  | {type: 'BOOKMARKS'; items: ReturnType<typeof selectBookmarks>}
  | {type: 'MOVIES'}
  | {type: 'FOLLOWED_PODCASTS'; items: FollowedPodcast[]}
  | {type: 'PREFILLED_PODCASTS'}
  | {type: 'PREFILLED_MUSIC'}
  // P36.7: live radio + TV browse shelves
  | {type: 'RADIO'}
  | {type: 'LIVE_TV'}
  // P37.7: audiobooks (LibriVox) + Internet Archive browse shelves
  | {type: 'AUDIOBOOKS'}
  | {type: 'ARCHIVE'}
  // P38.7: TV shows (TVMaze) browse shelf
  | {type: 'SHOWS'};

// ── Helpers ──

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}

function isInProgress(item: SessionEntry): boolean {
  return item.position > 30 && item.position < item.duration - 5;
}

// ── Hook ──

export function useHomeScreen(navigation: HomeScreenProps['navigation']) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [isSettled, setIsSettled] = useState(false);
  const [hasError, setHasError] = useState(false);
  const dispatch = useAppDispatch();
  const {user} = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setIsSettled(true), 300);
    return () => clearTimeout(t);
  }, []);

  // ── Data from Redux ──
  const recentFiles = useAppSelector(state => state.session.recentFiles);
  const bookmarks = useAppSelector(selectBookmarks);
  const weightedFeatured = useAppSelector(selectWeightedFeatured);
  const playlists = useAppSelector(selectAllPlaylists);
  const allTracks = useAppSelector(selectAllTracks);
  const followedPodcasts = useAppSelector(selectFollowedPodcasts);
  const isScanning = useAppSelector(s => s.media?.isScanning ?? false);

  // ── Derived Data ──
  const genres = useMemo(() => {
    const genreMap = new Map<string, number>();
    allTracks.forEach(t => {
      const g = t.genre?.trim();
      if (g && g !== 'Unknown Genre' && g !== '') {
        genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
      }
    });
    return Array.from(genreMap.entries())
      .map(([name, count]) => ({name, count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [allTracks]);

  // ── Navigation Handlers ──
  const handleOpenMedia = useCallback(async () => {
    try {
      const file = await pickMediaFile();
      if (!file) return;
      const mediaType = getMediaType(file.uri);
      const screen = mediaType === 'audio' ? 'AudioPlayer' : 'VideoPlayer';
      navigation.dispatch(CommonActions.navigate({name: screen, params: {fileUri: file.uri, fileTitle: file.title || 'Untitled'}}));
    } catch {}
  }, [navigation]);

  const handleItemPress = useCallback(
    (item: {mediaType?: string; fileUri: string; title: string; startPosition?: number; position?: number}) => {
      const screen = item.mediaType === 'audio' ? 'AudioPlayer' : 'VideoPlayer';
      navigation.dispatch(CommonActions.navigate({name: screen, params: {fileUri: item.fileUri, fileTitle: item.title, startPosition: item.startPosition ?? item.position}}));
    },
    [navigation],
  );

  const handlePlaylistPress = useCallback(
    (playlistId: string) => {
      navigation.dispatch(CommonActions.navigate({name: 'PlaylistDetail', params: {playlistId}}));
    },
    [navigation],
  );

  const handleGenrePress = useCallback(
    (genre: string) => {
      navigation.navigate('GenreScreen', {genre});
    },
    [navigation],
  );

  const handleSettingsPress = useCallback(
    () => navigation.navigate('Settings', {screen: 'Settings', params: undefined}),
    [navigation],
  );
  const handleSearchPress = useCallback(
    () => navigation.navigate('Search'),
    [navigation],
  );

  const handleSeeAll = useCallback(
    (routeName: keyof RootStackParamList) => {
      navigation.navigate(routeName as any);
    },
    [navigation],
  );

  const handleAvatarPress = useCallback(() => {
    // 42.1: avatar opens the Profile screen (stats, sign out, account)
    navigation.navigate('Profile');
  }, [navigation]);

  const handleBookmarksPress = useCallback(() => {
    navigation.navigate('Bookmarks');
  }, [navigation]);

  // ── Compute Sections ──
  const sections = useMemo((): HomeSection[] => {
    const cw = weightedFeatured.find(isInProgress) ?? weightedFeatured[0] ?? null;

    const realSections: HomeSection[] = [
      {type: 'GREETING'},
      {type: 'HERO', data: cw},
      {type: 'MOVIES'},
      {type: 'PREFILLED_PODCASTS'},
      {type: 'PREFILLED_MUSIC'},
      // P36.7: live radio + TV browse shelves
      {type: 'RADIO'},
      {type: 'LIVE_TV'},
      // P37.7: audiobooks + Internet Archive browse shelves
      {type: 'AUDIOBOOKS'},
      {type: 'ARCHIVE'},
      // P38.7: TV shows (TVMaze) browse shelf
      {type: 'SHOWS'},
    ];

    // 35.5: followed podcasts shelf (only when the user follows any)
    if (followedPodcasts.length > 0) {
      realSections.splice(3, 0, {type: 'FOLLOWED_PODCASTS', items: followedPodcasts});
    }

    // Genre chips
    if (genres.length > 0) {
      realSections.push({type: 'GENRE', genres});
    }

    const otherRecent = recentFiles.filter(item => item.fileUri !== cw?.fileUri);
    realSections.push({
      type: 'SHELF',
      title: 'Recently Played',
      items: otherRecent.slice(0, 10),
      seeAllRoute: 'AllVideosScreen' as keyof RootStackParamList,
    });

    const pinnedPlaylists = [...playlists]
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
      .slice(0, 3);

    realSections.push({type: 'PLAYLISTS', items: pinnedPlaylists});

    if (bookmarks.length > 0) {
      realSections.push({type: 'BOOKMARKS', items: bookmarks});
    }

    return realSections;
  }, [recentFiles, weightedFeatured, playlists, bookmarks, genres, followedPodcasts]);

  // ── Pull-to-refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>(resolve => setTimeout(resolve, 600));
    setRefreshing(false);
  }, []);

  return {
    colors,
    insets,
    refreshing,
    isSettled,
    hasError,
    isScanning,
    sections,
    greeting: getGreeting(),
    dispatch,
    user: user ? user : null,
    bookmarkCount: bookmarks.length,
    genres,
    handleOpenMedia,
    handleItemPress,
    handlePlaylistPress,
    handleGenrePress,
    handleSeeAll,
    handleSettingsPress,
    handleSearchPress,
    handleAvatarPress,
    handleBookmarksPress,
    onRefresh,
    setHasError,
  };
}
