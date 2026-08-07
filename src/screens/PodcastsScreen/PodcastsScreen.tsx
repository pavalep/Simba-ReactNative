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
import {Placeholder} from '../../components/feedback/Placeholder';
import {useToast} from '../../components/feedback/Toast';
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
    const toast = useToast();
    const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

    // [FIX-PODCASTS-LOOP] Stash ensureLoaded in a ref so this effect
    // doesn't re-fire every time the parent re-renders. The effect now
    // only fires when tabTitle actually changes.
    const ensureLoadedRef = React.useRef(ensureLoaded);
    ensureLoadedRef.current = ensureLoaded;
    React.useEffect(() => {
      ensureLoadedRef.current(tabTitle);
    }, [tabTitle]);

    // Surface page-1 load failures as a toast with a Retry action.
    // [FIX-PODCASTS-LOOP] deps only include the state that drives the
    // toast (error / hasLoaded / isLoading / isOnline). Function refs
    // like `toast` and `retry` are intentionally excluded to prevent the
    // effect from re-firing on every parent re-render (which would
    // cause an infinite loop because `toast.show` triggers a state
    // change in ToastProvider). We also track the last shown error
    // in a ref so the toast only fires once per new error.
    const lastShownErrorRef = React.useRef<string | null>(null);
    React.useEffect(() => {
      const shouldShow = !hasLoaded && !isLoading && error;
      const currentError = shouldShow
        ? isOnline
          ? 'Could not load podcasts.'
          : 'You are offline.'
        : null;
      if (currentError && currentError !== lastShownErrorRef.current) {
        lastShownErrorRef.current = currentError;
        toast.show(currentError, 'error', {
          duration: 8000,
          action: {
            label: 'Retry',
            onPress: () => {
              lastShownErrorRef.current = null; // allow re-show on next failure
              retry(tabTitle);
            },
          },
        });
      } else if (!currentError) {
        lastShownErrorRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasLoaded, isLoading, error, isOnline]);

    // ── Page-1 loader ──
    if (!hasLoaded && isLoading) {
      return (
        <Placeholder
          variant="loading"
          anchor="top-third"
          title="Loading podcasts…"
        />
      );
    }

    // ── Page-1 error ── toast surfaces the Retry action (see useEffect),
    //    but we still need a visual placeholder in the list area so the
    //    screen doesn't look blank. Trigger when fetch has settled (not
    //    loading) AND there's nothing to show.
    if (!hasLoaded && !isLoading && error && items.length === 0) {
      return (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="alertCircle"
          title={isOnline ? "Couldn't load this category." : "You're offline."}
          message="Use Retry at the bottom of the screen to try again."
        />
      );
    }

    // ── Empty (loaded successfully with zero results) ──
    if (hasLoaded && !error && items.length === 0) {
      return (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="folder"
          title={
            isSearchActive
              ? 'No podcasts match your search.'
              : 'No podcasts found in this category.'
          }
        />
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
      <Placeholder
        variant="loading"
        anchor="top-third"
        title={`Loading ${tabRoute.key}…`}
      />
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

  // (Replaced by the shared <Placeholder> component.)

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
