import React, {useEffect, useMemo, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MOVIE_CATEGORIES} from '../../../constants/movieCategories';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {MovieCard} from './MovieCard';
import {MoviesDataProvider, useMoviesData} from './MoviesDataProvider';
import {MoviesFooter} from './MoviesFooter';
import {ListStates} from './ListStates';
import {createMoviesScreenStyles} from '../styles';
import type {SectionBrowseConfig, SectionRenderContext} from '../types';

export const MoviesContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createMoviesScreenStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
    data,
    refetch,
    loadMore,
    activeCategoryIds,
    activeSearchTerm,
    setActiveCategoryIds,
    setSearchTerm,
    isSearchActive,
    resolvingId,
    handleMoviePress,
  } = useMoviesData();
  const {offline} = ctx;

  // The active category selection comes from `ctx.options.filter`.
  // An empty selection means "All".
  const categoryIds = useMemo<readonly string[]>(
    () =>
      ctx.options.filter && ctx.options.filter.length > 0
        ? ctx.options.filter
        : ['all'],
    [ctx.options.filter],
  );

  // Push the active scope down to the provider whenever the
  // screen's category selection or search term changes. The
  // provider passes them to useMoviesScreen, which builds the
  // TanStack queryKey from them.
  useEffect(() => {
    setActiveCategoryIds(categoryIds);
  }, [categoryIds, setActiveCategoryIds]);

  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  const {items, numFound, hasLoaded, isLoading, isLoadingMore, error} = data;
  const reachedEnd =
    hasLoaded && !error && numFound > 0 && items.length >= numFound;

  const category = MOVIE_CATEGORIES.find(c => c.id === categoryIds[0]);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted || (!hasLoaded && isLoading)) {
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

  return (
    <View style={styles.sectionRoot}>
      <FlatList
        testID="section-MoviesScreen-list"
        style={styles.list}
        data={items}
        numColumns={2}
        keyExtractor={item => item.identifier}
        renderItem={({item, index}) => (
          <MovieCard
            item={item}
            placeholderImage={category?.image}
            onPress={handleMoviePress}
            isResolving={resolvingId === item.identifier}
            isLonelyItem={index === items.length - 1 && items.length % 2 !== 0}
          />
        )}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: insets.bottom + spacing.md},
        ]}
        ListEmptyComponent={
          !hasLoaded
            ? null
            : (
              <ListStates
                state={error ? 'error' : 'empty'}
                offline={offline}
                isSearchActive={isSearchActive}
                onRetry={refetch}
              />
            )
        }
        ListFooterComponent={
          <MoviesFooter
            isLoadingMore={isLoadingMore}
            hasLoaded={hasLoaded}
            error={error}
            reachedEnd={reachedEnd}
            onLoadMore={loadMore}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
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

export const renderMoviesContent: SectionBrowseConfig['renderContent'] = ctx => (
  <MoviesContent ctx={ctx} />
);

export {MoviesDataProvider};
