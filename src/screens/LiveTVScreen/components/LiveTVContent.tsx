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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import type {RootStackScreenProps} from '../../../navigation/types';
import {useLiveTVBrowser} from '../hooks/useLiveTVBrowser';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../../components/core/AppText/AppText';
import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {ErrorState} from '../../../components/feedback/ErrorState/ErrorState';
import {shareContent} from '../../../services/shareService';
import {useBookmarks} from '../../../features/bookmarks';
import {confirmBookmarkAdd} from '../../../features/bookmarks/confirmAdd';
import {useToast} from '../../../components/feedback/Toast';
import {resolveStreamType, useResumeAwareLaunch} from '../../../infrastructure/player';
import {useHaptics} from '../../../hooks/useHaptics';
import {PlaylistSheet} from '../../../components/sheets/PlaylistSheet/PlaylistSheet';
import {OptionSheetDialog} from '../../../components/core/OptionSheetDialog/OptionSheetDialog';
import {styles} from '../styles';
import {Fab, FAB_SIZE} from '../../../components/core/Fab/Fab';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useKeyboard} from '../../../hooks/useKeyboard';
import {ChannelCard, toRow} from './ChannelCard';
import {FilterSheet} from '../../../components/sheets/FilterSheet/FilterSheet';
import {BrowseFooter} from '../../_shared/BrowseListFooter';
import {BrowseLoadingState} from '../../_shared/BrowseLoadingState';
import {spacing} from '../../../theme/tokens';
import type {
  ActiveFilterChipsProps,
  ChannelRow,
} from '../types';

type Props = RootStackScreenProps<'LiveTVScreen'>;

// ─── Active-filter chip row ───────────────────────────────────────────

