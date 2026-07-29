import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTheme} from '../../../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../../../store';
import {CommonActions} from '@react-navigation/native';
import {type HomeScreenProps} from '../../../navigation/types';
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
  | {type: 'SHELF'; title: string; items: any[]}
  | {type: 'PLAYLISTS'; items: any[]}
  | {type: 'BOOKMARKS'; items: ReturnType<typeof selectBookmarks>};

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

// ── Dummy Data ──

const DUMMY_VIDEO_1 = 'https://picsum.photos/seed/simba1/800/450';
const DUMMY_VIDEO_2 = 'https://picsum.photos/seed/simba2/800/450';
const DUMMY_VIDEO_3 = 'https://picsum.photos/seed/simba3/800/450';
const DUMMY_VIDEO_4 = 'https://picsum.photos/seed/simba4/800/450';
const DUMMY_VIDEO_5 = 'https://picsum.photos/seed/simba5/800/450';
const DUMMY_VIDEO_6 = 'https://picsum.photos/seed/simba6/800/450';

const DUMMY_RECENT: SessionEntry[] = [
  {fileUri: 'dummy1', title: 'The Silent Horizon', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_1, position: 0, duration: 7200, lastPlayedAt: new Date().toISOString()},
  {fileUri: 'dummy2', title: 'Neon Velocity', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_2, position: 1200, duration: 5400, lastPlayedAt: new Date().toISOString()},
  {fileUri: 'dummy3', title: 'Golden Echoes', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_3, position: 0, duration: 3600, lastPlayedAt: new Date().toISOString()},
  {fileUri: 'dummy4', title: 'Urban Legend', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_4, position: 450, duration: 4800, lastPlayedAt: new Date().toISOString()},
  {fileUri: 'dummy5', title: 'Midnight Protocol', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_5, position: 0, duration: 6000, lastPlayedAt: new Date().toISOString()},
  {fileUri: 'dummy6', title: 'Shadow Realm', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_6, position: 0, duration: 9000, lastPlayedAt: new Date().toISOString()},
  {fileUri: 'dummy7', title: 'Crystal Skies', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_1, position: 0, duration: 4200, lastPlayedAt: new Date().toISOString()},
  {fileUri: 'dummy8', title: 'Stellar Voyager', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_4, position: 0, duration: 5100, lastPlayedAt: new Date().toISOString()},
  {fileUri: 'dummy9', title: 'Crimson Tide', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_2, position: 0, duration: 3300, lastPlayedAt: new Date().toISOString()},
  {fileUri: 'dummy10', title: 'Ethereal Dreams', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_3, position: 0, duration: 2400, lastPlayedAt: new Date().toISOString()},
];

const DUMMY_FOLDERS = [
  {fileUri: 'dummy_f1', title: 'Cinematic Collection', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_5, position: 0, duration: 0},
  {fileUri: 'dummy_f2', title: 'Personal Clips', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_6, position: 0, duration: 0},
  {fileUri: 'dummy_f3', title: 'Documentaries', mediaType: 'video', thumbnailPath: DUMMY_VIDEO_1, position: 0, duration: 0},
];

const DUMMY_PLAYLISTS = [
  {id: 'dp1', name: 'Late Night Chill', trackCount: 12, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString()},
  {id: 'dp2', name: 'Epic Soundtracks', trackCount: 45, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString()},
  {id: 'dp3', name: 'Travel Essentials', trackCount: 28, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString()},
];

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
      if (item.fileUri.startsWith('dummy')) return;
      const screen = item.mediaType === 'audio' ? 'AudioPlayer' : 'VideoPlayer';
      navigation.dispatch(CommonActions.navigate({name: screen, params: {fileUri: item.fileUri, fileTitle: item.title, startPosition: item.startPosition ?? item.position}}));
    },
    [navigation],
  );

  const handlePlaylistPress = useCallback(
    (playlistId: string) => {
      navigation.dispatch(CommonActions.navigate({name: 'MainTabs', params: {screen: 'LibraryTab', params: {screen: 'PlaylistDetail', params: {playlistId}}}}));
    },
    [navigation],
  );

  const handleSettingsPress = () => navigation.navigate('Settings', {screen: 'Settings', params: undefined});
  const handleSearchPress = () => navigation.navigate('Search');

  // ── Compute Sections ──
  const sections = useMemo((): HomeSection[] => {
    const cw = weightedFeatured.find(isInProgress) ?? weightedFeatured[0] ?? null;

    const realSections: HomeSection[] = [
      {type: 'GREETING'},
      {type: 'HERO', data: cw},
    ];

    const otherRecent = recentFiles.filter(item => item.fileUri !== cw?.fileUri);
    let shelfItems = [...otherRecent];
    if (shelfItems.length < 10) {
      shelfItems = [...shelfItems, ...DUMMY_RECENT.slice(0, 10 - shelfItems.length)];
    }
    realSections.push({type: 'SHELF', title: 'Recently Played', items: shelfItems.slice(0, 10)});

    const pinnedPlaylists = playlists.length > 0
      ? [...playlists].sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()).slice(0, 3)
      : DUMMY_PLAYLISTS;

    realSections.push({type: 'PLAYLISTS', items: pinnedPlaylists});
    realSections.push({type: 'SHELF', title: 'Media Folders', items: DUMMY_FOLDERS});

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
    handleSettingsPress,
    handleSearchPress,
    onRefresh,
    setHasError,
  };
}
