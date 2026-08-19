// ─── Music Browser Content (v10.1 Wave 6) ───────────────────────────────
// The per-section part of the FAB-only shell (spec §5): cards + per-genre
// data. The shell (SectionBrowseLayout) owns the header/search/FAB and
// hands the ONE content stream a `SectionRenderContext`; this module owns:
//
//   • MusicDataProvider — calls `useMusicScreen` ONCE, above the shell, so
//     the single content stream reads the SAME per-scope cache via context
//     (the legacy "switching never refetches" behavior). It also owns the
//     track press handler (uses the global `navigate` helper — content has
//     no screen `navigation`).
//   • renderMusicContent — the config's `renderContent`: bridges the
//     shell's debounced `ctx.query` into the hook's `setSearchTerm`, reads
//     the active genre from `ctx.options.filter` ('' = the "All" default
//     stream), then renders the TrackCard list through SectionContent's
//     DATA MODE (states, pagination, gold RefreshControl all shared).
//
// The old search/tab/viewpager code was deleted from the screen — the
// shell owns all of it now.

import React, {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import {
  useMusicScreen,
  JAMENDO_GENRES,
  type MusicScopeState,
} from './hooks/useMusicScreen';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {useToast} from '../../components/feedback/Toast';
import {SectionContent, type SectionContentState} from './browse/Content';
import {navigate} from '../../navigation/navigationHelper';
import type {JamendoTrackResult} from '../../types/api';
import type {SectionBrowseConfig, SectionRenderContext} from './browse/types';

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDuration(duration: number): string {
  if (!duration || duration <= 0) return '--:--';
  const m = Math.floor(duration / 60);
  const s = Math.round(duration % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Client-side sort ───────────────────────────────────────────────────
// The FAB's sort options re-order the FETCHED slice with a pure function:
// the array is copied before sorting (never mutates the scope cache), and
// `undefined` keeps the server's natural order. Sorting only the loaded
// slice is a known trap (spec §10.2) — `items` is a useMemo dep below, so
// every load-more append re-sorts the full array automatically.
function sortTracks(
  items: JamendoTrackResult[],
  sort: string | undefined,
): JamendoTrackResult[] {
  if (!sort) return items;
  const copy = [...items];
  switch (sort) {
    case 'az':
      copy.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'recent':
      // Jamendo returns no release date on track results — ids are
      // assigned chronologically, so a descending id is the closest
      // stable proxy for "recently added".
      copy.sort((a, b) => b.id - a.id);
      break;
    case 'duration':
      // Ascending like the az group (shortest first).
      copy.sort((a, b) => a.duration - b.duration);
      break;
  }
  return copy;
}

/** Capitalized genre label for copy ("no {Rock} tracks found"). */
function genreLabel(genre: string): string {
  const match = JAMENDO_GENRES.find(g => g === genre);
  return match
    ? match.charAt(0).toUpperCase() + match.slice(1)
    : genre;
}

// ─── Track Card ─────────────────────────────────────────────────────────

interface TrackCardProps {
  item: JamendoTrackResult;
  onPress: (item: JamendoTrackResult) => void;
}

const TrackCard: React.FC<TrackCardProps> = React.memo(
  ({item, onPress}) => {
    const {colors} = useTheme();
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = !!item.imageUrl && !imageFailed;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(item)}
        accessibilityRole="button"
        style={[
          styles.trackCard,
          {backgroundColor: colors.background.elevated},
        ]}>
        {/* Thumb */}
        <View
          style={[
            styles.thumbWrap,
            {backgroundColor: colors.background.primary},
          ]}>
          {showImage ? (
            <FastImage
              source={{
                uri: item.imageUrl,
                priority: FastImage.priority.normal,
              }}
              style={styles.thumbImage}
              resizeMode={FastImage.resizeMode.cover}
              onError={() => setImageFailed(true)}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <SvgIcon name="music" size={22} color={colors.accent.goldDim} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.trackInfo}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.trackName}>
            {item.name}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {item.artistName}
          </AppText>
          {item.albumName ? (
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {item.albumName}
            </AppText>
          ) : null}
        </View>

        {/* Duration + play */}
        <View style={styles.trackRight}>
          <AppText variant="caption" color="tertiary">
            {formatDuration(item.duration)}
          </AppText>
          <View style={[styles.playButton, {backgroundColor: colors.accent.gold}]}>
            <SvgIcon name="play" size={14} color={colors.text.inverse} />
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

// ─── Data provider (ONE cache above the shell) ──────────────────────────

interface MusicDataContextValue {
  isSearchActive: boolean;
  getScope: (genre: string) => MusicScopeState;
  ensureLoaded: (genre: string) => void;
  loadMore: (genre: string) => void;
  retry: (genre: string) => void;
  refresh: (genre: string) => void;
  setSearchTerm: (term: string) => void;
  handleTrackPress: (item: JamendoTrackResult) => void;
}

const MusicDataContext = React.createContext<MusicDataContextValue | null>(
  null,
);

function useMusicData(): MusicDataContextValue {
  const ctx = React.useContext(MusicDataContext);
  if (!ctx) {
    throw new Error('useMusicData must be used inside <MusicDataProvider>.');
  }
  return ctx;
}

export const MusicDataProvider: React.FC<{
  children: ReactNode;
}> = ({children}) => {
  const toast = useToast();
  // Single hook instance for the whole screen — the one content stream
  // reads the SAME (genre, searchTerm) scope cache via context.
  const music = useMusicScreen();

  const handleTrackPress = useCallback(
    (item: JamendoTrackResult) => {
      navigate('AudioPlayer', {
        fileUri: item.audioUrl,
        fileTitle: item.name,
        artworkUri: item.imageUrl,
        source: 'jamendo',
      });
    },
    [toast],
  );

  const value = useMemo<MusicDataContextValue>(
    () => ({
      isSearchActive: music.isSearchActive,
      getScope: music.getScope,
      ensureLoaded: music.ensureLoaded,
      loadMore: music.loadMore,
      retry: music.retry,
      refresh: music.refresh,
      setSearchTerm: music.setSearchTerm,
      handleTrackPress,
    }),
    // Stabilize the context value: depend on each property individually
    // so the memo only invalidates when one of them actually changes,
    // not every render (the `music` object is fresh each time) — mirrors
    // the MoviesContent fix (Phase 5.2b).
    [
      music.isSearchActive,
      music.getScope,
      music.ensureLoaded,
      music.loadMore,
      music.retry,
      music.refresh,
      music.setSearchTerm,
      handleTrackPress,
    ],
  );

  return (
    <MusicDataContext.Provider value={value}>
      {children}
    </MusicDataContext.Provider>
  );
};

// ─── Content (the config's renderContent) ───────────────────────────────

const MusicContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
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
    handleTrackPress,
  } = useMusicData();
  const {offline} = ctx;

  // Active genre comes from the shell's FILTER selection — '' = the "All"
  // default stream (popular). The scope key is `${genre}|${searchTerm}`.
  // The shell models every filter as `string[]`; Music is single-select,
  // so the active genre is `[0]` (or '' when the group is cleared).
  const rawFilter = ctx.options.filter;
  const genre = Array.isArray(rawFilter) ? (rawFilter[0] ?? '') : (rawFilter ?? '');

  // Bridge: the shell owns the debounced search term, the hook owns the
  // fetch term. Sync every change so scopes keyed by `term` stay in
  // lockstep with the shell's search field.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Load page 1 for this genre on first mount / genre switch. The hook's
  // hasLoaded/isLoading guard turns this into a no-op for already-loaded
  // scopes. Ref-stashed so the effect doesn't re-fire when only
  // ensureLoaded's identity changes (Phase 5.2b: mirrors MoviesContent).
  const ensureLoadedRef = React.useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;
  useEffect(() => {
    ensureLoadedRef.current(genre);
  }, [genre]);

  const scope = getScope(genre);
  const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

  // Legacy parity: initial load → loading; page-1 failure → error; loaded
  // with zero results → empty; otherwise the list. Load-more errors keep
  // showing the list with a tap-to-retry footer (see below).
  const state: SectionContentState =
    !hasLoaded && isLoading
      ? 'loading'
      : !hasLoaded && !!error && items.length === 0
      ? 'error'
      : hasLoaded && !error && items.length === 0
      ? 'empty'
      : 'ready';

  const view = ctx.options.view === 'list' ? 'list' : 'grid';

  // The FAB sort re-orders THIS stream's own loaded slice. The memo deps
  // make it live: sort changes re-order instantly, and every load-more
  // append re-sorts the full array.
  const sortedItems = useMemo(
    () => sortTracks(items, ctx.options.sort),
    [items, ctx.options.sort],
  );

  // Load-more footer only in the ready state (page-1 failures render the
  // shared ErrorState in the empty slot instead — no double error UI).
  const showFooter = isLoadingMore || (!!error && hasLoaded);

  // The shared 'loading' skeleton is only for the first page-1 fetch, so a
  // pull-to-refresh (hasLoaded stays true → 'ready') spins the gold
  // RefreshControl without ever blanking the list.
  const refreshControl = {
    refreshing: isLoading,
    onRefresh: () => refresh(genre),
  };

  const emptyTitle = isSearchActive
    ? 'No tracks match your search.'
    : genre
    ? `No ${genreLabel(genre)} tracks found.`
    : 'No popular tracks found.';

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
          : "Couldn't load tracks.",
      }}
      empty={{
        icon: isSearchActive ? 'search' : 'music',
        title: emptyTitle,
        suggestion: isSearchActive
          ? 'Try a different search term.'
          : genre
          ? 'Try another genre.'
          : 'Try a search or pick a genre.',
      }}
      onRetry={() => retry(genre)}
      {...refreshControl}
      data={sortedItems}
      renderItem={({item}) => (
        <TrackCard item={item} onPress={handleTrackPress} />
      )}
      keyExtractor={item => String(item.id)}
      view={view}
      // Pad the bottom so the last row can scroll fully above the floating
      // SectionFab (56px tall, bottom-anchored at insets.bottom + spacing.lg
      // in SectionFab) plus a breathing gap.
      contentContainerStyle={{
        paddingBottom: insets.bottom + spacing.lg + 56 + spacing.md,
      }}
      route="MusicScreen"
      onEndReached={() => loadMore(genre)}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        showFooter ? (
          <View style={styles.listFooter}>
            {isLoadingMore ? (
              <View style={styles.listFooterRow}>
                <ActivityOrb size={22} />
                <AppText variant="caption" color="tertiary">
                  Loading more…
                </AppText>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => loadMore(genre)}
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

/** The Music `renderContent` — wired into SECTION_CONFIGS.MusicScreen. */
export const renderMusicContent: SectionBrowseConfig['renderContent'] = ctx => (
  <MusicContent ctx={ctx} />
);

// ─── Styles ─────────────────────────────────────────────────────────────
// Card + footer styles only — the grid/list container math is owned by
// SectionContent (Phase 4.3 parity: 16px edge / 8px col gap / 16px row gap).

const styles = StyleSheet.create({
  listFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  listFooterRow: {
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
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
  },
  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbImage: {
    width: 52,
    height: 52,
  },
  thumbPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
  trackInfo: {
    flex: 1,
    marginLeft: spacing.md,
    gap: 1,
  },
  trackName: {
    fontWeight: '600',
    lineHeight: 18,
  },
  trackRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
