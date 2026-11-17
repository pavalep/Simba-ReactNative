// ─── Standalone Radio Screen (v10.1 Wave 7) ────────────────────────────
// FAB-only, tab-less replacement for the legacy TabView-based screen.
// The shared section shell is untouched; this page owns its own
//   • SearchBar (search persists across filter changes)
//   • active-filter chip row (tap a chip to clear that filter)
//   • gold SectionFab → RadioOptionsSheet (Genre + Country + Language,
//     three simultaneous single-select groups)
//   • header right action (heart) → RadioFavoritesScreen
// Long-press → favorite / playlist / bookmark / share; press → AudioPlayer.
//
// THE GRAMMAR
// -----------
// This page is one of the surfaces that was never moved onto the shared
// `BrowseLayout`, so it keeps its own shell — but it now FOLLOWS the
// same nine-element grammar the Movies, Podcasts and Music pages follow
// (see `md/WAVE_B13_MUSIC_RADIO.md` §2). The gaps that were closed here:
//
//   • the filter rows now carry a real KEY (they were all `undefined`),
//     so the Genre / Country / Language filters work at all;
//   • a page-1 failure shows the house `ErrorState` with its retry
//     button, instead of an empty list with no message at all;
//   • the gutter is `spacing.lg` (16), the same as the shell's;
//   • the list's bottom padding follows the app's ONE bottom-chrome
//     rule, so it grows with the mini-player dock;
//   • the chip row is a stable callback, so its `React.memo` works.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import type {RootStackScreenProps} from '../../../navigation/types';
import {useRadioBrowser} from '../hooks/useRadioBrowser';
import {RadioStationCard, toRow, type StationRow} from './RadioStationCard';
import {toRadioTagRow} from '../related/stationRow';
import {FilterSheet} from '../../../components/sheets/FilterSheet/FilterSheet';
import {Fab, FAB_SIZE} from '../../../components/core/Fab/Fab';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useKeyboard} from '../../../hooks/useKeyboard';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../../components/core/AppText/AppText';
import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {ErrorState} from '../../../components/feedback/ErrorState/ErrorState';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {shareContent} from '../../../services/shareService';
import {useBookmarks} from '../../../features/bookmarks';
import {confirmBookmarkAdd} from '../../../features/bookmarks/confirmAdd';
import {useToast} from '../../../components/feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import { resolveStreamType, useResumeAwareLaunch} from '../../../infrastructure/player';
import {PlaylistSheet} from '../../../components/sheets/PlaylistSheet/PlaylistSheet';
import {OptionSheetDialog} from '../../../components/core/OptionSheetDialog/OptionSheetDialog';
import {styles} from '../styles';
import {BrowseFooter} from '../../_shared/BrowseListFooter';
import {BrowseLoadingState} from '../../_shared/BrowseLoadingState';
import type {
  RadioFilterId,
  RadioFilters,
} from '../types';
import type {RadioBrowseTag} from '../../../infrastructure/api/radioBrowser/adapter';

type Props = RootStackScreenProps<'RadioScreen'>;

/**
 * Radio's browse metadata items are the API's `{name, stationCount}`
 * records, and the mapping to a filter sheet row lives with the data —
 * see `related/stationRow.ts`.
 */

// ─── Active-filter chip row ────────────────────────────────────────────
// Feedback + quick-clear: one gold pill per active filter; tap clears it.

