// ─── Live TV Browse Screen ──────────────────────────────────
// Phase 3 TabView formula: search above a react-native-tab-view
// tab bar. Each tab is a lazily-mounted scene with its own
// cached scope. Pagination via onEndReached (client-side limit-
// bumping). Tap → VideoPlayer, long-press → option sheet.

import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  TabView,
  TabBar,
  type SceneRendererProps,
  type Route,
} from 'react-native-tab-view';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import type {RootStackScreenProps} from '../types';

import {
  useLiveTVScreen,
  LIVE_TV_TABS,
  type LiveTVTab,
  type LiveTVScopeState,
} from '../hooks/useLiveTVScreen';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../../components/core/AppText/AppText';
import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {FilterChips} from '../../../components/utility/FilterChips';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {shareContent} from '../../../services/shareService';
import {useBookmarks} from '../../../features/bookmarks';
import {useToast} from '../../../components/feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import {PlaylistSheet} from '../../../components/sheets/PlaylistSheet/PlaylistSheet';
import {usePlayerActivity} from '@simba-dev/react-native-media-player';

import {OptionSheetDialog} from '../../../components/core/OptionSheetDialog/OptionSheetDialog';
import type {IPTVChannelResult, IPTVCategory} from '../../../types/api';
import type {LiveFavoriteItem} from '../../../store/slices/liveFavoritesSlice';

type Props = RootStackScreenProps<'LiveTVScreen'>;

// ─── Normalized row ─────────────────────────────────────────

interface ChannelRow {
  id: string;
  name: string;
  url: string;
  image: string;
  subtitle: string;
}

function toRow(channel: IPTVChannelResult): ChannelRow {
  return {
    id: channel.id,
    name: channel.name,
    url: channel.url,
    image: channel.logo || '',
    subtitle: [channel.category, channel.country].filter(Boolean).join(' · '),
  };
}

function favToRow(fav: LiveFavoriteItem): ChannelRow {
  return {
    id: fav.id,
    name: fav.name,
    url: fav.url,
    image: fav.image,
    subtitle: fav.subtitle,
  };
}

// ─── Channel Card ───────────────────────────────────────────

interface ChannelCardProps {
  row: ChannelRow;
  isFavorite: boolean;
  onPress: (row: ChannelRow) => void;
  onLongPress: (row: ChannelRow) => void;
}

const ChannelCard: React.FC<ChannelCardProps> = React.memo(
  ({row, isFavorite, onPress, onLongPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row)}
        onLongPress={() => onLongPress(row)}
        delayLongPress={400}
        accessibilityRole="button"
        style={[styles.card, {backgroundColor: colors.background.elevated}]}>
        {/* Thumbnail 56×56 */}
        <View
          style={[styles.thumb, {backgroundColor: colors.border.subtle}]}>
          {row.image ? (
            <FastImage
              source={{
                uri: row.image,
                priority: FastImage.priority.normal,
              }}
              style={styles.thumb}
              resizeMode={FastImage.resizeMode.contain}
            />
          ) : (
            <SvgIcon name="video" size={22} color={colors.accent.gold} />
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.name}>
            {row.name}
          </AppText>
          {row.subtitle ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {row.subtitle}
            </AppText>
          ) : null}
        </View>

        {/* Favorite bookmark */}
        <SvgIcon
          name="bookmark"
          size={18}
          color={isFavorite ? colors.accent.gold : colors.text.tertiary}
        />

        {/* Play button circle */}
        <View style={styles.playButton}>
          <SvgIcon name="play" size={16} color={colors.accent.gold} />
        </View>
      </TouchableOpacity>
    );
  },
);

// ─── Tab Scene ───────────────────────────────────────────────

interface LiveTVTabSceneProps {
  tab: LiveTVTab;
  scope: LiveTVScopeState;
  favorites: LiveFavoriteItem[];
  isSearchActive: boolean;
  categories: IPTVCategory[];
  selectedCategory: string | null;
  selectCategory: (cat: string | null) => void;
  isOnline: boolean;
  refreshing: boolean;
  handleRefresh: () => void;
  ensureLoaded: (tab: LiveTVTab) => void;
  loadMore: (tab: LiveTVTab) => void;
  retry: (tab: LiveTVTab) => void;
  isFavoriteId: (id: string) => boolean;
  onPressChannel: (row: ChannelRow) => void;
  onLongPressChannel: (row: ChannelRow) => void;
}

