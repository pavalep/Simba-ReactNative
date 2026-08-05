// ─── TV Shows Browser Screen ───────────────────────────────────────────
// Phase 3 formula: search above a react-native-tab-view tab bar.
//   • each tab is a lazily-mounted TabView scene (native pager)
//   • every (tab, searchTerm) scope is cached independently —
//     toggling tabs never refetches or clears already-loaded data
//   • browse tab paginates via onEndReached (infinite scroll)
// Tap a tab → see single-column list → tap a show → detail.

import React, {useCallback, useMemo} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {
  TabView,
  TabBar,
  type SceneRendererProps,
  type Route,
} from 'react-native-tab-view';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {
  useShowsScreen,
  type ShowTab,
  type ShowScopeState,
} from './hooks/useShowsScreen';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import type {TVMazeShow} from '../../types/api';

// ─── Constants ──────────────────────────────────────────────────────────

const TABS: {key: ShowTab; title: string}[] = [
  {key: 'search', title: 'Search'},
  {key: 'today', title: 'Today'},
  {key: 'browse', title: 'Browse'},
];

const THUMB_SIZE = 72;

// ─── Helpers ────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ─── Show Card ──────────────────────────────────────────────────────────

interface ShowCardProps {
  item: TVMazeShow;
  onPress: (item: TVMazeShow) => void;
}

