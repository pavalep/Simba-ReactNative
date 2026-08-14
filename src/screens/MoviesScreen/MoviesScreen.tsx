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
import {Placeholder} from '../../components/feedback/Placeholder';
import {resolveInternetArchiveVideoDetails} from '../../services/api/internetArchiveService';
import {useToast} from '../../components/feedback/Toast';
import type {InternetArchiveVideoResult} from '../../types/api';
import {SectionBrowseLayout} from '../sections/SectionBrowseLayout';
import {SectionContent, type SectionContentState} from '../sections/components/SectionContent';
import type {SectionBrowseConfig, SectionTab} from '../sections/sectionConfig';

// ─── [v10 Wave 2 preview] Unified-shell A/B ─────────────────────────────
// TEMP. Movies renders through the shared SectionBrowseLayout using the
// config below while the legacy body stays intact for A/B comparison. The
// preview config duplicates the 9 movie tabs; Wave 5 migrates the real
// grid into SECTION_CONFIGS and deletes this whole block (flag included).
const MOVIES_PREVIEW_MODE = true;

// TEMP (Phase 2.3 validation): force each SectionContent state slot by hand
// (tracker Phase 2.3 step 9 — all 5 states must render). The offline strip
// is driven by the shell's dev flag; error/empty/loading flip here.
const PREVIEW_FORCE_STATE: SectionContentState = 'ready';

/** Temp scene: renders the preview tab through the shared SectionContent
 *  states scaffolding. Retry resets the forced state back to ready so the
 *  shared ErrorState button is live in the A/B harness. */
const MoviePreviewScene: React.FC<{tab: SectionTab; query: string}> = ({
  tab,
  query,
}) => {
  const {colors} = useTheme();
  const [state, setState] = useState<SectionContentState>(PREVIEW_FORCE_STATE);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  return (
    <SectionContent
      state={state}
      error={{message: `Could not load ${tab.title}.`}}
      empty={{
        icon: 'search',
        title: `No ${tab.title.toLowerCase()} found`,
        suggestion: query
          ? `Nothing matches “${query}” — try a different search.`
          : 'Try a different search or category.',
      }}
      onRetry={() => setState('ready')}
      refreshing={refreshing}
      onRefresh={onRefresh}>
      {/* Ready-slot placeholder rows — proves shell search threads through. */}
      <AppText variant="h3" color="primary">
        {tab.title}
      </AppText>
      <AppText variant="body2" color="secondary" style={styles.previewHint}>
        {query
          ? `Searching “${query}”…`
          : 'Pull to refresh — gold tint per app convention.'}
      </AppText>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={[styles.previewRow, {backgroundColor: colors.accent.goldDim}]}
        />
      ))}
    </SectionContent>
  );
};

