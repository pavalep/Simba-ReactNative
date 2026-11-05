import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {FAB_SIZE} from '../../../components/core/Fab/Fab';
import {MediaActionsSheet} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useQueueActions} from '../../../components/sheets/MediaActionsSheet/useQueueActions';
import {PlaylistSheet, type PlaylistSheetProps} from '../../../components/sheets/PlaylistSheet';
import {useToast} from '../../../components/feedback/Toast';
import {resolveInternetArchiveVideoDetails} from '../../../infrastructure/api/internetArchive/adapter';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {MOVIE_CATEGORIES} from '../../../constants/movieCategories';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {MovieCard} from './MovieCard';
import {MoviesDataProvider, useMoviesData} from './MoviesDataProvider';
import {MoviesFooter} from './MoviesFooter';
import {ListStates} from './ListStates';
import {createMoviesScreenStyles} from '../styles';
import type {InternetArchiveVideoResult} from '../../../types/api';
import type {SectionBrowseConfig, SectionRenderContext} from '../types';

export const MoviesContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createMoviesScreenStyles(colors), [colors]);
  // The app's ONE bottom-chrome rule: the safe area, or the mini-player
  // dock if one is up, plus a spacing step. The FAB's own height goes
  // on top so the last row clears the BUTTON.
  const bottomChromeInset = useBottomChromeInset();
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

  // ── Phase 6 step 33: the standard media menu on a movie card ───────
  // A long press opens `MediaActionsSheet` — the app's ONE media menu
  // (58.4/58.5). Its "Add to Playlist" row opens `PlaylistSheet` with
  // the movie, so a film can finally live in a playlist.
  const toast = useToast();
  const {playNext, addToQueue} = useQueueActions();
  const [menuMovie, setMenuMovie] = useState<InternetArchiveVideoResult | null>(null);
  const [sheetItem, setSheetItem] = useState<PlaylistSheetProps['currentItem'] | null>(null);

  /**
   * The IA search result carries the collection DIRECTORY url
   * (`https://archive.org/download/{id}/`), not a file. A queue entry and
   * a playlist entry both PLAY their uri, so both need the RESOLVED file
   * url — the same resolution the press path performs. The adapter owns
   * the resolution; this only surfaces its two failures as toasts.
   */
  const resolvePlayableUrl = useCallback(
    async (movie: InternetArchiveVideoResult): Promise<string | null> => {
      try {
        const details = await resolveInternetArchiveVideoDetails(movie.identifier);
        if (!details || !details.streamingUrl || details.streamingUrl.endsWith('/')) {
          toast.show(
            'No Video File — this item does not have a playable video file. Please try a different movie.',
            'error',
            {duration: 6000},
          );
          return null;
        }
        return details.streamingUrl;
      } catch (err) {
        const detail =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to fetch the video file. Please try again.';
        toast.show(`Unable to Load — ${detail}`, 'error', {duration: 6000});
        return null;
      }
    },
    [toast],
  );

  const handleMovieLongPress = useCallback(
    (identifier: string) => {
      const movie = items.find(candidate => candidate.identifier === identifier);
      if (!movie) {
        return;
      }
      setMenuMovie(movie);
    },
    [items],
  );

  const handleMenuAction = useCallback(
    async (
      action: 'play-next' | 'add-queue' | 'add-playlist',
      movie: InternetArchiveVideoResult,
    ) => {
      const url = await resolvePlayableUrl(movie);
      if (!url) {
        return;
      }
      // The movie is a VIDEO item: `type: 'movie'` + `mediaType: 'video'`.
      // That truthful pair is what lets the playlist rule offer the video
      // playlists and refuse the audio ones.
      const queueItem = {
        uri: url,
        title: movie.title,
        duration: movie.duration,
        source: 'api' as const,
        provider: 'internetArchive',
        type: 'movie' as const,
        mediaType: 'video' as const,
      };
      if (action === 'play-next') {
        playNext(queueItem);
        return;
      }
      if (action === 'add-queue') {
        addToQueue(queueItem);
        return;
      }
      setSheetItem({
        fileUri: url,
        title: movie.title,
        duration: movie.duration,
        artist: movie.creator || undefined,
        thumbnailPath: movie.imageUrl || undefined,
        source: 'api',
        provider: 'internetArchive',
        type: 'movie',
        mediaType: 'video',
      });
    },
    [addToQueue, playNext, resolvePlayableUrl],
  );

  const menuActions = useMemo(() => {
    const movie = menuMovie;
    if (!movie) {
      return [];
    }
    return [
      {
        label: 'Play Next',
        icon: 'skipForward' as const,
        onPress: async () => {
          await handleMenuAction('play-next', movie);
        },
      },
      {
        label: 'Add to Queue',
        icon: 'list' as const,
        onPress: async () => {
          await handleMenuAction('add-queue', movie);
        },
      },
      {
        label: 'Add to Playlist',
        icon: 'listMusic' as const,
        onPress: async () => {
          await handleMenuAction('add-playlist', movie);
        },
      },
    ];
  }, [handleMenuAction, menuMovie]);

  // The two sheets render in BOTH branches below: a long press can only
  // happen while the list is up, but a scope change must not unmount an
  // open sheet mid-gesture.
  const sheets = (
    <>
      <MediaActionsSheet
        visible={menuMovie !== null}
        onClose={() => setMenuMovie(null)}
        title={menuMovie?.title ?? ''}
        actions={menuActions}
      />
      <PlaylistSheet
        visible={sheetItem !== null}
        onClose={() => setSheetItem(null)}
        currentItem={sheetItem ?? {fileUri: '', title: '', duration: 0}}
      />
    </>
  );

  if (!hasMounted || (!hasLoaded && isLoading)) {
    return (
      <View style={styles.sectionRoot}>
        <ListStates
          state="loading"
          offline={offline}
          isSearchActive={isSearchActive}
          onRetry={() => {}}
        />
        {sheets}
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
            onLongPress={handleMovieLongPress}
            isResolving={resolvingId === item.identifier}
            isLonelyItem={index === items.length - 1 && items.length % 2 !== 0}
          />
        )}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: bottomChromeInset + FAB_SIZE + spacing.md},
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
                errorMessage={error}
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
      {sheets}
    </View>
  );
};

export const renderMoviesContent: SectionBrowseConfig['renderContent'] = ctx => (
  <MoviesContent ctx={ctx} />
);

export {MoviesDataProvider};
