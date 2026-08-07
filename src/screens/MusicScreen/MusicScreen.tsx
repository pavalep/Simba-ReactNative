// ─── Music Browser Screen ──────────────────────────────────────────────
// Phase 3 formula: search above a react-native-tab-view tab bar.
//   • each tab is a lazily-mounted TabView scene (native pager)
//   • every (tab, searchTerm, selectedGenre) scope is cached independently —
//     toggling tabs never refetches or clears already-loaded data
//   • each list paginates via onEndReached (infinite scroll)
// Tap a tab → see results list → tap a track → play.

import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {TabView, TabBar, type SceneRendererProps, type Route} from 'react-native-tab-view';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {
  useMusicScreen,
  MUSIC_TABS,
  JAMENDO_GENRES,
  type MusicTab,
  type MusicScopeState,
} from './hooks/useMusicScreen';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../components/feedback/Placeholder';
import {useToast} from '../../components/feedback/Toast';
import type {JamendoTrackResult} from '../../types/api';

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDuration(duration: number): string {
  if (!duration || duration <= 0) return '--:--';
  const m = Math.floor(duration / 60);
  const s = Math.round(duration % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
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
              <SvgIcon
                name="music"
                size={22}
                color={colors.accent.goldDim}
              />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.trackInfo}>
          <AppText
            variant="bodySmall"
            numberOfLines={1}
            style={styles.trackName}>
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
          <View
            style={[
              styles.playButton,
              {backgroundColor: colors.accent.gold},
            ]}>
            <SvgIcon
              name="play"
              size={14}
              color={colors.text.inverse}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

// ─── Tab Scene ──────────────────────────────────────────────────────────
// One lazily-mounted scene per tab. Owns its FlatList so each tab
// paginates independently; reads per-scope state from the screen hook.

interface MusicTabSceneProps {
  tab: MusicTab;
  scope: MusicScopeState;
  isSearchActive: boolean;
  isOnline: boolean;
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
  ensureLoaded: (tab: MusicTab) => void;
  loadMore: (tab: MusicTab) => void;
  retry: (tab: MusicTab) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onPressTrack: (item: JamendoTrackResult) => void;
}

const MusicTabScene: React.FC<MusicTabSceneProps> = React.memo(
  ({
    tab,
    scope,
    isSearchActive,
    isOnline,
    selectedGenre,
    onSelectGenre,
    ensureLoaded,
    loadMore,
    retry,
    refreshing,
    onRefresh,
    onPressTrack,
  }) => {
    const {colors} = useTheme();
    const toast = useToast();
    const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

    // [FIX-PODCASTS-LOOP] Stash ensureLoaded in a ref so this effect
    // doesn't re-fire every time the parent re-renders.
    const ensureLoadedRef = React.useRef(ensureLoaded);
    ensureLoadedRef.current = ensureLoaded;

    // Load page 1 for this scope on mount / whenever the scope key changes.
    React.useEffect(() => {
      ensureLoadedRef.current(tab);
    }, [tab]);

    // Surface page-1 load failures as a toast with a Retry action.
    // [FIX-PODCASTS-LOOP] deps only include state (not toast/retry fn refs)
    // to avoid infinite re-render. Track last shown error in a ref.
    const lastShownErrorRef = React.useRef<string | null>(null);
    React.useEffect(() => {
      const isPrompt =
        (tab === 'search' && !isSearchActive) ||
        (tab === 'genres' && !selectedGenre);
      const shouldShow = !isPrompt && !hasLoaded && !isLoading && !!error;
      const currentError = shouldShow ? error : null;
      if (currentError && currentError !== lastShownErrorRef.current) {
        lastShownErrorRef.current = currentError;
        toast.show(currentError, 'error', {
          duration: 8000,
          action: {
            label: 'Retry',
            onPress: () => {
              lastShownErrorRef.current = null;
              retry(tab);
            },
          },
        });
      } else if (!currentError) {
        lastShownErrorRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, isSearchActive, selectedGenre, hasLoaded, isLoading, error]);

    // Determine if this tab is in "prompt" state (prerequisites not met).
    const isSearchPrompt = tab === 'search' && !isSearchActive;
    const isGenrePrompt = tab === 'genres' && !selectedGenre;

    return (
      <View style={styles.scene}>
        {/* ── Genre chips (Genres tab only) ── */}
        {tab === 'genres' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreChipScroll}
            style={styles.genreChipBar}>
            {JAMENDO_GENRES.map(genre => {
              const active = selectedGenre === genre;
              return (
                <TouchableOpacity
                  key={genre}
                  activeOpacity={0.8}
                  onPress={() =>
                    onSelectGenre(active ? null : genre)
                  }
                  accessibilityRole="button"
                  accessibilityState={{selected: active}}
                  style={[
                    styles.genreChip,
                    {
                      backgroundColor: active
                        ? colors.accent.gold
                        : colors.background.elevated,
                      borderColor: active
                        ? colors.accent.gold
                        : colors.border.subtle,
                    },
                  ]}>
                  <AppText
                    variant="caption"
                    style={[
                      styles.genreChipText,
                      {
                        color: active
                          ? colors.text.inverse
                          : colors.text.secondary,
                      },
                    ]}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Prompt states (no fetch until prerequisite met) ── */}
        {isSearchPrompt && (
          <Placeholder
            variant="empty"
            anchor="top-third"
            icon="search"
            title="Search Jamendo for tracks."
          />
        )}

        {tab === 'genres' && isGenrePrompt && (
          <Placeholder
            variant="empty"
            anchor="top-third"
            icon="music"
            title="Select a genre above."
          />
        )}

        {/* ── Initial load ── */}
        {!isSearchPrompt &&
          !isGenrePrompt &&
          !hasLoaded &&
          isLoading && (
            <Placeholder
              variant="loading"
              anchor="top-third"
              title="Loading tracks…"
            />
          )}

        {/* ── Load failure (page 1) ──
            Toast surfaces the Retry action (see useEffect above).
            The Placeholder below keeps the screen from looking blank. */}

        {/* ── Load failure (page 1) — toast surfaces Retry; placeholder keeps
            the screen from looking blank ── */}
        {!isSearchPrompt &&
          !isGenrePrompt &&
          !hasLoaded &&
          !isLoading &&
          error &&
          items.length === 0 && (
            <Placeholder
              variant="empty"
              anchor="top-third"
              icon="alertCircle"
              title={isOnline ? "Couldn't load tracks." : "You're offline."}
              message="Use Retry at the bottom of the screen to try again."
            />
          )}

        {/* ── Empty scope (loaded, zero results) ── */}
        {!isSearchPrompt &&
          !isGenrePrompt &&
          hasLoaded &&
          !error &&
          items.length === 0 && (
            <Placeholder
              variant="empty"
              anchor="top-third"
              icon="folder"
              title={
                tab === 'search'
                  ? 'No tracks match your search.'
                  : tab === 'genres'
                  ? `No ${selectedGenre} tracks found.`
                  : 'No popular tracks found.'
              }
            />
          )}

        {/* ── List + infinite scroll ── */}
        {!isSearchPrompt && !isGenrePrompt && items.length > 0 && (
          <FlatList
            data={items}
            renderItem={({item}) => (
              <TrackCard item={item} onPress={onPressTrack} />
            )}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent.gold}
                colors={[colors.accent.gold]}
              />
            }
            onEndReached={() => loadMore(tab)}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoadingMore || error ? (
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
                      onPress={() => loadMore(tab)}
                      style={[
                        styles.loadMoreRetry,
                        {
                          borderColor:
                            colors.background.highlight,
                        },
                      ]}
                      accessibilityRole="button">
                      <AppText
                        variant="caption"
                        color="secondary">
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

export const MusicScreen: React.FC<
  RootStackScreenProps<'MusicScreen'>
> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {
    selectedTab,
    selectTab,
    selectedGenre,
    selectGenre,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    isOnline,
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refreshing,
    handleRefresh,
  } = useMusicScreen();

  const handleTrackPress = useCallback(
    (item: JamendoTrackResult) => {
      navigation.navigate('AudioPlayer', {
        fileUri: item.audioUrl,
        fileTitle: item.name,
        artworkUri: item.imageUrl,
        source: 'jamendo',
      });
    },
    [navigation],
  );

  // ── TabView wiring ──
  const routes = useMemo(
    () => MUSIC_TABS.map(t => ({key: t.key, title: t.title})),
    [],
  );
  const tabIndex = Math.max(
    0,
    MUSIC_TABS.findIndex(t => t.key === selectedTab),
  );

  const renderTabBar = useCallback(
    (
      props: SceneRendererProps & {
        navigationState: {index: number; routes: Route[]};
      },
    ) => (
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
        indicatorStyle={[
          styles.tabIndicator,
          {backgroundColor: colors.accent.gold},
        ]}
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
      const tab = tabRoute.key as MusicTab;
      return (
        <MusicTabScene
          tab={tab}
          scope={getScope(tab)}
          isSearchActive={isSearchActive}
          isOnline={isOnline}
          selectedGenre={selectedGenre}
          onSelectGenre={selectGenre}
          ensureLoaded={ensureLoaded}
          loadMore={loadMore}
          retry={retry}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onPressTrack={handleTrackPress}
        />
      );
    },
    [
      getScope,
      isSearchActive,
      selectedGenre,
      selectGenre,
      ensureLoaded,
      loadMore,
      retry,
      refreshing,
      handleRefresh,
      handleTrackPress,
    ],
  );

  const renderLazyPlaceholder = useCallback(
    ({route: tabRoute}: {route: Route}) => (
      <Placeholder
        variant="loading"
        anchor="top-third"
        title={`Loading ${MUSIC_TABS.find(t => t.key === tabRoute.key)?.title ?? 'tracks'}…`}
      />
    ),
    [],
  );

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.primary,
          paddingTop: insets.top,
        },
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Music" />

      {/* ── Search (stays put while tabs change) ── */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder="Search Jamendo…"
        />
      </View>

      {/* ── TabView (lazy scenes) ── */}
      <TabView
        navigationState={{index: tabIndex, routes}}
        onIndexChange={index => selectTab(routes[index].key as MusicTab)}
        renderTabBar={renderTabBar}
        renderScene={renderScene}
        renderLazyPlaceholder={renderLazyPlaceholder}
        lazy
        commonOptions={{labelStyle: styles.tabLabel}}
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
  // ── TabView ──
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
  // ── Genre chips ──
  genreChipBar: {
    maxHeight: 52,
  },
  genreChipScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  genreChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  genreChipText: {
    fontWeight: '700',
  },
  // ── List ──
  listContent: {
    padding: spacing.sm,
  },
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
  // ── Track card ──
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
