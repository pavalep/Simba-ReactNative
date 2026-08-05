// ─── Internet Archive Browse Screen ────────────────────────────────────
// Phase 3 formula: search bar above a react-native-tab-view tab bar.
//   • Audio / Video are lazily-mounted scenes (native pager) — a scope is
//     a (tab, searchTerm) pair, cached independently so toggling tabs never
//     refetches or clears already-loaded data and search text survives.
//   • Every list paginates via onEndReached (infinite scroll) using IA's
//     `numFound` as the has-more boundary.
// Audio → ArchiveItemDetail (track list), video → MovieDetail (player).

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
import type {ArchiveScreenProps} from '../../navigation/types';
import {
  useArchiveScreen,
  type ArchiveTab,
  type AudioScopeState,
  type VideoScopeState,
} from './hooks/useArchiveScreen';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {ARCHIVE_QUICK_SEARCHES} from '../../constants/audiobookCategories';
import type {
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
} from '../../types/api';

type Props = ArchiveScreenProps;

// ─── Normalized rows ───────────────────────────────────────────────────

interface ArchiveRow {
  identifier: string;
  title: string;
  creator: string;
  image: string;
  subtitle: string;
}

function audioToRow(item: InternetArchiveItemResult): ArchiveRow {
  return {
    identifier: item.identifier,
    title: item.title,
    creator: item.creator,
    image: item.imageUrl,
    subtitle: [item.year, item.runtime].filter(Boolean).join(' · '),
  };
}

function videoToRow(item: InternetArchiveVideoResult): ArchiveRow {
  return {
    identifier: item.identifier,
    title: item.title,
    creator: item.creator,
    image: item.imageUrl,
    subtitle: [item.year].filter(Boolean).join(' · '),
  };
}

// ─── Row Card ──────────────────────────────────────────────────────────

interface ArchiveCardProps {
  row: ArchiveRow;
  mediaType: ArchiveTab;
  onPress: (row: ArchiveRow, mediaType: ArchiveTab) => void;
}

