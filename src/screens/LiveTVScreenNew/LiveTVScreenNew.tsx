// ─── Live TV Screen (New) ───────────────────────────────────────────
// Wave 8: standalone FAB-only page for Live TV.
//   • Header (heart icon → Favorites page)
//   • SearchBar (search persists across filter changes)
//   • Active-filter chips row (gold pill per active filter, tap to clear)
//   • Single content stream (no tabs)
//   • Bottom-right gold FAB → LiveTVOptionsSheet (Category filter)
//   • Long-press a channel → favorite / playlist / bookmark / share
//   • Press a channel → VideoPlayer

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {
  useLiveTVBrowser,
  type LiveTVFilters,
} from './hooks/useLiveTVBrowser';
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
import {SectionFab} from '../../screens/sections/components/SectionFab';
import {
  ChannelCard,
  toRow,
  type ChannelRow,
} from './components/ChannelCard';
import {FilterSheet} from '../../components/sheets/FilterSheet/FilterSheet';

type Props = RootStackScreenProps<'LiveTVScreen'>;

const PAGE_SIZE = 50;

// ─── Active-filter chip row ───────────────────────────────────────────

interface ActiveFilterChipsProps {
  filters: LiveTVFilters;
  onClear: (id: 'category') => void;
}

const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = React.memo(
  ({filters, onClear}) => {
    const {colors} = useTheme();
    if (!filters.category) return null;
    return (
      <View style={styles.chipRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onClear('category')}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${filters.category} filter`}
          style={[
            styles.chip,
            {
              backgroundColor: colors.accent.goldDim,
              borderColor: colors.accent.gold,
            },
          ]}>
          <AppText
            variant="caption"
            style={[styles.chipText, {color: colors.accent.gold}]}>
            {filters.category}
          </AppText>
          <SvgIcon
            name="close"
            size={12}
            color={colors.accent.gold}
          />
        </TouchableOpacity>
      </View>
    );
  },
);

// ─── Item separator (renders hairline with theme color) ────────────

const ItemSeparator: React.FC = () => {
  const {colors} = useTheme();
  return (
    <View
      style={{height: spacing.sm, backgroundColor: colors.background.primary}}
    />
  );
};

// ─── Screen ───────────────────────────────────────────────────────────

export const LiveTVScreenNew: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const haptics = useHaptics();
  const {add: addBookmark} = useBookmarks();

  const {
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    isOnline,
    getScope,
    loadMore,
    retry,
    refreshing,
    handleRefresh,
    tags,
    tagsLoaded,
    isFavoriteId,
    toggleFavorite,
    removeFavorite,
  } = useLiveTVBrowser(
    route.params?.categoryId && route.params.categoryId !== 'all'
      ? route.params.categoryId
      : undefined,
  );

  const [sheetVisible, setSheetVisible] = useState(false);
  const [menuRow, setMenuRow] = useState<ChannelRow | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<
    React.ComponentProps<typeof PlaylistSheet>['currentItem'] | null
  >(null);

  const scope = getScope();
  const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;
  const rows = useMemo<ChannelRow[]>(() => items.map(toRow), [items]);
  // Client-side pagination has no server hasMore; treat the response
  // ceiling (`sourceCount >= requested limit`) as the signal.
  const hasMore = rows.length > 0 && rows.length >= PAGE_SIZE;

  // ── Page-1 failure toast (with Retry) ──
  const lastShownErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const shouldShow = !hasLoaded && !isLoading && !!error;
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
            retry();
          },
        },
      });
    } else if (!currentError) {
      lastShownErrorRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded, isLoading, error, isOnline]);

  const handleChannelPress = useCallback(
    (row: ChannelRow) => {
      navigation.navigate('VideoPlayer', {
        fileUri: row.url,
        fileTitle: row.name,
        source: 'iptv',
      });
    },
    [navigation],
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
          const channel = items.find(c => c.id === row.id);
          const wasFavorite = isFavoriteId(row.id);
          if (channel) {
            toggleFavorite(channel);
            toast.show(
              wasFavorite
                ? 'Removed from favorites'
                : 'Saved to favorites',
            );
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
            source: 'iptv',
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
            source: 'iptv',
          });
          toast.show('Channel bookmarked');
          break;
        case 'share':
          shareContent({
            route: 'VideoPlayer',
            params: {
              fileUri: row.url,
              fileTitle: row.name,
              source: 'iptv',
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
      items,
      isFavoriteId,
      removeFavorite,
      toggleFavorite,
      addBookmark,
      toast,
      haptics,
    ],
  );

  const handleOptionChange = useCallback(
    (id: 'category', key: string) => {
      setFilter(id, key);
      haptics.light();
    },
    [setFilter, haptics],
  );

  // ── Content states ──
  let content: React.ReactNode;
  if (!hasLoaded && isLoading) {
    content = (
      <Placeholder
        variant="loading"
        anchor="top-third"
        title="Loading channels…"
      />
    );
  } else if (
    !hasLoaded &&
    !isLoading &&
    error &&
    rows.length === 0
  ) {
    content = (
      <Placeholder
        variant="empty"
        anchor="top-third"
        icon="alertCircle"
        title={isOnline ? "Couldn't load channels." : "You're offline."}
        message="Use Retry at the bottom of the screen to try again."
      />
    );
  } else if (hasLoaded && !error && rows.length === 0) {
    content = (
      <Placeholder
        variant="empty"
        anchor="top-third"
        icon="video"
        title={
          isSearchActive
            ? 'No channels match your search.'
            : activeFilterCount > 0
              ? 'No channels match your filters.'
              : 'No channels found.'
        }
      />
    );
  } else {
    content = (
      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <ChannelCard
            row={item}
            isFavorite={isFavoriteId(item.id)}
            onPress={handleChannelPress}
            onLongPress={handleLongPress}
          />
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
        onEndReached={() => hasMore && loadMore()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isLoadingMore || (hasMore && error) ? (
            <View style={styles.footer}>
              {isLoadingMore ? (
                <ActivityOrb size={22} />
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => loadMore()}
                  style={[
                    styles.loadMoreRetry,
                    {borderColor: colors.border.subtle},
                  ]}
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
  }

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
      <InternalHeader
        title="Live TV"
        rightAction={{
          icon: 'heartPulse',
          onPress: () => navigation.navigate('LiveTVFavoritesScreen'),
        }}
      />

      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder="Search channels…"
        />
      </View>

      <ActiveFilterChips
        filters={filters}
        onClear={id => setFilter(id, '')}
      />

      {content}

      <SectionFab
        accessibilityLabel="Filter channels"
        badgeCount={activeFilterCount}
        onPress={() => setSheetVisible(true)}
      />

      <FilterSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Filter channels"
        groups={[
          {
            id: 'category',
            title: 'Category',
            rows:
              tagsLoaded
                ? tags.categories.map(c => ({key: c.id, label: c.name}))
                : [],
          },
        ]}
        value={{category: filters.category ?? ''}}
        onChange={(groupId, key) => handleOptionChange(groupId as 'category', key)}
        onReset={resetFilters}
      />

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

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: spacing.xs,
  },
  chipText: {
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + 80,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loadMoreRetry: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
