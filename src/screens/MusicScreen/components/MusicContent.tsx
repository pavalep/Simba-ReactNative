import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {MUSIC_CATEGORIES} from '../../../constants/musicCategories';
import {JAMENDO_GENRES} from '../hooks/useMusicScreen';
import {useMusicData} from './MusicDataProvider';
import {TrackCard} from './TrackCard';
import {MusicFooter} from './MusicFooter';
import {ListStates} from './ListStates';
import {createMusicScreenStyles} from '../styles';
import type {SectionRenderContext} from '../types';

/** Capitalized genre label for copy (for example, "no Rock tracks found"). */
function genreLabel(genre: string): string {
  const match = JAMENDO_GENRES.find(g => g === genre);
  return match ? match.charAt(0).toUpperCase() + match.slice(1) : genre;
}

/**
 * Owns the Music data stream and its single virtualized list. The screen
 * entry point remains responsible only for route/config/provider composition.
 *
 * V18.3.3: this component used to call `getScope(genre)`, `ensureLoaded
 * (genre)`, `loadMore(genre)`, etc. on the per-scope cache. The V18 hook
 * returns a single active scope's data; switching scope = setActiveGenre,
 * the queryKey changes, TanStack re-fetches or returns cache.
 */
export const MusicContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createMusicScreenStyles(), []);
  const insets = useSafeAreaInsets();
  const {
    items,
    hasLoaded,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    setActiveGenre,
    setSearchTerm,
    fetchNextPage,
    refetch,
    isSearchActive,
    handleTrackPress,
  } = useMusicData();
  const {offline} = ctx;

  // The section shell owns the selected filter; Music is single-select.
  const rawFilter = ctx.options.filter;
  const genre = Array.isArray(rawFilter)
    ? (rawFilter[0] ?? '')
    : (rawFilter ?? '');

  // Keep the fetch scope keyed by the shell's debounced search term.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Sync the FAB filter → the hook's active scope. The queryKey
  // includes `activeGenre`, so changing it re-points the query (or
  // returns the cached result if the user has visited this scope).
  useEffect(() => {
    setActiveGenre(genre);
  }, [genre, setActiveGenre]);

  const userDraggedRef = useRef(false);
  const listState: 'loading' | 'error' | 'empty' | undefined =
    !hasLoaded && isLoading
      ? 'loading'
      : !!error && items.length === 0
      ? 'error'
      : !error && items.length === 0
      ? 'empty'
      : undefined;

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  const showLoadingEarly = !hasMounted || (!hasLoaded && isLoading);

  if (showLoadingEarly) {
    return (
      <View style={styles.sectionRoot}>
        <ListStates
          state="loading"
          offline={offline}
          isSearchActive={isSearchActive}
          onRetry={() => {}}
        />
      </View>
    );
  }

  const activeCategory = MUSIC_CATEGORIES.find(c => String(c.id) === genre);
  const emptyGenreLabel =
    activeCategory?.name ?? (genre ? genreLabel(genre) : undefined);

  return (
    <View style={styles.sectionRoot}>
      <FlatList
        testID="section-MusicScreen-list"
        style={styles.list}
        numColumns={1}
        data={items}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <TrackCard item={item} onPress={handleTrackPress} />
        )}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: insets.bottom + spacing.lg + 56 + spacing.md},
          listState ? styles.listSlotGrow : null,
        ]}
        ListEmptyComponent={
          listState ? (
            <ListStates
              state={listState}
              offline={offline}
              isSearchActive={isSearchActive}
              genreLabel={emptyGenreLabel}
              error={error}
              onRetry={refetch}
            />
          ) : null
        }
        ListFooterComponent={
          <MusicFooter
            isLoadingMore={isLoadingMore}
            hasLoaded={hasLoaded}
            error={error}
            onLoadMore={fetchNextPage}
          />
        }
        onScrollBeginDrag={() => {
          userDraggedRef.current = true;
        }}
        onEndReached={() => {
          if (!userDraggedRef.current) return;
          if (hasNextPage && !isLoadingMore) fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && hasLoaded}
            onRefresh={refetch}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
      />
    </View>
  );
};
