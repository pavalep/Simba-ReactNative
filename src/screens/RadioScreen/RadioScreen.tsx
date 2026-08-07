// ─── Radio Browse Screen ────────────────────────────────────────────
// Phase 3 formula: SearchBar above TabView, each browse mode is a tab.
//   • search persists across tab toggles (cached per scope)
//   • all tabs paginate via onEndReached (infinite scroll)
//   • Favorites tab = local Redux data
//   • Long-press → favorite / playlist / bookmark / share

import React, {useCallback, useMemo, useState} from 'react';
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
  useRadioScreen,
  RADIO_TABS,
  type RadioBrowseMode,
  type RadioScopeState,
} from './hooks/useRadioScreen';
import type {RadioBrowseTag} from '../../services/api/radioBrowserService';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../components/feedback/Placeholder';
import {shareContent} from '../../services/shareService';
import {useBookmarks} from '../../hooks/useBookmarks';
import {useToast} from '../../components/feedback/Toast';
import {useHaptics} from '../../hooks/useHaptics';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet/PlaylistSheet';
import {OptionSheetDialog} from '../../components/core/OptionSheetDialog/OptionSheetDialog';
import type {RadioStationResult} from '../../types/api';
import type {LiveFavoriteItem} from '../../store/slices/liveFavoritesSlice';

type Props = RootStackScreenProps<'RadioScreen'>;

// ─── Normalized row ───────────────────────────────────────────────────

interface StationRow {
  id: string;
  name: string;
  url: string;
  image: string;
  subtitle: string;
  codec?: string;
  bitrate?: number;
}

function toRow(station: RadioStationResult): StationRow {
  return {
    id: station.stationuuid,
    name: station.name,
    url: station.urlResolved || station.url,
    image: station.favicon || '',
    subtitle: [station.country, station.tags].filter(Boolean).join(' · '),
    codec: station.codec,
    bitrate: station.bitrate,
  };
}

function favToRow(fav: LiveFavoriteItem): StationRow {
  return {
    id: fav.id,
    name: fav.name,
    url: fav.url,
    image: fav.image,
    subtitle: fav.subtitle,
    codec: fav.codec,
    bitrate: fav.bitrate,
  };
}

// ─── Station Card ─────────────────────────────────────────────────────

interface StationCardProps {
  row: StationRow;
  isFavorite: boolean;
  onPress: (row: StationRow) => void;
  onLongPress: (row: StationRow) => void;
}

