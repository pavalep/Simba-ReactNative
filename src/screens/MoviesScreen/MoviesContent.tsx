// ─── Movie Browser Content (v10 Wave 5 → v10.1 Wave 6 de-tab) ───────────
// The per-section part of the unified shell (spec §5): cards + per-category
// data. The shell (SectionBrowseLayout) owns the header/search/FAB and
// hands the ONE content stream a `SectionRenderContext`; this module owns:
//
//   • MoviesDataProvider — calls `useMoviesScreen` ONCE, above the shell,
//     so the single content stream shares ONE per-scope cache (the legacy
//     "switching categories never refetches" behavior). It also owns the
//     per-movie resolution state + press handler (uses the global
//     `navigate` helper — content has no screen `navigation`).
//   • renderMoviesContent — the config's `renderContent`: bridges the
//     shell's debounced `ctx.query` into the hook's `setSearchTerm`, reads
//     the active category from `ctx.options.filter` ('' → the default
//     "All" stream), then renders the single-column MovieCard list through
//     SectionContent's DATA MODE (states, pagination, testID, gold
//     RefreshControl all shared).
//
// The old header/search/tab/viewpager code was deleted from the screen —
// the shell owns all of it now.

import React, {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import {useMoviesScreen, type MovieScopeState} from './hooks/useMoviesScreen';
import {MOVIE_CATEGORIES} from '../../constants/movieCategories';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {useToast} from '../../components/feedback/Toast';
import {SectionContent, type SectionContentState} from '../sections/components/SectionContent';
import {navigate} from '../../navigation/navigationHelper';
import {resolveInternetArchiveVideoDetails} from '../../services/api/internetArchiveService';
import type {InternetArchiveVideoResult} from '../../types/api';
import type {
  SectionBrowseConfig,
  SectionRenderContext,
} from '../sections/sectionConfig';

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
}

