// ─── Standalone Radio Screen (v10.1 Wave 7) ────────────────────────────
// FAB-only, tab-less replacement for the legacy TabView-based screen.
// The shared section shell is untouched; this page owns its own
//   • SearchBar (search persists across filter changes)
//   • active-filter chip row (tap a chip to clear that filter)
//   • gold SectionFab → RadioOptionsSheet (Genre + Country + Language,
//     three simultaneous single-select groups)
//   • header right action (heart) → RadioFavoritesScreen
// Long-press → favorite / playlist / bookmark / share; press → AudioPlayer.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {
  useRadioBrowser,
  type RadioFilterId,
  type RadioFilters,
} from './hooks/useRadioBrowser';
import {
  RadioStationCard,
  toRow,
  type StationRow,
} from './components/RadioStationCard';
import {FilterSheet} from '../../components/sheets/FilterSheet/FilterSheet';
import {SectionFab} from '../sections/components/SectionFab';
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

type Props = RootStackScreenProps<'RadioScreen'>;

const PAGE_SIZE = 30;

/**
 * Radio's browse metadata items are sometimes plain strings and
 * sometimes {id, name} records (depending on the endpoint). Flatten
 * them into FilterSheet's uniform {key, label} row shape.
 */
function toRadioTagRow(t: unknown): {key: string; label: string} {
  return typeof t === 'string'
    ? {key: t, label: t}
    : {key: (t as {id: string}).id, label: (t as {name: string}).name};
}

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
              backgroundColor: colors.accent.goldDim,
              borderColor: colors.accent.gold,
            },
          ]}>
          <AppText
            variant="caption"
            style={[styles.chipText, {color: colors.accent.gold}]}>
            {label}
          </AppText>
          <SvgIcon name="close" size={12} color={colors.accent.gold} />
        </TouchableOpacity>
      ))}
    </View>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────

export const RadioScreenNew: React.FC<Props> = ({navigation, route}) => {
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
  const hasMore = rows.length > 0 && rows.length % PAGE_SIZE === 0;

  // ── Page-1 failure toast (with Retry) ──
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
          const station = items.find(s => s.stationuuid === row.id);
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
    [menuRow, items, isFavoriteId, removeFavorite, toggleFavorite, addBookmark, toast, haptics],
  );

  const handleOptionChange = useCallback(
    (id: RadioFilterId, key: string) => {
      setFilter(id, key);
      haptics.light();
    },
    [setFilter, haptics],
  );

  // ── Content states ──
  let content: React.ReactNode;
  if (!hasLoaded && isLoading) {
    content = (
      <Placeholder variant="loading" anchor="top-third" title="Loading stations…" />
    );
  } else if (!hasLoaded && !isLoading && error && rows.length === 0) {
    content = (
      <Placeholder
        variant="empty"
        anchor="top-third"
        icon="alertCircle"
        title={isOnline ? "Couldn't load stations." : "You're offline."}
        message="Use Retry at the bottom of the screen to try again."
      />
    );
  } else if (hasLoaded && !error && rows.length === 0) {
    content = (
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
    );
  } else {
    content = (
      <FlatList
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
  }

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

      <ActiveFilterChips
        filters={filters}
        onClear={id => setFilter(id, '')}
      />

      {content}

      <SectionFab
        onPress={() => setSheetVisible(true)}
        accessibilityLabel="Filter radio stations"
        badgeCount={activeFilterCount}
      />

      <FilterSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Filter radio stations"
        groups={[
          {
            id: 'genre',
            title: 'Genre',
            rows: tagsLoaded
              ? (tags.genres as unknown[]).map(toRadioTagRow)
              : [],
          },
          {
            id: 'country',
            title: 'Country',
            rows: tagsLoaded
              ? (tags.countries as unknown[]).map(toRadioTagRow)
              : [],
          },
          {
            id: 'language',
            title: 'Language',
            rows: tagsLoaded
              ? (tags.languages as unknown[]).map(toRadioTagRow)
              : [],
          },
        ]}
        value={{
          genre: filters.genre ?? '',
          country: filters.country ?? '',
          language: filters.language ?? '',
        }}
        onChange={(groupId, key) => handleOptionChange(groupId as RadioFilterId, key)}
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

// ─── Styles ───────────────────────────────────────────────────────────

const ItemSeparator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: {flex: 1},
  searchSection: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: {fontWeight: '600'},
  listContent: {padding: spacing.md, paddingBottom: spacing.xxl + 80},
  separator: {height: spacing.sm},
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
