import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {useAppSelector} from '../../store';
import {type HomeScreenProps} from '../../navigation/types';
import {pickMediaFile, getMediaType} from '../../services/fileService';
import {
  selectFrequentlyPlayed,
  selectRecentlyAdded,
  selectWeightedFeatured,
} from '../../store/slices/sessionSlice';
import {selectAllPlaylists} from '../../store/slices/playlistSlice';
import type {MediaLibraryEntry, SessionEntry} from '../../store/slices/sessionSlice';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';

// ── Components ──
import {SimbaStatusBar} from '../../components/StatusBar';
import {HomeHeader} from '../../components/layout/HomeHeader/HomeHeader';
import {FeaturedHeroBanner} from './components/FeaturedHeroBanner';
import {ContinueWatchingHero} from './components/ContinueWatchingHero';
import {HomeMediaShelf} from './components/HomeMediaShelf';
import {QuickAccessShelf} from './components/QuickAccessShelf';
import {HomeEmptyState} from './components/HomeEmptyState';
import {HomeLoadingSkeleton} from './components/HomeLoadingSkeleton';
import {HomeErrorState} from './components/HomeErrorState';
import {NoNetworkBanner} from './components/NoNetworkBanner';
import {ScanProgressBanner} from './components/ScanProgressBanner';

// ── Helpers ──

/** Check if a session entry qualifies as "in-progress" (has meaningful position). */
function isInProgress(item: SessionEntry): boolean {
  return item.position > 30 && item.position < item.duration - 5;
}

// ── Screen ──