// ─── Client-side sort (Phase 5.3 step 2) ────────────────────────────────
// The FAB's sort options re-order the FETCHED slice with a pure function:
// the array is copied before sorting (never mutates the scope cache), and
// `undefined` keeps the fetched order. Sorting only the loaded slice is a
// known trap (spec §10.2) — `items` is a useMemo dep below, so every
// load-more append re-sorts the full array automatically.
function parseYear(year: string | undefined): number {
  const n = Number(year);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Sort the IA catalog client-side. Server-side sort is intentionally
 * avoided for the "default popular first" path because IA's
 * `sort[]=downloads desc` is currently 502-proned; we materialize the
 * same order from `downloadCount` here.
 *
 * Unknown sort keys fall through untouched (safe default: natural order).
 */
function sortMovies(
  items: InternetArchiveVideoResult[],
  sort: string | undefined,
): InternetArchiveVideoResult[] {
  // Default (no sheet sort chosen) → most popular first.
  if (!sort || sort === '' || sort === 'downloads') {
    const copy = [...items];
    copy.sort(
      (a, b) =>
        b.downloadCount - a.downloadCount ||
        a.title.localeCompare(b.title),
    );
    return copy;
  }
  const copy = [...items];
  switch (sort) {
    case 'newest':
      // Unknown/missing years (0) sink to the bottom; ties break by title.
      copy.sort(
        (a, b) => parseYear(b.year) - parseYear(a.year) ||
          a.title.localeCompare(b.title),
      );
      break;
    case 'oldest':
      copy.sort(
        (a, b) => parseYear(a.year) - parseYear(b.year) ||
          a.title.localeCompare(b.title),
      );
      break;
    case 'az':
      copy.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'rating':
      copy.sort(
        (a, b) => b.avgRating - a.avgRating ||
          a.title.localeCompare(b.title),
      );
      break;
  }
  return copy;
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
      style={[
        styles.movieCard,
        {backgroundColor: colors.background.elevated},
      ]}>
        {/* Portrait-ish thumbnail on the left */}
        <View
          style={[
            styles.thumbnailWrap,
            {backgroundColor: colors.background.primary},
          ]}>
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
              <SvgIcon name="video" size={28} color={colors.accent.goldDim} />
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
          {/* Rating badge pinned bottom-right of the thumb */}
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

        {/* Right column: title + meta row + duration chip */}
        <View style={styles.movieInfo}>
          <AppText
            variant="body1"
            numberOfLines={2}
            style={styles.movieTitle}>
            {item.title}
          </AppText>
          <View style={styles.metaRow}>
            {item.year ? (
              <AppText variant="caption" color="secondary">
                {item.year}
              </AppText>
            ) : null}
            {item.year && item.creator ? (
              <AppText variant="caption" color="tertiary">
                {' · '}
              </AppText>
            ) : null}
            {item.creator ? (
              <AppText variant="caption" color="tertiary" numberOfLines={1}>
                {item.creator}
              </AppText>
            ) : null}
          </View>
          {item.duration > 0 ? (
            <View
              style={[
                styles.durationBadge,
                {backgroundColor: colors.accent.goldDim},
              ]}>
              <AppText
                variant="caption"
                style={[styles.durationText, {color: colors.accent.gold}]}>
                {formatDuration(item.duration)}
              </AppText>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  },
);

// ─── Data provider (ONE cache above the shell) ──────────────────────────

interface MoviesDataContextValue {
  isSearchActive: boolean;
  getScope: (categoryId: string) => MovieScopeState;
  ensureLoaded: (categoryId: string) => void;
  loadMore: (categoryId: string) => void;
  retry: (categoryId: string) => void;
  refresh: (categoryId: string) => void;
  setSearchTerm: (term: string) => void;
  resolvingId: string | null;
  handleMoviePress: (item: InternetArchiveVideoResult) => void;
}

const MoviesDataContext = React.createContext<MoviesDataContextValue | null>(
  null,
);

function useMoviesData(): MoviesDataContextValue {
  const ctx = React.useContext(MoviesDataContext);
  if (!ctx) {
    throw new Error('useMoviesData must be used inside <MoviesDataProvider>.');
  }
  return ctx;
}

export const MoviesDataProvider: React.FC<{
  children: ReactNode;
}> = ({children}) => {
  const toast = useToast();
  // Single hook instance for the whole screen — the one content stream
  // reads the SAME (category, searchTerm) scope cache via context.
  const movies = useMoviesScreen();

  // Per-movie resolution state. Failures surface as a top-of-screen toast
  // (auto-dismiss + close button) rather than an inline banner — same
  // pattern as the rest of the app.
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
        navigate('VideoPlayer', {
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
    [toast],
  );

  const value = useMemo<MoviesDataContextValue>(
    () => ({
      isSearchActive: movies.isSearchActive,
      getScope: movies.getScope,
      ensureLoaded: movies.ensureLoaded,
      loadMore: movies.loadMore,
      retry: movies.retry,
      refresh: movies.refresh,
      setSearchTerm: movies.setSearchTerm,
      resolvingId,
      handleMoviePress,
    }),
    // Stabilize the context value: depend on each individual property
    // so the memo only invalidates when one of them actually changes,
    // not every time `movies` (a fresh object) is returned from the hook.
    // Without this, every provider render gives the consumer a new
    // `ensureLoaded` ref, re-firing the mount effect (Phase 5.2b).
    [
      movies.isSearchActive,
      movies.getScope,
      movies.ensureLoaded,
      movies.loadMore,
      movies.retry,
      movies.refresh,
      movies.setSearchTerm,
      resolvingId,
      handleMoviePress,
    ],
  );

  return (
    <MoviesDataContext.Provider value={value}>
      {children}
    </MoviesDataContext.Provider>
  );
};

// ─── Content (the config's renderContent) ───────────────────────────────

const MoviesContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refresh,
    isSearchActive,
    setSearchTerm,
    resolvingId,
    handleMoviePress,
  } = useMoviesData();
  const {offline} = ctx;

  // Active category comes from the shell's FILTER selection — '' → the
  // default "All" stream (the `all` category). The scope key is
  // `${categoryId}|${searchTerm}`.
  const categoryId = ctx.options.filter ?? 'all';

  // Bridge: the shell owns the debounced search term, the hook owns the
  // fetch term. Sync every change so scopes keyed by `term` stay in
  // lockstep with the shell's search field.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Load page 1 for this category on first mount / category switch.
  // The hook's hasLoaded/isLoading guard turns this into a no-op for
  // already-loaded scopes, so it's safe to fire on every categoryId
  // change. We use a ref-stash so the effect doesn't re-fire when only
  // ensureLoaded's identity changes (Phase 5.2b: re-firing causes the
  // provider to re-render and produce a new context value).
  const ensureLoadedRef = React.useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;
  useEffect(() => {
    ensureLoadedRef.current(categoryId);
  }, [categoryId]);

  const scope = getScope(categoryId);
  const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

  // Legacy parity: initial load → loading; page-1 failure → error; loaded
  // with zero results → empty; otherwise the grid. Load-more errors keep
  // showing the grid with a tap-to-retry footer (see below).
  const state: SectionContentState =
    !hasLoaded && isLoading
      ? 'loading'
      : !hasLoaded && !!error && items.length === 0
      ? 'error'
      : hasLoaded && !error && items.length === 0
      ? 'empty'
      : 'ready';

  // v10.1: Movies is always single-column (horizontal card) — the FAB
  // exposes only filter + sort (no view toggle). The original 2-col
  // grid felt cramped and made titles unreadable.
  const view: 'list' | 'grid' = 'list';
  const category = MOVIE_CATEGORIES.find(c => c.id === categoryId);

  // The FAB sort re-orders THIS stream's own loaded slice (never another
  // category's). The memo deps make it live: sort changes re-order
  // instantly, and every load-more append re-sorts the full array.
  // `undefined` = natural order.
  const sortedItems = useMemo(
    () => sortMovies(items, ctx.options.sort),
    [items, ctx.options.sort],
  );

  // Load-more footer only in the ready state (page-1 failures render the
  // shared ErrorState in the empty slot instead — no double error UI).
  const showFooter = isLoadingMore || (!!error && hasLoaded);

  // The shared 'loading' skeleton is only for the first page-1 fetch, so a
  // pull-to-refresh (hasLoaded stays true → 'ready') spins the gold
  // RefreshControl without ever blanking the grid.
  const refreshControl = {
    refreshing: isLoading,
    onRefresh: () => refresh(categoryId),
  };

  return (
    <SectionContent
      state={state}
      error={{
        // Offline-aware copy: the global OfflineBanner already says we're
        // offline — the ErrorState just confirms the retry path instead of
        // showing a misleading network message.
        title: offline ? "You're offline" : undefined,
        message: offline
          ? 'Check your connection and try again.'
          : "Couldn't load movies.",
      }}
      empty={{
        icon: isSearchActive ? 'search' : 'folder',
        title: isSearchActive
          ? 'No movies match your search.'
          : 'No movies found in this category.',
        suggestion: isSearchActive
          ? 'Try a different search term.'
          : 'Try another category.',
      }}
      onRetry={() => retry(categoryId)}
      {...refreshControl}
      data={sortedItems}
      renderItem={({item}) => (
        <MovieCard
          item={item}
          onPress={handleMoviePress}
          isResolving={resolvingId === item.identifier}
        />
      )}
      keyExtractor={item => item.identifier}
      view={view}
      // Pad the bottom so the last row can scroll fully above the floating
      // SectionFab (56px tall, bottom-anchored at insets.bottom + spacing.lg
      // in SectionFab) plus a breathing gap.
      contentContainerStyle={{
        paddingBottom: insets.bottom + spacing.lg + 56 + spacing.md,
      }}
      route="MoviesScreen"
      ListHeaderComponent={
        <AppText variant="caption" color="tertiary" style={styles.categoryDesc}>
          {category?.description ?? 'Every movie in the archive, most popular first'}
        </AppText>
      }
      onEndReached={() => loadMore(categoryId)}
      onEndReachedThreshold={0.6}
      ListFooterComponent={
        showFooter ? (
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
                onPress={() => loadMore(categoryId)}
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
    />
  );
};

/** The Movies `renderContent` — wired into SECTION_CONFIGS.MoviesScreen. */
export const renderMoviesContent: SectionBrowseConfig['renderContent'] = ctx => (
  <MoviesContent ctx={ctx} />
);

// ─── Styles ─────────────────────────────────────────────────────────────
// Card + footer styles only — the grid/list container math is owned by
// SectionContent (Phase 4.3 parity: 16px edge / 8px col gap / 16px row gap).

const styles = StyleSheet.create({
  categoryDesc: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    opacity: 0.8,
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
  // Horizontal card row: 96×144 portrait thumb on the left, text on the right.
  // Single-column list view (one item per row).
  movieCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    gap: spacing.md,
    overflow: 'hidden',
  },
  thumbnailWrap: {
    width: 96,
    height: 144,
    borderRadius: radius.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.xs,
  },
  // Actual image style. Fills the wrapper, sits behind the rating badge.
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
  // Duration is now a gold "chip" rendered in the info column.
  durationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Rating stays a floating pill on the thumbnail (bottom-left).
  ratingBadge: {
    position: 'absolute',
    bottom: spacing.xs,
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
    flex: 1,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
    gap: 2,
  },
  movieTitle: {
    fontWeight: '600',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
});