const LiveTVTabScene: React.FC<LiveTVTabSceneProps> = React.memo(
  ({
    tab,
    scope,
    favorites,
    isSearchActive,
    categories,
    selectedCategory,
    selectCategory,
    isOnline,
    refreshing,
    handleRefresh,
    ensureLoaded,
    loadMore,
    retry,
    isFavoriteId,
    onPressChannel,
    onLongPressChannel,
  }) => {
    const {colors} = useTheme();
    const toast = useToast();

    // [FIX-PODCASTS-LOOP] Stash ensureLoaded in a ref so this effect
    // doesn't re-fire every time the parent re-renders.
    const ensureLoadedRef = React.useRef(ensureLoaded);
    ensureLoadedRef.current = ensureLoaded;

    // Ensure data is loaded for this tab
    React.useEffect(() => {
      ensureLoadedRef.current(tab);
    }, [tab]);

    // Convert to normalized rows
    const rows: ChannelRow[] = useMemo(() => {
      if (tab === 'favorites') {
        return favorites.map(favToRow);
      }
      return scope.items.map(toRow);
    }, [tab, favorites, scope.items]);

    // v10 Wave 4: category chips run through the shared FilterChips primitive
    // (key = category name — matches the selectedCategory value used by the
    // hook when filtering channels)
    const categoryChipItems = useMemo(
      () =>
        categories.map(cat => ({
          key: cat.name,
          label: cat.name,
          count: cat.channelCount,
        })),
      [categories],
    );

    const {hasLoaded, isLoading, isLoadingMore, limit, error} = scope;

    // Surface page-1 load failures as a toast with a Retry action.
    // [FIX-PODCASTS-LOOP] deps only include state (not toast/retry fn refs)
    // to avoid infinite re-render. Track last shown error in a ref.
    const lastShownErrorRef = React.useRef<string | null>(null);
    React.useEffect(() => {
      const shouldShow = !hasLoaded && !isLoading && error;
      const currentError = shouldShow
        ? isOnline
          ? 'Could not load channels.'
          : 'You are offline.'
        : null;
      if (currentError && currentError !== lastShownErrorRef.current) {
        lastShownErrorRef.current = currentError;
        toast.show(currentError, 'error', {
          duration: 8000,
          action: {
            label: 'Retry',
            onPress: () => {
              lastShownErrorRef.current = null;
              retry(tab);
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
        <Placeholder variant="loading" anchor="top-third" title="Loading channels…" />
      );
    }

    // ── Page-1 error ── toast surfaces the Retry action; show a
    //    placeholder in the list area so the screen isn't blank.
    if (!hasLoaded && !isLoading && error && rows.length === 0 && tab !== 'favorites') {
      return (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="alertCircle"
          title={isOnline ? "Couldn't load channels." : "You're offline."}
          message="Use Retry at the bottom of the screen to try again."
        />
      );
    }

    // ── Favorites empty ──
    if (tab === 'favorites' && rows.length === 0) {
      return (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="bookmark"
          title="No favorite channels yet."
          message="Long-press any channel to save it here."
        />
      );
    }

    // ── Empty (loaded, no results) ──
    if (hasLoaded && rows.length === 0) {
      return (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon={isSearchActive ? 'search' : 'video'}
          title={isSearchActive ? 'No channels match your search.' : 'No channels found.'}
        />
      );
    }

    // ── Category chips (categories tab, no search active) ──
    const showCategories =
      !isSearchActive &&
      tab === 'categories' &&
      categories.length > 0;

    // ── hasMore (client-side pagination) ──
    const hasMore =
      tab !== 'favorites' && rows.length > 0 && rows.length >= limit;

    return (
      <View style={styles.scene}>
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <ChannelCard
              row={item}
              isFavorite={isFavoriteId(item.id)}
              onPress={onPressChannel}
              onLongPress={onLongPressChannel}
            />
          )}
          ListHeaderComponent={
            showCategories ? (
              <FilterChips
                items={categoryChipItems}
                selectedKey={selectedCategory}
                onSelect={cat => selectCategory(cat === '' ? null : cat)}
              />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => hasMore && loadMore(tab)}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            (isLoadingMore || (error && hasLoaded && rows.length > 0)) ? (
              <View style={styles.footer}>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent.gold}
              colors={[colors.accent.gold]}
            />
          }
          windowSize={5}
          maxToRenderPerBatch={10}
        />
      </View>
    );
  },
);

// ─── Screen ─────────────────────────────────────────────────

export const LiveTVScreen: React.FC<Props> = ({route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const haptics = useHaptics();
  const {add: addBookmark} = useBookmarks();
  const {
    selectedTab,
    selectTab,
    selectedCategory,
    selectCategory,
    categories,
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
    favorites,
    isFavoriteId,
    toggleFavorite,
    removeFavorite,
  } = useLiveTVScreen(route.params?.categoryId);

  const [menuRow, setMenuRow] = useState<ChannelRow | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<
    React.ComponentProps<typeof PlaylistSheet>['currentItem'] | null
  >(null);
  const {openPlayer} = usePlayerActivity();

  // ── Channel press / long-press ──
  const handleChannelPress = useCallback(
    (row: ChannelRow) => {
      openPlayer({
        uri: row.url,
        title: row.name,
        type: 'video',
      });
    },
    [openPlayer],
  );

  const handleLongPress = useCallback((row: ChannelRow) => {
    setMenuRow(row);
    setMenuVisible(true);
  }, []);

  const handleMenuSelect = useCallback(
    (value: string | number) => {
      const row = menuRow;
      if (!row) return;
      switch (value) {
        case 'favorite': {
          // When in favorites tab the source channel may only exist as
          // a favorite item, so handle both cases.
          const channel = (
            getScope('all').items as IPTVChannelResult[]
          ).find((c: IPTVChannelResult) => c.id === row.id);
          const wasFavorite = isFavoriteId(row.id);
          if (channel) {
            toggleFavorite(channel);
          } else {
            removeFavorite(row.id);
          }
          toast.show(
            wasFavorite
              ? 'Removed from favorites'
              : 'Saved to favorites',
          );
          haptics.light();
          break;
        }
        case 'playlist':
          setSheetItem({
            fileUri: row.url,
            title: row.name,
            duration: 0,
            thumbnailPath: row.image || undefined,
            source: 'api',
        provider: 'iptv',
            mediaType: 'video',
          });
          break;
        case 'bookmark':
          addBookmark({
            fileUri: row.url,
            title: row.name,
            position: 0,
            duration: 0,
            label: '',
            thumbnailPath: row.image || undefined,
            mediaType: 'video',
            source: 'api',
            provider: 'iptv',
            type: 'video',
          });
          toast.show('Channel bookmarked');
          break;
        case 'share':
          shareContent({
            route: 'LiveTVScreen',
            params: {
              fileUri: row.url,
              fileTitle: row.name,
              source: 'api',
        provider: 'iptv',
            },
            title: row.name,
            subtitle: row.subtitle,
          });
          break;
      }
      setMenuRow(null);
    },
    [
      menuRow,
      getScope,
      isFavoriteId,
      toggleFavorite,
      removeFavorite,
      addBookmark,
      toast,
      haptics,
    ],
  );

  // ── TabView wiring ──
  const tabRoutes = useMemo(
    () => LIVE_TV_TABS.map(t => ({key: t.key, title: t.title})),
    [],
  );
  const tabIndex = Math.max(
    0,
    LIVE_TV_TABS.findIndex(t => t.key === selectedTab),
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
      const tab = LIVE_TV_TABS.find(t => t.key === tabRoute.key);
      if (!tab) return null;
      return (
        <LiveTVTabScene
          tab={tab.key}
          scope={getScope(tab.key)}
          favorites={favorites}
          isSearchActive={isSearchActive}
          categories={categories}
          selectedCategory={selectedCategory}
          selectCategory={selectCategory}
          isOnline={isOnline}
          refreshing={refreshing}
          handleRefresh={handleRefresh}
          ensureLoaded={ensureLoaded}
          loadMore={loadMore}
          retry={retry}
          isFavoriteId={isFavoriteId}
          onPressChannel={handleChannelPress}
          onLongPressChannel={handleLongPress}
        />
      );
    },
    [
      getScope,
      favorites,
      isSearchActive,
      categories,
      selectedCategory,
      selectCategory,
      isOnline,
      refreshing,
      handleRefresh,
      ensureLoaded,
      loadMore,
      retry,
      isFavoriteId,
      handleChannelPress,
      handleLongPress,
    ],
  );

  const renderLazyPlaceholder = useCallback(
    ({route: tabRoute}: {route: Route}) => (
      <Placeholder
        variant="loading"
        anchor="top-third"
        title={`Loading ${LIVE_TV_TABS.find(t => t.key === tabRoute.key)?.title ?? 'channels'}…`}
      />
    ),
    [],
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.primary,
          paddingTop: insets.top,
        },
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Live TV" />

      {/* ── Search ── */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder="Search channels…"
        />
      </View>

      {/* ── TabView ── */}
      <TabView
        navigationState={{index: tabIndex, routes: tabRoutes}}
        onIndexChange={index =>
          selectTab(tabRoutes[index].key as LiveTVTab)
        }
        renderTabBar={renderTabBar}
        renderScene={renderScene}
        renderLazyPlaceholder={renderLazyPlaceholder}
        lazy
        commonOptions={{labelStyle: styles.tabLabel}}
        style={styles.tabView}
      />

      {/* ── Long-press menu ── */}
      <OptionSheetDialog
        visible={menuVisible}
        title={menuRow?.name ?? 'Channel Options'}
        options={[
          {
            label: isFavoriteId(menuRow?.id ?? '')
              ? 'Remove Favorite'
              : 'Add to Favorites',
            value: 'favorite',
          },
          {label: 'Add to Playlist', value: 'playlist'},
          {label: 'Bookmark', value: 'bookmark'},
          {label: 'Share', value: 'share'},
        ]}
        selectedValue={null}
        onSelect={handleMenuSelect}
        onClose={() => setMenuVisible(false)}
        colors={colors}
      />
      <PlaylistSheet
        visible={sheetItem !== null}
        onClose={() => setSheetItem(null)}
        currentItem={
          sheetItem ?? {fileUri: '', title: '', duration: 0}
        }
      />
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // ── Search ──
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  // ── TabView ──
  tabView: {
    flex: 1,
  },
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
  // ── Channel List ──
  listContent: {
    padding: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontWeight: '600',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Footer ──
  footer: {
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
});