const MOVIES_PREVIEW_CONFIG: SectionBrowseConfig = {
  route: 'MoviesScreen',
  title: 'Movies',
  search: {placeholder: 'Search movies…'},
  tabs: MOVIE_CATEGORIES.map(c => ({key: c.id, title: c.name})),
  renderTab: (tab, ctx) => (
    <MoviePreviewScene tab={tab} query={ctx.query} />
  ),
};

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
    const toast = useToast();
    const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

    // [FIX-PODCASTS-LOOP] Stash ensureLoaded in a ref so this effect
    // doesn't re-fire every time the parent re-renders.
    const ensureLoadedRef = React.useRef(ensureLoaded);
    ensureLoadedRef.current = ensureLoaded;

    // Load page 1 for this scope on mount / whenever the scope key
    // changes (e.g. a new search term).
    React.useEffect(() => {
      ensureLoadedRef.current(category.id);
    }, [category.id]);

    // Surface page-1 load failures as a toast with a Retry action.
    // [FIX-PODCASTS-LOOP] deps only include state (not toast/retry fn refs)
    // to avoid infinite re-render. Track last shown error in a ref.
    const lastShownErrorRef = React.useRef<string | null>(null);
    React.useEffect(() => {
      const shouldShow = !hasLoaded && !isLoading && !!error;
      const currentError = shouldShow ? "Couldn't load movies." : null;
      if (currentError && currentError !== lastShownErrorRef.current) {
        lastShownErrorRef.current = currentError;
        toast.show(currentError, 'error', {
          duration: 8000,
          action: {
            label: 'Retry',
            onPress: () => {
              lastShownErrorRef.current = null;
              retry(category.id);
            },
          },
        });
      } else if (!currentError) {
        lastShownErrorRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasLoaded, isLoading, error]);

    return (
      <View style={styles.scene}>
        {/* Initial load */}
        {!hasLoaded && isLoading && (
          <Placeholder
            variant="loading"
            anchor="top-third"
            title="Loading movies..."
          />
        )}

        {/* Load failure (page 1) — toast surfaces Retry; placeholder keeps
            the screen from looking blank. */}
        {!hasLoaded && !isLoading && error && items.length === 0 && (
          <Placeholder
            variant="empty"
            anchor="top-third"
            icon="alertCircle"
            title="Couldn't load movies."
            message="Use Retry at the bottom of the screen to try again."
          />
        )}

        {/* Empty scope (loaded, zero results) */}
        {hasLoaded && !error && items.length === 0 && (
          <Placeholder
            variant="empty"
            anchor="top-third"
            icon={isSearchActive ? 'search' : 'folder'}
            title={isSearchActive ? 'No movies match your search.' : 'No movies found in this category.'}
          />
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

  // Per-movie resolution state. Failures surface as a top-of-screen toast
  // (auto-dismiss + close button) rather than an inline banner embedded
  // in the content — same pattern as the rest of the app.
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleMoviePress = useCallback(
    async (item: InternetArchiveVideoResult) => {
      // Validate the URL *before* navigating into the player: retry the
      // metadata API up to 3 times (toast on each switch) and refuse to
      // navigate if the URL is still bad — surface a toast instead.
      setResolvingId(item.identifier);
      try {
        const details = await resolveInternetArchiveVideoDetails(
          item.identifier,
          (attempt, max) => {
            toast.show(
              `Trying alternate server… (attempt ${attempt}/${max})`,
              'info',
              {duration: 1800},
            );
          },
        );
        if (!details || details.streamingUrl.endsWith('/')) {
          toast.show(
            'No Video File — this item does not have a playable video file. Please try a different movie.',
            'error',
            {duration: 6000},
          );
          return;
        }
        navigation.navigate('VideoPlayer', {
          fileUri: details.streamingUrl,
          fileTitle: item.title,
          startPosition: 0,
        });
      } catch (err) {
        const detail =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to fetch the video file. Please try again.';
        toast.show(`Unable to Load — ${detail}`, 'error', {duration: 6000});
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
      <Placeholder
        variant="loading"
        anchor="top-third"
        title={`Loading ${MOVIE_CATEGORIES.find(c => c.id === tabRoute.key)?.name ?? 'movies'}...`}
      />
    ),
    [],
  );

  // [v10 Wave 2 preview] Render through the unified shell. The legacy body
  // below stays in the file for A/B; flip MOVIES_PREVIEW_MODE to compare.
  if (MOVIES_PREVIEW_MODE) {
    return (
      <SectionBrowseLayout config={MOVIES_PREVIEW_CONFIG} routeParams={route.params} />
    );
  }

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

      {/* Per-movie resolution errors surface via the top-of-screen toast
          (auto-dismiss + close button). See handleMoviePress. */}

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
  // Per-movie resolution errors surface as a top-of-screen toast
  // (see handleMoviePress + the ToastProvider in the app root) — no
  // inline banner state to keep here.
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
  // [v10 Wave 2 preview] Temp placeholder rows — deleted in Wave 5.
  // (Background color applied inline from the theme, per file convention.)
  previewRow: {
    marginTop: spacing.md,
    height: 84,
    borderRadius: radius.md,
  },
  previewHint: {
    marginTop: spacing.xs,
  },
  categoryDesc: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    opacity: 0.8,
  },
  // (Replaced by the shared <Placeholder> component.)
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