const ShowCard: React.FC<ShowCardProps> = React.memo(({item, onPress}) => {
  const {colors} = useTheme();
  const imageUrl = item.image?.medium || item.image?.original || '';
  const genresText =
    item.genres && item.genres.length > 0 ? item.genres.join(', ') : null;
  const summaryText = item.summary ? stripHtml(item.summary) : null;
  const rating = item.rating?.average;
  const hasImage = !!imageUrl;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      style={styles.card}>
      {/* Thumbnail */}
      <View
        style={[
          styles.thumb,
          {backgroundColor: colors.background.elevated},
        ]}>
        {hasImage ? (
          <FastImage
            source={{uri: imageUrl, priority: FastImage.priority.normal}}
            style={styles.thumbImage}
            resizeMode={FastImage.resizeMode.cover}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <SvgIcon name="video" size={22} color={colors.accent.goldDim} />
        )}
        {/* Rating badge on thumb */}
        {rating != null && rating > 0 && (
          <View style={[styles.ratingBadge, {backgroundColor: colors.background.scrimMid}]}>
            <AppText
              variant="caption"
              style={[styles.ratingText, {color: colors.accent.gold}]}>
              ★ {rating.toFixed(1)}
            </AppText>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <AppText
          variant="bodySmall"
          numberOfLines={1}
          style={styles.showName}>
          {item.name}
        </AppText>
        {genresText && (
          <AppText
            variant="caption"
            numberOfLines={1}
            style={{color: colors.accent.gold}}>
            {genresText}
          </AppText>
        )}
        {summaryText && (
          <AppText
            variant="caption"
            color="secondary"
            numberOfLines={2}>
            {summaryText}
          </AppText>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ─── Tab Scene ──────────────────────────────────────────────────────────
// One lazily-mounted scene per tab. Owns its FlatList so each tab
// paginates independently; reads per-scope state from the screen hook.

interface ShowTabSceneProps {
  tab: ShowTab;
  scope: ShowScopeState;
  isSearchActive: boolean;
  isOnline: boolean;
  refreshing: boolean;
  ensureLoaded: (tab: ShowTab) => void;
  loadMore: (tab: ShowTab) => void;
  retry: (tab: ShowTab) => void;
  handleRefresh: (tab: ShowTab) => void;
  onPressShow: (item: TVMazeShow) => void;
}

const ShowTabScene: React.FC<ShowTabSceneProps> = React.memo(
  ({
    tab,
    scope,
    isSearchActive,
    isOnline,
    refreshing,
    ensureLoaded,
    loadMore,
    retry,
    handleRefresh,
    onPressShow,
  }) => {
    const {colors} = useTheme();
    const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

    // Load page 1 for this scope on mount / whenever the scope key
    // changes (e.g. a new search term). `ensureLoaded` short-circuits
    // when the scope is already loading or loaded (except 'today' tab),
    // so this is safe to re-run.
    React.useEffect(() => {
      ensureLoaded(tab);
    }, [ensureLoaded, tab]);

    const renderItem = useCallback(
      ({item}: {item: TVMazeShow}) => (
        <ShowCard item={item} onPress={onPressShow} />
      ),
      [onPressShow],
    );

    const keyExtractor = useCallback(
      (item: TVMazeShow) => `show-${item.id}`,
      [],
    );

    // Only browse tab triggers infinite scroll
    const handleEndReached = useCallback(() => {
      if (tab === 'browse') loadMore(tab);
    }, [tab, loadMore]);

    // ── "Empty when no search term" state for search tab ──
    if (tab === 'search' && !isSearchActive && !isLoading) {
      return (
        <View style={styles.centerState}>
          <SvgIcon name="search" size={40} color={colors.accent.goldDim} />
          <AppText variant="body2" color="tertiary" style={styles.stateText}>
            Type a show name to search TVMaze.
          </AppText>
        </View>
      );
    }

    return (
      <View style={styles.scene}>
        {/* Page-1 loader */}
        {!hasLoaded && isLoading && (
          <View style={styles.centerState}>
            <ActivityOrb />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              Loading shows…
            </AppText>
          </View>
        )}

        {/* Page-1 error */}
        {!hasLoaded && !isLoading && error && (
          <View style={styles.centerState}>
            <SvgIcon
              name="alertCircle"
              size={40}
              color={colors.accent.goldDim}
            />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              {isOnline ? error : 'No internet connection.'}
            </AppText>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => retry(tab)}
              style={[styles.retryPill, {backgroundColor: colors.accent.gold}]}
              accessibilityRole="button">
              <AppText variant="button" style={styles.retryText}>
                Retry
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty scope (loaded, zero results) */}
        {hasLoaded && !error && items.length === 0 && (
          <View style={styles.centerState}>
            <SvgIcon
              name="video"
              size={40}
              color={colors.accent.goldDim}
            />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              {tab === 'search'
                ? 'No shows match your search.'
                : tab === 'today'
                  ? 'No shows airing today.'
                  : 'No shows found.'}
            </AppText>
          </View>
        )}

        {/* Single-column list + infinite scroll */}
        {items.length > 0 && (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => handleRefresh(tab)}
                tintColor={colors.accent.gold}
                colors={[colors.accent.gold]}
              />
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoadingMore || (error && hasLoaded && items.length > 0) ? (
                <View style={styles.listFooter}>
                  {isLoadingMore ? (
                    <View style={styles.footerRow}>
                      <ActivityOrb size={22} />
                      <AppText variant="caption" color="tertiary">
                        Loading more…
                      </AppText>
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => loadMore(tab)}
                      style={[
                        styles.loadMoreRetry,
                        {borderColor: colors.background.highlight},
                      ]}
                      accessibilityRole="button">
                      <AppText variant="caption" color="secondary">
                        Couldn't load more — tap to retry
                      </AppText>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null
            }
            windowSize={5}
            maxToRenderPerBatch={10}
          />
        )}
      </View>
    );
  },
);

// ─── Screen ─────────────────────────────────────────────────────────────

export const ShowsScreen: React.FC<RootStackScreenProps<'ShowsScreen'>> = ({
  navigation,
  route,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {
    selectedTab,
    selectTab,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refreshing,
    handleRefresh,
    isOnline,
  } = useShowsScreen(route.params?.initialTab);

  const handleShowPress = useCallback(
    (show: TVMazeShow) => {
      navigation.navigate('ShowDetail', {
        showId: show.id,
        showName: show.name,
      });
    },
    [navigation],
  );

  // ── TabView wiring ──
  const routes = useMemo(
    () => TABS.map(t => ({key: t.key, title: t.title})),
    [],
  );
  const tabIndex = Math.max(
    0,
    TABS.findIndex(t => t.key === selectedTab),
  );

  const renderTabBar = useCallback(
    (
      props: SceneRendererProps & {
        navigationState: {index: number; routes: Route[]};
      },
    ) => (
      <TabBar
        {...props}
        scrollEnabled
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.background.primary,
            borderBottomColor: colors.background.highlightDim,
          },
        ]}
        indicatorStyle={[
          styles.tabIndicator,
          {backgroundColor: colors.accent.gold},
        ]}
        activeColor={colors.accent.gold}
        inactiveColor={colors.text.secondary}
        tabStyle={styles.tab}
        contentContainerStyle={styles.tabBarContent}
      />
    ),
    [colors],
  );

  const renderScene = useCallback(
    ({route: tabRoute}: {route: Route}) => {
      const tab = TABS.find(t => t.key === tabRoute.key);
      if (!tab) return null;
      return (
        <ShowTabScene
          tab={tab.key}
          scope={getScope(tab.key)}
          isSearchActive={isSearchActive}
          isOnline={isOnline}
          refreshing={refreshing}
          ensureLoaded={ensureLoaded}
          loadMore={loadMore}
          retry={retry}
          handleRefresh={handleRefresh}
          onPressShow={handleShowPress}
        />
      );
    },
    [
      getScope,
      isSearchActive,
      isOnline,
      refreshing,
      ensureLoaded,
      loadMore,
      retry,
      handleRefresh,
      handleShowPress,
    ],
  );

  const renderLazyPlaceholder = useCallback(
    ({route: tabRoute}: {route: Route}) => (
      <View style={styles.centerState}>
        <ActivityOrb />
        <AppText variant="body2" color="tertiary" style={styles.stateText}>
          {TABS.find(t => t.key === tabRoute.key)?.title ?? 'Shows'}…
        </AppText>
      </View>
    ),
    [],
  );

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="TV Shows" />

      {/* ── Search (stays put while tabs change) ── */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder="Search shows…"
        />
      </View>

      {/* ── TabView (lazy scenes) ── */}
      <TabView
        navigationState={{index: tabIndex, routes}}
        onIndexChange={index => selectTab(TABS[index].key)}
        renderTabBar={renderTabBar}
        renderScene={renderScene}
        renderLazyPlaceholder={renderLazyPlaceholder}
        lazy
        commonOptions={{labelStyle: styles.tabLabel}}
      />
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  // ── TabView ──
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  tab: {
    width: 'auto',
    minWidth: 84,
  },
  tabBarContent: {
    paddingHorizontal: spacing.xs,
  },
  // ── Scene ──
  scene: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  stateText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  retryText: {
    color: '#1A1206',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 80,
  },
  listFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadMoreRetry: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  // ── Show Card ──
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  ratingBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderBottomLeftRadius: radius.sm,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
    paddingTop: 2,
  },
  showName: {
    fontWeight: '700',
  },
});
