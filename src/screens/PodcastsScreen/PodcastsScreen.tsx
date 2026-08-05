// ─── Podcasts Browse Screen ──────────────────────────────────────────
// Phase 3 formula: SearchBar above react-native-tab-view tabs.
// Each podcast category is a lazily-mounted tab scene with its own
// cached data + infinite scroll. Search persists across tab toggles.
// Tap a podcast → PodcastDetail (episode list + playback).

import React, {useCallback, useMemo} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {TabView, TabBar, type SceneRendererProps, type Route} from 'react-native-tab-view';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {
  usePodcastsScreen,
  type PodcastScopeState,
} from './hooks/usePodcastsScreen';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import type {PodcastResult} from '../../types/api';

type Props = RootStackScreenProps<'PodcastsScreen'>;

// ─── Podcast Card ──────────────────────────────────────────────────────

interface PodcastCardProps {
  item: PodcastResult;
  onPress: (item: PodcastResult) => void;
}

const PodcastCard: React.FC<PodcastCardProps> = React.memo(({item, onPress}) => {
  const {colors} = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      style={[styles.card, {backgroundColor: colors.background.elevated}]}>
      <View style={[styles.thumb, {backgroundColor: colors.border.subtle}]}>
        {item.image ? (
          <FastImage
            source={{uri: item.image}}
            style={styles.thumb}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <SvgIcon name="music" size={24} color={colors.accent.goldDim} />
        )}
      </View>
      <View style={styles.info}>
        <AppText variant="bodySmall" numberOfLines={1} style={styles.title}>
          {item.title}
        </AppText>
        {item.author ? (
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {item.author}
          </AppText>
        ) : null}
        {item.episodeCount > 0 && (
          <View style={[styles.badge, {backgroundColor: colors.accent.goldDim}]}>
            <AppText variant="caption" style={[styles.badgeText, {color: colors.accent.gold}]}>
              {item.episodeCount} ep.
            </AppText>
          </View>
        )}
      </View>
      <SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
});

// ─── Tab Scene ─────────────────────────────────────────────────────────

interface PodcastTabSceneProps {
  tabTitle: string;
  scope: PodcastScopeState;
  isSearchActive: boolean;
  isOnline: boolean;
  refreshing: boolean;
  ensureLoaded: (title: string) => void;
  loadMore: (title: string) => void;
  retry: (title: string) => void;
  handleRefresh: () => void;
  onPressPodcast: (item: PodcastResult) => void;
}