export const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [isSettled, setIsSettled] = useState(false);
  const [hasError, setHasError] = useState(false);
  const {isOnline} = useNetworkStatus();

  useEffect(() => {
    const t = setTimeout(() => setIsSettled(true), 300);
    return () => clearTimeout(t);
  }, []);

  // ── Data from Redux ──
  const recentFiles = useAppSelector(state => state.session.recentFiles);
  const frequentlyPlayed = useAppSelector(selectFrequentlyPlayed);
  const recentlyAdded = useAppSelector(selectRecentlyAdded);
  const weightedFeatured = useAppSelector(selectWeightedFeatured);
  const playlists = useAppSelector(selectAllPlaylists);
  const isScanning = useAppSelector(state => state.session.isMediaScanning ?? false);
  const scanProgress = useAppSelector(state => state.session.scanProgress ?? 0);

  // ── Compute home sections ──
  const {continueWatching, recentlyPlayed} = useMemo(() => {
    const cwFromWeighted = weightedFeatured.find(isInProgress) ?? null;

    const fallbackSorted = [...recentFiles].sort(
      (a, b) =>
        new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime(),
    );
    const fallbackCwIndex = fallbackSorted.findIndex(isInProgress);
    const cw =
      cwFromWeighted ??
      (fallbackCwIndex >= 0 ? fallbackSorted[fallbackCwIndex] : null);

    const remaining = fallbackSorted
      .filter((_, i) => i !== (cw ? fallbackSorted.indexOf(cw) : -1))
      .slice(0, 8);

    return {continueWatching: cw, recentlyPlayed: remaining};
  }, [recentFiles, weightedFeatured]);

  // ── Quick Access: top 3 playlists ──
  const quickAccessPlaylists = useMemo(() => {
    return [...playlists]
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.createdAt).getTime() -
          new Date(a.updatedAt ?? a.createdAt).getTime(),
      )
      .slice(0, 3);
  }, [playlists]);

  const hasContent =
    continueWatching !== null ||
    recentlyPlayed.length > 0 ||
    frequentlyPlayed.length > 0 ||
    quickAccessPlaylists.length > 0 ||
    recentlyAdded.length > 0;

  // ── Pull-to-refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasError(false);
    await new Promise<void>(resolve => setTimeout(resolve, 600));
    setRefreshing(false);
  }, []);

  const onRetry = useCallback(() => {
    setHasError(false);
    setIsSettled(false);
    setTimeout(() => setIsSettled(true), 300);
  }, []);

  // ── Navigation ──
  const handleOpenMedia = useCallback(async () => {
    try {
      const file = await pickMediaFile();
      if (!file) return;
      const mediaType = getMediaType(file.uri);
      const screen = mediaType === 'audio' ? 'AudioPlayer' : 'VideoPlayer';
      (navigation.navigate as (name: string, params?: any) => void)(screen, {
        fileUri: file.uri,
        fileTitle: file.title || 'Untitled',
      });
    } catch {
      // User cancelled or error
    }
  }, [navigation]);

  const handleItemPress = useCallback(
    (item: SessionEntry) => {
      const screen =
        item.mediaType === 'audio' ? 'AudioPlayer' : 'VideoPlayer';
      (navigation.navigate as (name: string, params?: any) => void)(screen, {
        fileUri: item.fileUri,
        fileTitle: item.title,
      });
    },
    [navigation],
  );

  const handleLibraryItemPress = useCallback(
    (item: MediaLibraryEntry) => {
      const screen =
        item.mediaType === 'audio' ? 'AudioPlayer' : 'VideoPlayer';
      (navigation.navigate as (name: string, params?: any) => void)(screen, {
        fileUri: item.fileUri,
        fileTitle: item.title,
      });
    },
    [navigation],
  );

  const handlePlaylistPress = useCallback(
    (playlistId: string) => {
      (navigation.navigate as (name: string, params?: any) => void)('MainTabs', {
        screen: 'LibraryTab',
        params: {screen: 'PlaylistDetail', params: {playlistId}},
      });
    },
    [navigation],
  );

  const handleBrowseLibrary = useCallback(() => {
    navigation.navigate('MainTabs', {screen: 'LibraryTab'});
  }, [navigation]);

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const handleSearchPress = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  // ── Render ──

  // Error state
  if (hasError) {
    return (
      <View
        style={[
          styles.root,
          {backgroundColor: colors.background.primary},
          {paddingTop: insets.top},
        ]}>
        <SimbaStatusBar variant="home" />
        <HomeHeader isScanning={isScanning} onSettingsPress={handleSettingsPress} onSearchPress={handleSearchPress} />
        <HomeErrorState onRetry={onRetry} colors={colors} />
      </View>
    );
  }

  // Skeleton loading (before settled and no content)
  if (!isSettled && !hasContent) {
    return (
      <View
        style={[
          styles.root,
          {backgroundColor: colors.background.primary},
          {paddingTop: insets.top},
        ]}>
        <SimbaStatusBar variant="home" />
        <HomeHeader isScanning={isScanning} onSettingsPress={handleSettingsPress} onSearchPress={handleSearchPress} />
        <HomeLoadingSkeleton colors={colors} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary},
        {paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <HomeHeader isScanning={isScanning} onSettingsPress={handleSettingsPress} onSearchPress={handleSearchPress} />

      {/* ── Overlay banners (absolute positioned) ── */}
      <NoNetworkBanner isVisible={!isOnline} colors={colors} />
      <ScanProgressBanner isScanning={isScanning} scanProgress={scanProgress} colors={colors} />

      {hasContent ? (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: insets.bottom + 100},
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.gold}
              colors={[colors.accent.gold]}
            />
          }>
          {/* ── Featured Hero (top priority content) ── */}
          <FeaturedHeroBanner item={continueWatching} onPress={handleItemPress} />

          {/* ── Continue Watching Hero ── */}
          {continueWatching && (
            <ContinueWatchingHero
              item={continueWatching}
              onPress={handleItemPress}
            />
          )}

          {/* ── Frequently Played Shelf ── */}
          {frequentlyPlayed.length > 0 && (
            <HomeMediaShelf
              title="Frequently Played"
              items={frequentlyPlayed}
              onItemPress={handleItemPress}
            />
          )}

          {/* ── Recently Played Shelf ── */}
          {recentlyPlayed.length > 0 && (
            <HomeMediaShelf
              title="Recently Played"
              items={recentlyPlayed}
              onItemPress={handleItemPress}
            />
          )}

          {/* ── Quick Access Playlists ── */}
          {quickAccessPlaylists.length > 0 && (
            <QuickAccessShelf
              playlists={quickAccessPlaylists}
              onPlaylistPress={handlePlaylistPress}
            />
          )}

          {/* ── Recently Added Shelf ── */}
          {recentlyAdded.length > 0 && (
            <HomeMediaShelf
              title="Recently Added"
              items={recentlyAdded.map(e => ({
                fileUri: e.fileUri,
                title: e.title,
                position: 0,
                duration: e.duration,
                lastPlayedAt: e.dateAdded,
                thumbnailPath: '',
                mediaType: e.mediaType,
              }))}
              onItemPress={handleLibraryItemPress as any}
            />
          )}
        </ScrollView>
      ) : (
        /* ── Empty State ── */
        <HomeEmptyState
          onOpenMedia={handleOpenMedia}
          onBrowseLibrary={handleBrowseLibrary}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
});