const StationCard: React.FC<StationCardProps> = React.memo(
  ({row, isFavorite, onPress, onLongPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row)}
        onLongPress={() => onLongPress(row)}
        delayLongPress={400}
        style={[styles.card, {backgroundColor: colors.background.elevated}]}>
        <View style={[styles.thumb, {backgroundColor: colors.border.subtle}]}>
          {row.image ? (
            <FastImage
              source={{uri: row.image}}
              style={styles.thumb}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <SvgIcon name="headphones" size={22} color={colors.accent.gold} />
          )}
        </View>
        <View style={styles.info}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.name}>
            {row.name}
          </AppText>
          {row.subtitle ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {row.subtitle}
            </AppText>
          ) : null}
          {row.codec || row.bitrate ? (
            <View style={styles.metaRow}>
              {row.codec ? (
                <View style={[styles.metaBadge, {backgroundColor: colors.accent.goldDim}]}>
                  <AppText variant="caption" style={[styles.metaBadgeText, {color: colors.accent.gold}]}>
                    {row.codec}
                  </AppText>
                </View>
              ) : null}
              {row.bitrate ? (
                <AppText variant="caption" color="tertiary">
                  {row.bitrate} kbps
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>
        <SvgIcon
          name="bookmark"
          size={18}
          color={isFavorite ? colors.accent.gold : colors.text.tertiary}
        />
        <View style={styles.playButton}>
          <SvgIcon name="play" size={16} color={colors.accent.gold} />
        </View>
      </TouchableOpacity>
    );
  },
);

// ─── In-tab Tag Chips ─────────────────────────────────────────────────

interface TagChipsProps {
  tags: RadioBrowseTag[];
  selectedTag: string | null;
  tagsLoaded: boolean;
  onSelect: (name: string) => void;
}

const TagChips: React.FC<TagChipsProps> = React.memo(
  ({tags, selectedTag, tagsLoaded, onSelect}) => {
    const {colors} = useTheme();
    if (!tagsLoaded) {
      return (
        <View style={styles.chipWrap}>
          <ActivityOrb size={18} />
        </View>
      );
    }
    if (tags.length === 0) return null;
    return (
      <FlatList
        horizontal
        data={tags}
        keyExtractor={tag => tag.name}
        renderItem={({item: tag}) => {
          const active = selectedTag === tag.name;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onSelect(tag.name)}
              style={[
                styles.chip,
                styles.tagChip,
                {
                  backgroundColor: active ? colors.accent.goldDim : colors.background.elevated,
                  borderColor: active ? colors.accent.gold : colors.border.subtle,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{selected: active}}>
              <AppText
                variant="caption"
                style={[
                  styles.tagText,
                  {color: active ? colors.accent.gold : colors.text.secondary},
                ]}>
                {tag.name} {tag.stationCount != null ? `· ${tag.stationCount}` : ''}
              </AppText>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.chipScroll}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={24}
        windowSize={5}
        maxToRenderPerBatch={12}
      />
    );
  },
);

// ─── Tab Scene ────────────────────────────────────────────────────────

interface RadioTabSceneProps {
  tab: RadioBrowseMode;
  scope: RadioScopeState;
  isSearchActive: boolean;
  tags: RadioBrowseTag[];
  tagsLoaded: boolean;
  selectedTag: string | null;
  setSelectedTag: (tag: string) => void;
  isOnline: boolean;
  refreshing: boolean;
  ensureLoaded: (tab: RadioBrowseMode) => void;
  loadMore: (tab: RadioBrowseMode) => void;
  retry: (tab: RadioBrowseMode) => void;
  handleRefresh: () => void;
  isFavoriteId: (id: string) => boolean;
  onPress: (row: StationRow) => void;
  onLongPress: (row: StationRow) => void;
}

const RadioTabScene: React.FC<RadioTabSceneProps> = React.memo(
  ({
    tab,
    scope,
    isSearchActive,
    tags,
    tagsLoaded,
    selectedTag,
    setSelectedTag,
    isOnline,
    refreshing,
    ensureLoaded,
    loadMore,
    retry,
    handleRefresh,
    isFavoriteId,
    onPress,
    onLongPress,
  }) => {
    const {colors} = useTheme();
    const toast = useToast();
    const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

    // [FIX-PODCASTS-LOOP] Stash ensureLoaded in a ref.
    const ensureLoadedRef = React.useRef(ensureLoaded);
    ensureLoadedRef.current = ensureLoaded;
    React.useEffect(() => {
      ensureLoadedRef.current(tab);
    }, [tab]);

    // Surface page-1 load failures as a toast with a Retry action.
    // [FIX-PODCASTS-LOOP] deps only include state (not toast/retry fn refs).
    const lastShownErrorRef = React.useRef<string | null>(null);
    React.useEffect(() => {
      const shouldShow = !hasLoaded && !isLoading && !!error;
      const currentError = shouldShow
        ? isOnline
          ? 'Could not load stations.'
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

    const rows = useMemo<StationRow[]>(() => items.map(toRow), [items]);

    // ── Page-1 loader ──
    if (!hasLoaded && isLoading) {
      return (
        <Placeholder
          variant="loading"
          anchor="top-third"
          title="Loading stations…"
        />
      );
    }

    // ── Page-1 error ── toast surfaces Retry; placeholder keeps the
    //    screen from looking blank.
    if (!hasLoaded && !isLoading && error && rows.length === 0 && tab !== 'favorites') {
      return (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="alertCircle"
          title={isOnline ? "Couldn't load stations." : "You're offline."}
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
          title="No favorite stations yet."
          message="Long-press any station to save it here."
        />
      );
    }

    // ── Empty ──
    if (hasLoaded && !error && rows.length === 0) {
      return (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="headphones"
          title={isSearchActive ? 'No stations match your search.' : 'No stations found.'}
        />
      );
    }

    // ── Tag chips (Genres / Countries / Languages tabs) ──
    const showTags =
      !isSearchActive &&
      (tab === 'genres' || tab === 'countries' || tab === 'languages');

    const tagHeader = showTags ? (
      <TagChips
        tags={tags}
        selectedTag={selectedTag}
        tagsLoaded={tagsLoaded}
        onSelect={setSelectedTag}
      />
    ) : null;

    // ── Loaded list ──
    const hasMore =
      tab !== 'favorites' &&
      rows.length > 0 &&
      rows.length % 30 === 0;

    return (
      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <StationCard
            row={item}
            isFavorite={isFavoriteId(item.id)}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        )}
        ListHeaderComponent={tagHeader}
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
        onEndReached={() => hasMore && loadMore(tab)}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isLoadingMore || (hasMore && error) ? (
            <View style={styles.footer}>
              {isLoadingMore ? (
                <ActivityOrb size={22} />
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => loadMore(tab)}
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

// ─── Screen ───────────────────────────────────────────────────────────

export const RadioScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const haptics = useHaptics();
  const {add: addBookmark} = useBookmarks();

  const {
    selectedTab,
    setSelectedTab,
    selectedTag,
    setSelectedTag,
    tags,
    tagsLoaded,
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
    isFavoriteId,
    toggleFavorite,
    removeFavorite,
  } = useRadioScreen(route.params?.initialTab);

  const [menuRow, setMenuRow] = useState<StationRow | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<
    React.ComponentProps<typeof PlaylistSheet>['currentItem'] | null
  >(null);

  const handleStationPress = useCallback(
    (row: StationRow) => {
      navigation.navigate('AudioPlayer', {
        fileUri: row.url,
        fileTitle: row.name,
        artworkUri: row.image || undefined,
        source: 'radio',
      });
    },
    [navigation],
  );

  const handleLongPress = useCallback((row: StationRow) => {
    setMenuRow(row);
    setMenuVisible(true);
  }, []);

  const handleMenuSelect = useCallback(
    (value: string | number) => {
      const row = menuRow;
      if (!row) return;
      switch (value) {
        case 'favorite': {
          const scope = getScope(selectedTab);
          const station = scope.items.find(s => s.stationuuid === row.id);
          if (station) {
            const wasFavorite = isFavoriteId(row.id);
            toggleFavorite(station);
            toast.show(wasFavorite ? 'Removed from favorites' : 'Saved to favorites');
          } else {
            removeFavorite(row.id);
            toast.show('Removed from favorites');
          }
          haptics.light();
          break;
        }
        case 'playlist':
          setSheetItem({
            fileUri: row.url,
            title: row.name,
            duration: 0,
            thumbnailPath: row.image || undefined,
            source: 'radio',
            mediaType: 'audio',
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
            mediaType: 'audio',
            source: 'radio',
          });
          toast.show('Station bookmarked');
          break;
        case 'share':
          shareContent({
            route: 'AudioPlayer',
            params: {fileUri: row.url, fileTitle: row.name, source: 'radio'},
            title: row.name,
            subtitle: row.subtitle,
          });
          break;
      }
      setMenuRow(null);
    },
    [menuRow, selectedTab, getScope, isFavoriteId, removeFavorite, toggleFavorite, addBookmark, toast, haptics],
  );

  const tabIndex = Math.max(0, RADIO_TABS.findIndex(t => t.key === selectedTab));
  const routes = useMemo(() => RADIO_TABS.map(t => ({key: t.key, title: t.title})), []);

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
    ({route: tabRoute}: {route: Route}) => {
      const t = tabRoute.key as RadioBrowseMode;
      return (
        <RadioTabScene
          tab={t}
          scope={getScope(t)}
          isSearchActive={isSearchActive}
          tags={tags}
          tagsLoaded={tagsLoaded}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          isOnline={isOnline}
          refreshing={refreshing}
          ensureLoaded={ensureLoaded}
          loadMore={loadMore}
          retry={retry}
          handleRefresh={handleRefresh}
          isFavoriteId={isFavoriteId}
          onPress={handleStationPress}
          onLongPress={handleLongPress}
        />
      );
    },
    [getScope, isSearchActive, tags, tagsLoaded, selectedTag, setSelectedTag, isOnline, refreshing, ensureLoaded, loadMore, retry, handleRefresh, isFavoriteId, handleStationPress, handleLongPress],
  );

  const renderLazyPlaceholder = useCallback(
    ({route: tabRoute}: {route: Route}) => (
      <Placeholder
        variant="loading"
        anchor="top-third"
        title={`Loading ${RADIO_TABS.find(t => t.key === tabRoute.key)?.title ?? 'tab'}…`}
      />
    ),
    [],
  );

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Live Radio" />

      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder="Search stations…"
        />
      </View>

      <TabView
        navigationState={{index: tabIndex, routes}}
        onIndexChange={index => setSelectedTab(routes[index].key as RadioBrowseMode)}
        renderTabBar={renderTabBar}
        renderScene={renderScene}
        renderLazyPlaceholder={renderLazyPlaceholder}
        lazy
        commonOptions={{labelStyle: styles.tabLabel}}
        style={styles.sceneContainer}
      />

      <OptionSheetDialog
        visible={menuVisible}
        title={menuRow?.name ?? 'Station Options'}
        options={[
          {label: isFavoriteId(menuRow?.id ?? '') ? 'Remove Favorite' : 'Add to Favorites', value: 'favorite'},
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
        currentItem={sheetItem ?? {fileUri: '', title: '', duration: 0}}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────

const ItemSeparator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: {flex: 1},
  searchSection: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  sceneContainer: {flex: 1},
  tabBar: {borderBottomWidth: 1, elevation: 0, shadowOpacity: 0},
  tabIndicator: {height: 3, borderRadius: radius.full},
  tabLabel: {fontSize: 13, fontWeight: '700', textTransform: 'none'},
  tab: {width: 'auto', minWidth: 84},
  tabBarContent: {paddingHorizontal: spacing.xs},

  // (Replaced by the shared <Placeholder> component.)

  chipWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  chipScroll: {paddingHorizontal: spacing.md, gap: spacing.sm},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tagChip: {paddingVertical: 6},
  tagText: {fontSize: 12, fontWeight: '600'},

  listContent: {padding: spacing.md, paddingBottom: spacing.xxl + 80},
  separator: {height: spacing.sm},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {flex: 1, gap: spacing.xs},
  name: {fontWeight: '600'},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  metaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.sm - 2,
  },
  metaBadgeText: {fontSize: 10, fontWeight: '700'},
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
