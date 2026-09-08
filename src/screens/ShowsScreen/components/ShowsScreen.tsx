// ─── TV Shows Browser Screen ───────────────────────────────────────────
// V18.11.5: converted from the v3-v9 3-tab pattern
// (search / today / browse) to the v10+ "single content stream +
// FAB" pattern.
//
// - Search: a single FlatList of TVMaze search results.
// - "Today" rail: TVMaze's `/schedule` deduped by show id,
//   surfaced as a small rail at the top (or as the only content
//     when no search/browse is active).
// - Browse: TVMaze's paginated `/shows`.
//
// UX decision (V18.11.5): the "Today" data IS fetched (so a future
// "Airing Today" rail can land in this same screen) but the
// source toggle is just search/browse for now. The rail is shown
// above the search/browse list when both are populated.

import React, {useCallback, useEffect, useMemo} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';

import type {RootStackScreenProps} from '../../../navigation/types';
import {useShowsScreen} from '../hooks/useShowsScreen';

import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../../components/core/AppText/AppText';
import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {FilterChips} from '../../../components/utility/FilterChips';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {useToast} from '../../../components/feedback/Toast';
import type {TVMazeShow} from '../../../types/api';

type Props = RootStackScreenProps<'ShowsScreen'>;

const SOURCE_TOGGLE: Array<{key: 'search' | 'browse'; label: string}> = [
  {key: 'search', label: 'Search'},
  {key: 'browse', label: 'Browse'},
];

export const ShowsScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const {initialTab, initialGenre} = route.params ?? {};

  const {
    searchTerm,
    setSearchTerm,
    isSearchActive,
    source,
    setSource,
    items,
    hasLoaded,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
    todaysItems,
    todaysLoading,
    todaysError,
    retryTodays,
    isOnline,
    refreshing,
    handleRefresh,
  } = useShowsScreen(initialTab, initialGenre);

  // Toast on page-1 failure
  useEffect(() => {
    if (!hasLoaded && !isLoading && !!error) {
      toast.show(
        isOnline ? "Couldn't load shows." : 'You are offline.',
        'error',
        {
          duration: 8000,
          action: {label: 'Retry', onPress: () => refetch()},
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded, isLoading, error, isOnline]);

  // Toast on today's rail failure
  useEffect(() => {
    if (todaysItems.length === 0 && !todaysLoading && !!todaysError) {
      // Silent — today's rail is non-critical; the empty state
      // is just a missing rail, not an error.
    }
  }, [todaysItems.length, todaysLoading, todaysError]);

  const handleShowPress = useCallback(
    (show: TVMazeShow) => {
      navigation.navigate('ShowDetail', {
        showId: show.id,
        showName: show.name,
      });
    },
    [navigation],
  );

  const rows = items;

  const showEmpty = hasLoaded && !error && rows.length === 0 && !isSearchActive && source === 'browse';
  const showSearchEmpty = hasLoaded && !error && rows.length === 0 && isSearchActive;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background.primary,
        paddingTop: insets.top,
      }}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="TV Shows" />

      <View style={{paddingHorizontal: 16, paddingVertical: 12}}>
        <SearchBar
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search shows…"
        />
        <FilterChips
          items={SOURCE_TOGGLE}
          selectedKey={source}
          onSelect={key => {
            // When toggling to "search" via the chip, the term is
            // already the source of truth. Toggling to "browse" is
            // allowed even with a term set (term still wins).
            setSource(key as 'search' | 'browse');
          }}
        />
        {todaysItems.length > 0 && !isSearchActive ? (
          <View style={{marginTop: 8}}>
            <AppText variant="overline" color="accent" style={{marginBottom: 4}}>
              Airing Today
            </AppText>
            <FlatList
              data={todaysItems}
              keyExtractor={item => `today-${item.id}`}
              renderItem={({item}) => (
                <TouchableOpacity
                  onPress={() => handleShowPress(item)}
                  style={{
                    padding: 12,
                    backgroundColor: colors.background.elevated,
                    borderRadius: 8,
                    marginBottom: 6,
                  }}>
                  <AppText variant="bodySmall" color="primary" numberOfLines={1}>
                    {item.name}
                  </AppText>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          </View>
        ) : null}
      </View>

      {!hasLoaded && isLoading ? (
        <Placeholder
          variant="loading"
          anchor="top-third"
          title="Loading shows…"
        />
      ) : showSearchEmpty ? (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="search"
          title="No shows match your search."
        />
      ) : showEmpty ? (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="video"
          title="No shows found."
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => `show-${item.id}`}
          renderItem={({item}) => (
            <TouchableOpacity
              onPress={() => handleShowPress(item)}
              style={{
                padding: 12,
                backgroundColor: colors.background.elevated,
                borderRadius: 8,
                marginHorizontal: 16,
                marginBottom: 6,
              }}>
              <AppText variant="bodySmall" color="primary" numberOfLines={1}>
                {item.name}
              </AppText>
            </TouchableOpacity>
          )}
          contentContainerStyle={{paddingBottom: insets.bottom + 56 + 12}}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasNextPage && !isLoadingMore) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent.gold}
              colors={[colors.accent.gold]}
            />
          }
        />
      )}
    </View>
  );
};
