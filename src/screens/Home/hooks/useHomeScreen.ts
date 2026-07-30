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
  removeBookmark,
} from '../../../store/slices/sessionSlice';
import {selectAllPlaylists} from '../../../store/slices/playlistSlice';
import type {SessionEntry} from '../../../store/slices/sessionSlice';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';

// ── Types ──

export type HomeSection =
  | {type: 'GREETING'}
  | {type: 'HERO'; data: SessionEntry | null}
  | {type: 'SHELF'; title: string; items: any[]; seeAllRoute?: keyof RootStackParamList}
  | {type: 'PLAYLISTS'; items: any[]}
  | {type: 'BOOKMARKS'; items: ReturnType<typeof selectBookmarks>}
  | {type: 'MOVIES'}
  | {type: 'PREFILLED_PODCASTS'}
  | {type: 'PREFILLED_MUSIC'};

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
  const {isOnline} = useNetworkStatus();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const t = setTimeout(() => setIsSettled(true), 300);
    return () => clearTimeout(t);
  }, []);

  // ── Data from Redux ──
  const recentFiles = useAppSelector(state => state.session.recentFiles);
  const bookmarks = useAppSelector(selectBookmarks);
  const weightedFeatured = useAppSelector(selectWeightedFeatured);
  const playlists = useAppSelector(selectAllPlaylists);
  const isScanning = useAppSelector(s => s.media?.isScanning ?? false);

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

  const handleSettingsPress = () => navigation.navigate('Settings', {screen: 'Settings', params: undefined});
  const handleSearchPress = () => navigation.navigate('Search');

  const handleSeeAll = useCallback(
    (routeName: keyof RootStackParamList) => {
      navigation.navigate(routeName as any);
    },
    [navigation],
  );

  // ── Compute Sections ──
  const sections = useMemo((): HomeSection[] => {
    const cw = weightedFeatured.find(isInProgress) ?? weightedFeatured[0] ?? null;

    const realSections: HomeSection[] = [
      {type: 'GREETING'},
      {type: 'HERO', data: cw},
      {type: 'MOVIES'},
      {type: 'PREFILLED_PODCASTS'},
      {type: 'PREFILLED_MUSIC'},
    ];

    const otherRecent = recentFiles.filter(item => item.fileUri !== cw?.fileUri);
    realSections.push({type: 'SHELF', title: 'Recently Played', items: otherRecent.slice(0, 10)});

    // "Recently Played" shelf offers "VIEW ALL → All Videos"
    // (keeps seeAllRoute undefined so the button stays inactive for now)

    const pinnedPlaylists = [...playlists]
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
      .slice(0, 3);

    realSections.push({type: 'PLAYLISTS', items: pinnedPlaylists});

    if (bookmarks.length > 0) {
      realSections.push({type: 'BOOKMARKS', items: bookmarks});
    }

    return realSections;
  }, [recentFiles, weightedFeatured, playlists, bookmarks]);

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
    isOnline,
    isScanning,
    sections,
    greeting: getGreeting(),
    dispatch,
    handleOpenMedia,
    handleItemPress,
    handlePlaylistPress,
    handleSeeAll,
    handleSettingsPress,
    handleSearchPress,
    onRefresh,
    setHasError,
  };
}