const ArchiveCard: React.FC<ArchiveCardProps> = React.memo(
  ({row, mediaType, onPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row, mediaType)}
        style={[styles.card, {backgroundColor: colors.background.elevated}]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${row.title}`}>
        <View style={[styles.thumb, {backgroundColor: colors.border.subtle}]}>
          {row.image ? (
            <FastImage
              source={{uri: row.image}}
              style={styles.thumb}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <SvgIcon
              name={mediaType === 'video' ? 'video' : 'headphones'}
              size={22}
              color={colors.accent.gold}
            />
          )}
        </View>
        <View style={styles.info}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.name}>
            {row.title}
          </AppText>
          {row.creator ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {row.creator}
            </AppText>
          ) : null}
          {row.subtitle ? (
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {row.subtitle}
            </AppText>
          ) : null}
        </View>
        <SvgIcon
          name="chevronRight"
          size={18}
          color={colors.text.tertiary ?? colors.text.secondary}
        />
      </TouchableOpacity>
    );
  },
);

// ─── Tab Scene ─────────────────────────────────────────────────────────

interface ArchiveTabSceneProps {
  tab: ArchiveTab;
  scope: AudioScopeState | VideoScopeState;
  isSearchActive: boolean;
  isOnline: boolean;
  refreshing: boolean;
  ensureLoaded: (tab: ArchiveTab) => void;
  loadMore: (tab: ArchiveTab) => void;
  retry: (tab: ArchiveTab) => void;
  handleRefresh: () => void;
  onPressRow: (row: ArchiveRow, mediaType: ArchiveTab) => void;
}

const ArchiveTabScene: React.FC<ArchiveTabSceneProps> = React.memo(
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
    onPressRow,
  }) => {
    const {colors} = useTheme();
    const {hasLoaded, isLoading, isLoadingMore, error} = scope;

    // Auto-load page 1 the first time this scene mounts (lazy tab).
    React.useEffect(() => {
      ensureLoaded(tab);
    }, [ensureLoaded, tab]);

    const rows = useMemo<ArchiveRow[]>(() => {
      if (tab === 'audio') {
        return (scope as AudioScopeState).items.map(audioToRow);
      }
      return (scope as VideoScopeState).items.map(videoToRow);
    }, [tab, scope]);

    // ── Initial page-1 loader ──
    if (!hasLoaded && isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityOrb size={36} />
          <AppText variant="body2" color="tertiary" style={styles.stateText}>
            Loading {tab === 'audio' ? 'Audio' : 'Video'}…
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
            {isOnline ? 'Could not load results.' : 'You are offline.'}
          </AppText>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => retry(tab)}
            style={[
              styles.retryButton,
              {backgroundColor: colors.accent.gold},
            ]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading">
            <AppText variant="button" style={{color: colors.background.primary}}>
              Retry
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    // ── Empty (cached or fresh) ──
    if (hasLoaded && !error && rows.length === 0) {
      return (
        <View style={styles.centerState}>
          <SvgIcon name="search" size={40} color={colors.accent.goldDim} />
          <AppText variant="body2" color="tertiary" style={styles.stateText}>
            {isSearchActive
              ? 'No results for this search.'
              : 'Nothing found here yet.'}
          </AppText>
        </View>
      );
    }

    // ── Loaded list with infinite scroll ──
    return (
      <FlatList
        data={rows}
        keyExtractor={item => item.identifier}
        renderItem={({item}) => (
          <ArchiveCard row={item} mediaType={tab} onPress={onPressRow} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={ItemSeparator}
        onEndReached={() => loadMore(tab)}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isLoadingMore || error ? (
            <View style={styles.footer}>
              {isLoadingMore ? (
                <ActivityOrb size={22} />
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => loadMore(tab)}
                  style={[
                    styles.loadMoreRetry,
                    {borderColor: colors.border.subtle},
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Try loading more">
                  <AppText variant="caption" color="secondary">
                    Could not load more — tap to retry
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
      />
    );
  },
);

// ─── Component ─────────────────────────────────────────────────────────

export const ArchiveScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {initialTab, query} = route.params ?? {};
  const {
    tab,
    selectTab,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    submitSearch,
    isSearchActive,
    isOnline,
    refreshing,
    handleRefresh,
    getScope,
    ensureLoaded,
    loadMore,
    retry,
  } = useArchiveScreen(initialTab, query);

  const handleRowPress = useCallback(
    (row: ArchiveRow, mediaType: ArchiveTab) => {
      if (mediaType === 'video') {
        navigation.navigate('MovieDetail', {
          identifier: row.identifier,
          title: row.title,
        });
      } else {
        navigation.navigate('ArchiveItemDetail', {
          identifier: row.identifier,
          title: row.title,
        });
      }
    },
    [navigation],
  );

  const routes = useMemo<Route[]>(
    () => [
      {key: 'audio', title: 'Audio'},
      {key: 'video', title: 'Video'},
    ],
    [],
  );
  const tabIndex = tab === 'video' ? 1 : 0;

  const renderTabBar = useCallback(
    (props: SceneRendererProps & {navigationState: {index: number; routes: Route[]}}) => (
      <TabBar
        {...props}
        scrollEnabled
        indicatorStyle={[styles.tabIndicator, {backgroundColor: colors.accent.gold}]}
        activeColor={colors.accent.gold}
        inactiveColor={colors.text.secondary}
        tabStyle={styles.tab}
        contentContainerStyle={styles.tabBarContent}
        style={[styles.tabBar, {backgroundColor: colors.background.primary}]}
      />
    ),
    [colors],
  );

  const renderScene = useCallback(
    ({route: tabRoute}: {route: Route}) => {
      const t = tabRoute.key as ArchiveTab;
      return (
        <ArchiveTabScene
          tab={t}
          scope={getScope(t)}
          isSearchActive={isSearchActive}
          isOnline={isOnline}
          refreshing={refreshing}
          ensureLoaded={ensureLoaded}
          loadMore={loadMore}
          retry={retry}
          handleRefresh={handleRefresh}
          onPressRow={handleRowPress}
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
      handleRowPress,
    ],
  );

  const renderLazyPlaceholder = useCallback(
    ({route: tabRoute}: {route: Route}) => (
      <View style={styles.centerState}>
        <ActivityOrb />
        <AppText variant="body2" color="tertiary" style={styles.stateText}>
          Loading {tabRoute.key === 'audio' ? 'Audio' : 'Video'}…
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
      <InternalHeader title="Internet Archive" />

      {/* ── Search — stays put while tabs change ── */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder={
            tab === 'audio'
              ? 'Search audio: radio, concerts, speeches…'
              : 'Search films & documentaries…'
          }
        />
        {/* Quick-search chips */}
        {!searchQuery.trim() && (
          <FlatList
            horizontal
            data={ARCHIVE_QUICK_SEARCHES}
            keyExtractor={entry => entry.id}
            renderItem={({item: entry}) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => submitSearch(entry.query)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.background.elevated,
                    borderColor: colors.border.subtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Search ${entry.label}`}>
                <SvgIcon
                  name={entry.icon as never}
                  size={14}
                  color={colors.accent.gold}
                />
                <AppText variant="caption">{entry.label}</AppText>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.chipScroll}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={ARCHIVE_QUICK_SEARCHES.length}
            windowSize={5}
            maxToRenderPerBatch={12}
          />
        )}
      </View>

      {/* ── TabView — lazy scenes + per-scope cache ── */}
      <TabView
        navigationState={{index: tabIndex, routes}}
        onIndexChange={index => selectTab(routes[index].key as ArchiveTab)}
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

const ItemSeparator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchSection: {
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  chipScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  tabBarContent: {
    paddingHorizontal: spacing.md,
  },
  tab: {
    width: 'auto',
    paddingHorizontal: spacing.lg,
  },
  tabIndicator: {
    height: 3,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'none',
  },
  sceneContainer: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
    paddingBottom: 80,
  },
  stateText: {
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 80,
  },
  separator: {
    height: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '600',
  },
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