const ActiveFilterChips: React.FC<{
  filters: RadioFilters;
  onClear: (id: RadioFilterId) => void;
}> = React.memo(({filters, onClear}) => {
  const {colors} = useTheme();
  const entries = (
    [
      ['genre', filters.genre],
      ['country', filters.country],
      ['language', filters.language],
    ] as Array<[RadioFilterId, string | null]>
  ).filter((entry): entry is [RadioFilterId, string] => !!entry[1]);

  if (entries.length === 0) return null;

  return (
    <View style={styles.chipRow}>
      {entries.map(([id, label]) => (
        <TouchableOpacity
          key={id}
          activeOpacity={0.8}
          onPress={() => onClear(id)}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${label} filter`}
          style={[
            styles.chip,
            {
              // The shared `FilterChips` chip's ACTIVE state: a gold fill
              // with inverse text and a gold border. This chip used to be
              // gold-dim with gold text — a different language from every
              // other browse surface's strip. The family now speaks ONE
              // chip language.
              backgroundColor: colors.accent.gold,
              borderColor: colors.accent.gold,
            },
          ]}>
          <AppText
            variant="caption"
            style={[styles.chipText, {color: colors.text.inverse}]}>
            {label}
          </AppText>
          <SvgIcon name="close" size={12} color={colors.text.inverse} />
        </TouchableOpacity>
      ))}
    </View>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────

export const RadioScreen: React.FC<Props> = ({navigation, route}) => {
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
  const {openPlayer} = useResumeAwareLaunch();
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
    hasMore,
    tags,
    tagsReady,
    isFavoriteId,
    toggleFavorite,
  } = useRadioBrowser(route.params?.initialTag);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [menuRow, setMenuRow] = useState<StationRow | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<
    React.ComponentProps<typeof PlaylistSheet>['currentItem'] | null
  >(null);

  const scope = getScope();
  const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;
  const rows = useMemo<StationRow[]>(() => items.map(toRow), [items]);

  // ── Page-1 failure (with Retry) ──
  const lastShownErrorRef = useRef<string | null>(null);
  useEffect(() => {
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
            retry();
          },
        },
      });
    } else if (!currentError) {
      lastShownErrorRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded, isLoading, error, isOnline]);

  const handleStationPress = useCallback(
    (row: StationRow) => {
      openPlayer({
        uri: row.url,
        title: row.name,
        type: resolveStreamType('radio'),
        // The KIND and the LANE, not just the lane.
        //
        // `resolveStreamType('radio')` is the LANE ('audio'), and the seam
        // defaults the kind to the lane — so the station was recorded in
        // Recently Played as type 'audio' instead of 'radio', even though
        // the app HAS a label for it (`src/types/media.ts`: radio → 'Radio').
        mediaKind: 'radio',
        mediaLane: 'audio',
        ...(row.image ? {thumbnailPath: row.image} : {}),
      });
    },
    [openPlayer],
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
          const station = items.find(s => s.id === row.id);
          // The station is always in `items` — `rows` is derived from it —
          // so the old `else { removeFavorite(...) }` branch was
          // unreachable, and the hook's `removeFavorite` had no live
          // caller at all.
          if (station) {
            const wasFavorite = isFavoriteId(row.id);
            toggleFavorite(station);
            toast.show(wasFavorite ? 'Removed from favorites' : 'Saved to favorites');
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
            provider: 'radio',
            mediaType: 'audio',
            // The KIND. Without it a radio station was filed as
            // `type: 'video'` by the playlist/bookmark path that reads
            // the kind back.
            type: 'radio',
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
            mediaType: 'audio' as const,
            source: 'api' as const,
            provider: 'radio',
            type: 'radio' as const,
          };
          // The cap is the store's business, and the confirmation is ONE
          // owner's. The result used to be discarded here, so adding a
          // bookmark past the cap did NOTHING and still toasted
          // "Station bookmarked".
          confirmBookmarkAdd(
            addBookmark(input),
            row.name,
            addBookmark,
            () => toast.show('Station bookmarked'),
          );
          break;
        }
        case 'share':
          // ONE share target for the whole feature, and the params the
          // linking config actually parses: `SongScreen` parses
          // `fileUri` and `title` (`navigation/linking.ts`).
          // The old code sent `fileTitle` — not a declared param — and
          // the favourites screen sent `route: 'RadioScreen'`, whose
          // linking config carried only `initialTab`, so the station was
          // lost entirely.
          shareContent({
            route: 'SongScreen',
            params: {fileUri: row.url, title: row.name, source: 'radio'},
            title: row.name,
            subtitle: row.subtitle,
          });
          break;
      }
      setMenuRow(null);
    },
    [menuRow, items, isFavoriteId, toggleFavorite, addBookmark, toast, haptics],
  );

  const handleOptionChange = useCallback(
    (id: RadioFilterId, key: string) => {
      setFilter(id, key);
      haptics.light();
    },
    [setFilter, haptics],
  );

  // A STABLE callback — the chip row is memoized, and an inline arrow
  // meant the memo never hit.
  const handleClearFilter = useCallback(
    (id: RadioFilterId) => setFilter(id, ''),
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
      <BrowseLoadingState label="Loading stations…" />
    ) : listState === 'error' ? (
      // The house error card, with its OWN retry button.
      //
      // It used to be a `Placeholder` whose message said "Use Retry at the
      // bottom of the screen to try again." — there is no bottom retry,
      // and the branch was unreachable besides: `hasLoaded` was true when
      // the first page failed, so a page-1 failure fell through every
      // branch and rendered a BLANK LIST.
      <ErrorState
        title={isOnline ? 'Could not load stations' : "You're offline"}
        message={
          isOnline
            ? 'We could not reach the station directory.'
            : 'Check your connection and try again.'
        }
        errorDetail={error ?? undefined}
        onRetry={retry}
      />
    ) : listState === 'empty' ? (
      <Placeholder
        variant="empty"
        anchor="top-third"
        icon="headphones"
        title={
          isSearchActive
            ? 'No stations match your search.'
            : activeFilterCount > 0
              ? 'No stations match your filters.'
              : 'No stations found.'
        }
      />
    ) : null;

  const content = (
    <FlatList
      testID="section-RadioScreen-list"
      data={rows}
      keyExtractor={item => item.id}
      renderItem={({item}) => (
        <RadioStationCard
          row={item}
          isFavorite={isFavoriteId(item.id)}
          onPress={handleStationPress}
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
          error={error}
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
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader
        title="Live Radio"
        rightAction={{
          icon: 'heartPulse',
          onPress: () => navigation.navigate('RadioFavoritesScreen'),
          // A button that carries only an icon has no name, and a
          // screen-reader user hears "button" for it.
          accessibilityLabel: 'Radio favorites',
        }}
      />

      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder="Search stations…"
        />
      </View>

      <ActiveFilterChips filters={filters} onClear={handleClearFilter} />

      {content}

      <Fab
        icon="sliders"
        onPress={() => setSheetVisible(true)}
        accessibilityLabel="Filter radio stations"
        badgeCount={activeFilterCount}
        visible={!keyboardVisible}
      />

      <FilterSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        groups={[
          {
            id: 'genre',
            title: 'Genre',
            // Each group gates on ITS OWN query. One failing tag endpoint
            // used to empty all three groups, with no error and no retry.
            rows: tagsReady.genres ? tags.genres.map(toRadioTagRow) : [],
          },
          {
            id: 'country',
            title: 'Country',
            rows: tagsReady.countries ? tags.countries.map(toRadioTagRow) : [],
          },
          {
            id: 'language',
            title: 'Language',
            rows: tagsReady.languages ? tags.languages.map(toRadioTagRow) : [],
          },
        ]}
        value={{
          genre: filters.genre ? [filters.genre] : [],
          country: filters.country ? [filters.country] : [],
          language: filters.language ? [filters.language] : [],
        }}
        onChange={(groupId, keys) =>
          handleOptionChange(groupId as RadioFilterId, keys[0] ?? '')
        }
        onReset={resetFilters}
      />

      <OptionSheetDialog
        visible={menuVisible}
        title={menuRow?.name ?? 'Station Options'}
        options={[
          {
            label: isFavoriteId(menuRow?.id ?? '') ? 'Remove Favorite' : 'Add to Favorites',
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
        currentItem={sheetItem ?? {fileUri: '', title: '', duration: 0}}
      />
    </View>
  );
};

// ─── List helpers ───────────────────────────────────────────────────────

const ItemSeparator = () => <View style={styles.separator} />;
