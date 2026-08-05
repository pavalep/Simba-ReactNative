// ─── Movie Browser Screen ──────────────────────────────────────────────
// Phase 3 formula: search above a react-native-tab-view category tab bar.
//   • each category is a lazily-mounted TabView scene (native pager)
//   • every (category, searchTerm) scope is cached independently —
//     toggling tabs never refetches or clears already-loaded data
//   • each grid paginates via onEndReached (infinite scroll)
// Tap a category tab → see results grid → tap a movie → play.

import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {TabView, TabBar, type SceneRendererProps, type Route} from 'react-native-tab-view';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {useMoviesScreen, type MovieScopeState} from './hooks/useMoviesScreen';
import {MOVIE_CATEGORIES} from '../../constants/movieCategories';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {resolveInternetArchiveVideoDetails} from '../../services/api/internetArchiveService';
import {useToast} from '../../components/feedback/Toast';
import type {InternetArchiveVideoResult} from '../../types/api';

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
}

// ─── Movie Card ─────────────────────────────────────────────────────────

interface MovieCardProps {
  item: InternetArchiveVideoResult;
  onPress: (item: InternetArchiveVideoResult) => void;
  isResolving?: boolean;
}

const MovieCard: React.FC<MovieCardProps> = React.memo(
  ({item, onPress, isResolving}) => {
    const {colors} = useTheme();
    // Local "image failed" state so we can fall back to the placeholder
    // instead of the broken-image icon. `imageUrl` comes from the IA
    // search API with a fallback to `https://archive.org/services/img/{id}`
    // (verified to return a 200 image/jpeg for every item).
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = !!item.imageUrl && !imageFailed;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(item)}
        disabled={isResolving}
        accessibilityRole="button"
        style={styles.movieCard}>
        <View
          style={[
            styles.thumbnailWrap,
            {backgroundColor: colors.background.elevated},
          ]}>
          {/* FastImage — explicit width/height style is required, see
              styles.thumbnail (absoluteFillObject was rendering 0×0). */}
          {showImage ? (
            <FastImage
              source={{uri: item.imageUrl, priority: FastImage.priority.normal}}
              style={styles.thumbnail}
              resizeMode={FastImage.resizeMode.cover}
              onError={() => setImageFailed(true)}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <SvgIcon name="video" size={24} color={colors.accent.goldDim} />
            </View>
          )}
          {/* Resolving overlay — shows while we fetch the real file URL */}
          {isResolving && (
            <View
              style={[
                styles.thumbnailWrap,
                styles.resolvingOverlay,
                {backgroundColor: 'rgba(0,0,0,0.35)'},
              ]}>
              <ActivityOrb size={36} />
            </View>
          )}
          {/* Duration badge */}
          {item.duration > 0 && (
            <View
              style={[
                styles.durationBadge,
                {backgroundColor: colors.background.scrimMid},
              ]}>
              <AppText
                variant="caption"
                style={[styles.durationText, {color: colors.text.bright}]}>
                {formatDuration(item.duration)}
              </AppText>
            </View>
          )}
          {/* Rating badge */}
          {item.avgRating > 0 && (
            <View
              style={[
                styles.ratingBadge,
                {backgroundColor: colors.background.scrimMid},
              ]}>
              <AppText
                variant="caption"
                style={[styles.ratingText, {color: colors.accent.gold}]}>
                ★ {item.avgRating.toFixed(1)}
              </AppText>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.movieInfo}>
          <AppText variant="bodySmall" numberOfLines={2} style={styles.movieTitle}>
            {item.title}
          </AppText>
          {item.year ? (
            <AppText variant="caption" color="secondary">
              {item.year}
            </AppText>
          ) : null}
          {item.creator ? (
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {item.creator}
            </AppText>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  },
);

// ─── Category Scene ─────────────────────────────────────────────────────
// One lazily-mounted scene per category tab. Owns its FlatList so each
// tab paginates independently; reads per-scope state from the screen hook.

interface MovieCategorySceneProps {
  category: (typeof MOVIE_CATEGORIES)[number];
  scope: MovieScopeState;
  isSearchActive: boolean;
  resolvingId: string | null;
  ensureLoaded: (categoryId: string) => void;
  loadMore: (categoryId: string) => void;
  retry: (categoryId: string) => void;
  onPressMovie: (item: InternetArchiveVideoResult) => void;
}

const MovieCategoryScene: React.FC<MovieCategorySceneProps> = React.memo(
  ({
    category,
    scope,
    isSearchActive,
    resolvingId,
    ensureLoaded,
    loadMore,
    retry,
    onPressMovie,
  }) => {
    const {colors} = useTheme();
    const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

    // Load page 1 for this scope on mount / whenever the scope key
    // changes (e.g. a new search term). `ensureLoaded` short-circuits
    // when the scope is already loading or loaded, so this is safe to
    // re-run.
    React.useEffect(() => {
      ensureLoaded(category.id);
    }, [ensureLoaded, category.id]);

    return (
      <View style={styles.scene}>
        {/* Initial load */}
        {!hasLoaded && isLoading && (
          <View style={styles.centerState}>
            <ActivityOrb />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              Loading movies...
            </AppText>
          </View>
        )}

        {/* Load failure (page 1) */}
        {!hasLoaded && !isLoading && error && (
          <View style={styles.centerState}>
            <SvgIcon name="alertCircle" size={40} color={colors.accent.goldDim} />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              Couldn't load movies.
            </AppText>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => retry(category.id)}
              style={[
                styles.retryButton,
                {backgroundColor: colors.accent.gold},
              ]}
              accessibilityRole="button">
              <AppText variant="button" style={styles.retryText}>
                Retry
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty scope (loaded, zero results) */}
        {hasLoaded && !error && items.length === 0 && (
          <View style={styles.centerState}>
            <SvgIcon
              name={isSearchActive ? 'search' : 'folder'}
              size={40}
              color={colors.accent.goldDim}
            />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              {isSearchActive
                ? 'No movies match your search.'
                : 'No movies found in this category.'}
            </AppText>
          </View>
        )}

        {/* Grid + infinite scroll */}
        {items.length > 0 && (
          <FlatList
            data={items}
            renderItem={({item}) => (
              <MovieCard
                item={item}
                onPress={onPressMovie}
                isResolving={resolvingId === item.identifier}
              />
            )}
            keyExtractor={item => item.identifier}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            ListHeaderComponent={
              <AppText variant="caption" color="tertiary" style={styles.categoryDesc}>
                {category.description}
              </AppText>
            }
            showsVerticalScrollIndicator={false}
            onEndReached={() => loadMore(category.id)}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoadingMore || error ? (
                <View style={styles.gridFooter}>
                  {isLoadingMore ? (
                    <View style={styles.gridFooterRow}>
                      <ActivityOrb size={22} />
                      <AppText variant="caption" color="tertiary">
                        Loading more…
                      </AppText>
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => loadMore(category.id)}
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
            windowSize={5}
            maxToRenderPerBatch={10}
          />
        )}
      </View>
    );
  },
);

// ─── Screen ─────────────────────────────────────────────────────────────

export const MoviesScreen: React.FC<RootStackScreenProps<'MoviesScreen'>> = ({
  navigation,
  route,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const {
    selectedCategory,
    selectCategory,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    getScope,
    ensureLoaded,
    loadMore,
    retry,
  } = useMoviesScreen(route.params?.categoryId);

  // Inline error state for "this movie can't be played" — shown next to
  // the grid instead of navigating into the player with an empty fileUri.
  const [movieError, setMovieError] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleMoviePress = useCallback(
    async (item: InternetArchiveVideoResult) => {
      // Validate the URL *before* navigating into the player: retry the
      // metadata API up to 3 times (toast on each switch) and refuse to
      // navigate if the URL is still bad — show an inline error instead.
      setMovieError(null);
      setResolvingId(item.identifier);
      try {
        const details = await resolveInternetArchiveVideoDetails(
          item.identifier,
          (attempt, max) => {
            toast.show(
              `Trying alternate server… (attempt ${attempt}/${max})`,
              'info',
              1800,
            );
          },
        );
        if (!details || details.streamingUrl.endsWith('/')) {
          setMovieError({
            title: 'No Video File',
            message:
              'This item does not have a playable video file. Please try a different movie.',
          });
          return;
        }
        navigation.navigate('VideoPlayer', {
          fileUri: details.streamingUrl,
          fileTitle: item.title,
          startPosition: 0,
        });
      } catch (err) {
        setMovieError({
          title: 'Unable to Load',
          message:
            err instanceof Error
              ? err.message
              : 'Failed to fetch the video file. Please try again.',
        });
      } finally {
        setResolvingId(null);
      }
    },
    [navigation, toast],
  );

  // ── TabView wiring ──
  const routes = useMemo(
    () => MOVIE_CATEGORIES.map(c => ({key: c.id, title: c.name})),
    [],
  );
  const categoryIndex = Math.max(
    0,
    MOVIE_CATEGORIES.findIndex(c => c.id === selectedCategory),
  );

  const renderTabBar = useCallback(
    (props: SceneRendererProps & {navigationState: {index: number; routes: Route[]}}) => (
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
      const category = MOVIE_CATEGORIES.find(c => c.id === tabRoute.key);
      if (!category) return null;
      return (
        <MovieCategoryScene
          category={category}
          scope={getScope(category.id)}
          isSearchActive={isSearchActive}
          resolvingId={resolvingId}
          ensureLoaded={ensureLoaded}
          loadMore={loadMore}
          retry={retry}
          onPressMovie={handleMoviePress}
        />
      );
    },
    [
      getScope,
      isSearchActive,
      resolvingId,
      ensureLoaded,
      loadMore,
      retry,
      handleMoviePress,
    ],
  );

  const renderLazyPlaceholder = useCallback(
    ({route: tabRoute}: {route: Route}) => (
      <View style={styles.centerState}>
        <ActivityOrb />
        <AppText variant="body2" color="tertiary" style={styles.stateText}>
          Loading {MOVIE_CATEGORIES.find(c => c.id === tabRoute.key)?.name ?? 'movies'}...
        </AppText>
      </View>
    ),
    [],
  );

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Movies" />

      {/* ── Search (stays put while tabs change) ── */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder="Search movies…"
        />
      </View>

      {/* Per-movie inline error banner */}
      {movieError && (
        <View style={styles.movieErrorBanner}>
          <SvgIcon name="alertCircle" size={22} color={colors.accent.gold} />
          <View style={styles.movieErrorText}>
            <AppText variant="body2" color="primary">
          {movieError.title}
        </AppText>
            <AppText variant="caption" color="tertiary">
              {movieError.message}
            </AppText>
          </View>
          <TouchableOpacity
            onPress={() => setMovieError(null)}
            accessibilityLabel="Dismiss movie error"
            accessibilityRole="button"
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <SvgIcon name="close" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Category TabView (lazy scenes) ── */}
      <TabView
        navigationState={{index: categoryIndex, routes}}
        onIndexChange={index => selectCategory(routes[index].key)}
        renderTabBar={renderTabBar}
        renderScene={renderScene}
        renderLazyPlaceholder={renderLazyPlaceholder}
        lazy
        commonOptions={{labelStyle: styles.tabLabel}}
        style={styles.sceneContainer}
      />
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  // Per-movie inline error banner. Sits at the top of the content area
  // as a dismissible pill — distinguishes per-movie resolution failures
  // from the global "couldn't load movies" state.
  movieErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#2A1F0A', // dim gold-tinted surface
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#5C4A1F',
  },
  movieErrorText: {
    flex: 1,
    gap: 2,
  },
  // ── TabView ──
  sceneContainer: {
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
  categoryDesc: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    opacity: 0.8,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  stateText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  retryText: {
    color: '#1A1206',
  },
  gridContent: {
    padding: spacing.sm,
  },
  gridRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  gridFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  gridFooterRow: {
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
  movieCard: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  thumbnailWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.xs,
  },
  // Actual image style. Fills the wrapper, sits behind the duration/
  // rating badges (z-order from JSON position). Explicit width/height is
  // required — absoluteFillObject renders 0×0 in this layout.
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
  resolvingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  durationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  movieInfo: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  movieTitle: {
    fontWeight: '600',
    lineHeight: 16,
  },
});