const PodcastTabScene: React.FC<PodcastTabSceneProps> = React.memo(
  ({
    tabTitle,
    scope,
    isSearchActive,
    isOnline,
    refreshing,
    ensureLoaded,
    loadMore,
    retry,
    handleRefresh,
    onPressPodcast,
  }) => {
    const {colors} = useTheme();
    const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

    React.useEffect(() => {
      ensureLoaded(tabTitle);
    }, [ensureLoaded, tabTitle]);

    // ── Page-1 loader ──
    if (!hasLoaded && isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityOrb />
          <AppText variant="body2" color="tertiary" style={styles.stateText}>
            Loading podcasts…
          </AppText>
        </View>
      );
    }

    // ── Page-1 error ──
    if (!hasLoaded && !isLoading && error) {
      return (
        <View style={styles.centerState}>
          <SvgIcon name="alertCircle" size={40} color={colors.accent.goldDim} />
          <AppText variant="body2" color="tertiary" style={styles.stateText}>
            {isOnline ? 'Could not load podcasts.' : 'You are offline.'}
          </AppText>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => retry(tabTitle)}
            style={[styles.retryButton, {backgroundColor: colors.accent.gold}]}
            accessibilityRole="button">
            <AppText variant="button" style={styles.retryText}>
              Retry
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    // ── Empty ──
    if (hasLoaded && !error && items.length === 0) {
      return (
        <View style={styles.centerState}>
          <SvgIcon name="folder" size={40} color={colors.accent.goldDim} />
          <AppText variant="body2" color="tertiary" style={styles.stateText}>
            {isSearchActive
              ? 'No podcasts match your search.'
              : 'No podcasts found in this category.'}
          </AppText>
        </View>
      );
    }

    // ── Loaded list ──
    const hasMore = items.length >= (scope.maxRequested || 25) && (scope.maxRequested || 25) < 100;

    return (
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <PodcastCard item={item} onPress={onPressPodcast} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={ItemSeparator}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
        onEndReached={() => hasMore && loadMore(tabTitle)}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isLoadingMore || (hasMore && error) ? (
            <View style={styles.footer}>
              {isLoadingMore ? (
                <ActivityOrb size={22} />
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => loadMore(tabTitle)}
                  style={[styles.loadMoreRetry, {borderColor: colors.border.subtle}]}
                  accessibilityRole="button">
                  <AppText variant="caption" color="secondary">
                    Could not load more — tap to retry
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        windowSize={5}
        maxToRenderPerBatch={10}
      />
    );
  },
);

// ─── Screen ────────────────────────────────────────────────────────────

export const PodcastsScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {
    tabs,
    tabIndex,
    setTabIndex,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    isOnline,
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refreshing,
    handleRefresh,
  } = usePodcastsScreen(route.params?.categoryId);

  const handlePodcastPress = useCallback(
    (item: PodcastResult) => {
      navigation.navigate('PodcastDetail', {
        podcastId: item.id,
        podcastTitle: item.title,
      });
    },
    [navigation],
  );

  const routes = useMemo(
    () => tabs.map(t => ({key: t.title, title: t.title})),
    [tabs],
  );

  const renderTabBar = useCallback(
    (props: SceneRendererProps & {navigationState: {index: number; routes: Route[]}}) => (
      <TabBar
        {...props}
        scrollEnabled
        style={[styles.tabBar, {backgroundColor: colors.background.primary, borderBottomColor: colors.background.highlightDim}]}
        indicatorStyle={[styles.tabIndicator, {backgroundColor: colors.accent.gold}]}
        activeColor={colors.accent.gold}
        inactiveColor={colors.text.secondary}
        tabStyle={styles.tab}
        contentContainerStyle={styles.tabBarContent}
      />
    ),
    [colors],
  );

  const renderScene = useCallback(
    ({route: tabRoute}: {route: Route}) => (
      <PodcastTabScene
        tabTitle={tabRoute.key}
        scope={getScope(tabRoute.key)}
        isSearchActive={isSearchActive}
        isOnline={isOnline}
        refreshing={refreshing}
        ensureLoaded={ensureLoaded}
        loadMore={loadMore}
        retry={retry}
        handleRefresh={handleRefresh}
        onPressPodcast={handlePodcastPress}
      />
    ),
    [getScope, isSearchActive, isOnline, refreshing, ensureLoaded, loadMore, retry, handleRefresh, handlePodcastPress],
  );

  const renderLazyPlaceholder = useCallback(
    ({route: tabRoute}: {route: Route}) => (
      <View style={styles.centerState}>
        <ActivityOrb />
        <AppText variant="body2" color="tertiary" style={styles.stateText}>
          Loading {tabRoute.key}…
        </AppText>
      </View>
    ),
    [],
  );

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Podcasts" />

      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder="Search podcasts…"
        />
      </View>

      <TabView
        navigationState={{index: tabIndex, routes}}
        onIndexChange={setTabIndex}
        renderTabBar={renderTabBar}
        renderScene={renderScene}
        renderLazyPlaceholder={renderLazyPlaceholder}
        lazy
        commonOptions={{labelStyle: styles.tabLabel}}
        style={styles.sceneContainer}
      />
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────

const ItemSeparator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: {flex: 1},
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sceneContainer: {flex: 1},
  tabBar: {
    borderBottomWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabIndicator: {
    height: 3,
    borderRadius: radius.full,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'none',
  },
  tab: {width: 'auto', minWidth: 84},
  tabBarContent: {paddingHorizontal: spacing.xs},

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 80,
  },
  stateText: {marginTop: spacing.md, textAlign: 'center'},
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  retryText: {color: '#1A1206'},

  listContent: {padding: spacing.md, paddingBottom: spacing.xxl + 80},
  separator: {height: spacing.sm},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: {flex: 1, gap: spacing.xs},
  title: {fontWeight: '600'},
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  badgeText: {fontSize: 11, fontWeight: '700'},
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    minHeight: 56,
  },
  loadMoreRetry: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