const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = React.memo(
  ({filters, label, onClear}) => {
    const {colors} = useTheme();
    if (!filters.category) return null;
    return (
      <View style={styles.chipRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onClear('category')}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${label} filter`}
          style={[
            styles.chip,
            {
              // The shared `FilterChips` chip's ACTIVE state: a gold fill
              // with inverse text and a gold border — the family now
              // speaks ONE chip language.
              backgroundColor: colors.accent.gold,
              borderColor: colors.accent.gold,
            },
          ]}>
          <AppText
            variant="caption"
            style={[styles.chipText, {color: colors.text.inverse}]}>
            {label}
          </AppText>
          <SvgIcon
            name="close"
            size={12}
            color={colors.text.inverse}
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
      style={[styles.separator, {backgroundColor: colors.background.primary}]}
    />
  );
};

// ─── Screen ───────────────────────────────────────────────────────────

export const LiveTVScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  // The app's ONE bottom-chrome rule: the safe area, or the mini-player
  // dock if one is up. The FAB's own height goes on top so the last row
  // clears the BUTTON.
  const bottomChromeInset = useBottomChromeInset();
  // The button steps aside while the keyboard is up — the sheet it
  // opens needs the room, and a floating button over the keyboard is
  // a control nobody can reach.
  const {keyboardVisible} = useKeyboard();
  const toast = useToast();
  const haptics = useHaptics();
  const {add: addBookmark} = useBookmarks();

  const {
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    categoryName,
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
    hasMore: scopeHasMore,
    isFavoriteId,
    toggleFavorite,
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
  // The hook owns `hasMore` — it is the client's own count against the
  // page size. The screen used to re-derive it from a SECOND copy of
  // PAGE_SIZE, which says "maybe more" even when every channel is
  // already loaded, and the footer's "tap to retry" then rendered and
  // did nothing.
  const hasMore = scopeHasMore;

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

  const {openPlayer} = useResumeAwareLaunch();

  const handleChannelPress = useCallback(
    (row: ChannelRow) => {
      openPlayer({
        uri: row.url,
        title: row.name,
        // The LANE comes from the app's own mapping, not from a literal —
        // the browse screen used a raw 'video' while its own favourites
        // screen used `resolveStreamType('live-tv')`, so the same channel
        // was labelled differently depending on which screen you tapped
        // it from.
        type: resolveStreamType('live-tv'),
        // The KIND and the LANE. Without the kind, the seam defaults it
        // to the lane and the channel is recorded in Recently Played as
        // a plain video instead of 'live-tv' — and the app HAS a label
        // for it (`src/types/media.ts`: 'live-tv' → 'Live TV').
        mediaKind: 'live-tv',
        mediaLane: 'video',
        ...(row.image ? {thumbnailPath: row.image} : {}),
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
          const channel = items.find(c => c.id === row.id);
          const wasFavorite = isFavoriteId(row.id);
          // The channel is always in `items` — `rows` is derived from it —
          // so the old `else { removeFavorite(...) }` branch was
          // unreachable.
          if (channel) {
            toggleFavorite(channel);
            toast.show(
              wasFavorite
                ? 'Removed from favorites'
                : 'Saved to favorites',
            );
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
            source: 'api',
            provider: 'iptv',
            mediaType: 'video',
            // The KIND. Without it a TV channel was filed as `type:
            // 'video'` by the playlist/bookmark path that reads the kind
            // back.
            type: 'live-tv',
          });
          break;
        case 'bookmark': {
          const input = {
            fileUri: row.url,
            title: row.name,
            position: 0,
            duration: 0,
            label: '',
            thumbnailPath: row.image || undefined,
            mediaType: 'video' as const,
            source: 'api' as const,
            provider: 'iptv',
            type: 'live-tv' as const,
          };
          // The cap is the store's business, and the confirmation is ONE
          // owner's. The result used to be discarded here, so adding a
          // bookmark past the cap did NOTHING and still toasted
          // "Channel bookmarked".
          confirmBookmarkAdd(
            addBookmark(input),
            row.name,
            addBookmark,
            () => toast.show('Channel bookmarked'),
          );
          break;
        }
        case 'share':
          // ONE share target for the whole feature, and the params the
          // linking config actually parses: `SongScreen` parses
          // `fileUri` and `title` (`navigation/linking.ts:130-138`).
          //
          // This sent `route: 'LiveTVScreen'` with `fileUri`/`fileTitle` —
          // and the Live TV path is `tv/:categoryId?`, which parses
          // NEITHER. The shared link became `simbaplayer://tv?fileUri=…`
          // and the recipient landed on the Live TV browser with no
          // channel at all. The Radio twin of this row was fixed to
          // `SongScreen` in Wave B13; this is the same fix.
          shareContent({
            route: 'SongScreen',
            params: {fileUri: row.url, title: row.name, source: 'iptv'},
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

  // A STABLE callback — the chip row is memoized, and an inline arrow
  // meant the memo never hit.
  const handleClearFilter = useCallback(
    (id: 'category') => setFilter(id, ''),
    [setFilter],
  );

  // ── Content states ──
  //
  // The list is ALWAYS mounted and the states live INSIDE it — the way
  // Music, Movies and Podcasts do it. It used to be REPLACED by the
  // state, which meant there was no list, and so no pull-to-refresh,
  // while the first page was loading — and none after a failed first
  // load either. The gesture the user reaches for was not there.
  const listState: 'loading' | 'error' | 'empty' | 'ready' =
    !hasLoaded && isLoading
      ? 'loading'
      : !!error && rows.length === 0
        ? 'error'
        : rows.length === 0
          ? 'empty'
          : 'ready';

  const listEmptyState =
    listState === 'loading' ? (
      // The browse family's ONE loading component.
      <BrowseLoadingState label="Loading channels…" />
    ) : listState === 'error' ? (
      // The house error card, with its OWN retry button.
      //
      // It used to be a `Placeholder` whose message said "Use Retry at the
      // bottom of the screen to try again." — there is no bottom retry —
      // and the branch was unreachable besides: `hasLoaded` was true when
      // the first page failed, so a page-1 failure fell through every
      // branch and rendered a BLANK LIST.
      <ErrorState
        title={isOnline ? 'Could not load channels' : "You're offline"}
        message={
          isOnline
            ? 'We could not reach the channel directory.'
            : 'Check your connection and try again.'
        }
        errorDetail={error ?? undefined}
        onRetry={retry}
      />
    ) : listState === 'empty' ? (
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
    ) : null;

  const content = (
    <FlatList
      testID="section-LiveTVScreen-list"
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
      contentContainerStyle={[
        styles.listContent,
        {paddingBottom: bottomChromeInset + FAB_SIZE + spacing.md},
        // The state slot fills the viewport, so the error card and the
        // empty state have real height to anchor against.
        listState === 'ready' ? null : styles.listSlotGrow,
      ]}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={ItemSeparator}
      ListEmptyComponent={listEmptyState}
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
        <BrowseFooter
          isLoadingMore={isLoadingMore}
          hasLoaded={hasLoaded}
          // The catalogue is already IN MEMORY — there is no next page to
          // fail, so the footer's "couldn't load more" branch would be
          // a lie here. The failure belongs to the error card above,
          // which owns its own Retry.
          error={null}
          reachedEnd={!hasMore}
          shown={rows.length}
          onLoadMore={loadMore}
        />
      }
      windowSize={5}
      maxToRenderPerBatch={10}
    />
  );

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
          // A button that carries only an icon has no name, and a
          // screen-reader user hears "button" for it.
          accessibilityLabel: 'Live TV favorites',
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
        label={categoryName}
        onClear={handleClearFilter}
      />

      {content}

      <Fab
        icon="sliders"
        accessibilityLabel="Filter channels"
        badgeCount={activeFilterCount}
        onPress={() => setSheetVisible(true)}
        visible={!keyboardVisible}
      />

      <FilterSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        groups={[
          {
            id: 'category',
            title: 'Category',
            // The row's KEY is the category's ID — the source's own slug,
            // the same thing the deep link carries and the same thing the
            // channel's own group-title is. The label is the NAME. The
            // filter used to be keyed by the name, so a deep link's id
            // had to be translated into a name before it could match
            // anything.
            rows:
              tagsLoaded
                ? tags.categories.map(c => ({key: c.id, label: c.name}))
                : [],
          },
        ]}
        value={{category: filters.category ? [filters.category] : []}}
        onChange={(groupId, keys) =>
          handleOptionChange(groupId as 'category', keys[0] ?? '')
        }
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

