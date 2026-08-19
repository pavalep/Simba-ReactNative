// ─── Internet Archive Browse Screen ────────────────────────────────────
// Phase 3 formula: search bar above a react-native-tab-view tab bar.
//   • Audio / Video are lazily-mounted scenes (native pager) — a scope is
//     a (tab, searchTerm) pair, cached independently so toggling tabs never
//     refetches or clears already-loaded data and search text survives.
//   • Every list paginates via onEndReached (infinite scroll) using IA's
//     `numFound` as the has-more boundary.
// Audio → ArchiveItemDetail (track list), video → MovieDetail (player).

import React, {useCallback, useMemo} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {
  TabView,
  type SceneRendererProps,
  type Route,
} from 'react-native-tab-view';
import {SectionTabBar} from './browse/TabBar';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {ArchiveScreenProps} from '../../navigation/types';
import {
  useArchiveScreen,
  type ArchiveTab,
  type AudioScopeState,
  type VideoScopeState,
} from './hooks/useArchiveScreen';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {SvgIcon, type SvgIconName} from '../../components/utility/SvgIcon';
import {FilterChips} from '../../components/utility/FilterChips';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../components/feedback/Placeholder';
import {useToast} from '../../components/feedback/Toast';
import {ARCHIVE_QUICK_SEARCHES} from '../../constants/audiobookCategories';
import type {
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
} from '../../types/api';

type Props = ArchiveScreenProps;

// v10 Wave 4: quick-search chips run through the shared FilterChips primitive
const QUICK_SEARCH_CHIP_ITEMS = ARCHIVE_QUICK_SEARCHES.map(entry => ({
  key: entry.query,
  label: entry.label,
  icon: entry.icon as SvgIconName,
}));

// ─── Normalized rows ───────────────────────────────────────────────────

interface ArchiveRow {
  identifier: string;
  title: string;
  creator: string;
  image: string;
  subtitle: string;
}

function audioToRow(item: InternetArchiveItemResult): ArchiveRow {
  return {
    identifier: item.identifier,
    title: item.title,
    creator: item.creator,
    image: item.imageUrl,
    subtitle: [item.year, item.runtime].filter(Boolean).join(' · '),
  };
}

function videoToRow(item: InternetArchiveVideoResult): ArchiveRow {
  return {
    identifier: item.identifier,
    title: item.title,
    creator: item.creator,
    image: item.imageUrl,
    subtitle: [item.year].filter(Boolean).join(' · '),
  };
}

// ─── Row Card ──────────────────────────────────────────────────────────

interface ArchiveCardProps {
  row: ArchiveRow;
  mediaType: ArchiveTab;
  onPress: (row: ArchiveRow, mediaType: ArchiveTab) => void;
}

const ArchiveCard: React.FC<ArchiveCardProps> = React.memo(
  ({row, mediaType, onPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row, mediaType)}
        style={[styles.card, {backgroundColor: colors.background.elevated}]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${row.title}`}>
        <View style={[styles.thumb, {backgroundColor: colors.border.subtle}]}>
          {row.image ? (
            <FastImage
              source={{uri: row.image}}
              style={styles.thumb}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <SvgIcon
              name={mediaType === 'video' ? 'video' : 'headphones'}
              size={22}
              color={colors.accent.gold}
            />
          )}
        </View>
        <View style={styles.info}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.name}>
            {row.title}
          </AppText>
          {row.creator ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {row.creator}
            </AppText>
          ) : null}
          {row.subtitle ? (
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {row.subtitle}
            </AppText>
          ) : null}
        </View>
        <SvgIcon
          name="chevronRight"
          size={18}
          color={colors.text.tertiary ?? colors.text.secondary}
        />
      </TouchableOpacity>
    );
  },
);

// ─── Tab Scene ─────────────────────────────────────────────────────────

interface ArchiveTabSceneProps {
  tab: ArchiveTab;
  scope: AudioScopeState | VideoScopeState;
  isSearchActive: boolean;
  isOnline: boolean;
  refreshing: boolean;
  ensureLoaded: (tab: ArchiveTab) => void;
  loadMore: (tab: ArchiveTab) => void;
  retry: (tab: ArchiveTab) => void;
  handleRefresh: () => void;
  onPressRow: (row: ArchiveRow, mediaType: ArchiveTab) => void;
}

const ArchiveTabScene: React.FC<ArchiveTabSceneProps> = React.memo(
  ({
    tab,
    scope,
    isSearchActive,
    isOnline,
    refreshing,
    ensureLoaded,
    loadMore,
    retry,
    handleRefresh,
    onPressRow,
  }) => {
    const {colors} = useTheme();
    const toast = useToast();
    const {hasLoaded, isLoading, isLoadingMore, error} = scope;

    // [FIX-PODCASTS-LOOP] Stash ensureLoaded in a ref.
    const ensureLoadedRef = React.useRef(ensureLoaded);
    ensureLoadedRef.current = ensureLoaded;

    // Auto-load page 1 the first time this scene mounts (lazy tab).
    React.useEffect(() => {
      ensureLoadedRef.current(tab);
    }, [tab]);

    // Surface page-1 load failures as a toast with a Retry action.
    // [FIX-PODCASTS-LOOP] deps only include state (not toast/retry fn refs).
    const lastShownErrorRef = React.useRef<string | null>(null);
    React.useEffect(() => {
      const shouldShow = !hasLoaded && !isLoading && !!error;
      const currentError = shouldShow
        ? isOnline
          ? 'Could not load archive.'
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
              retry(tab);
            },
          },
        });
      } else if (!currentError) {
        lastShownErrorRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasLoaded, isLoading, error, isOnline]);

    const rows = useMemo<ArchiveRow[]>(() => {
      if (tab === 'audio') {
        return (scope as AudioScopeState).items.map(audioToRow);
      }
      return (scope as VideoScopeState).items.map(videoToRow);
    }, [tab, scope]);

    // ── Initial page-1 loader ──
    if (!hasLoaded && isLoading) {
      return (
        <Placeholder
          variant="loading"
          anchor="top-third"
          title={`Loading ${tab === 'audio' ? 'Audio' : 'Video'}…`}
        />
      );
    }

    // ── Page-1 error ── toast surfaces Retry; placeholder keeps the
    //    screen from looking blank.
    if (!hasLoaded && !isLoading && error && rows.length === 0) {
      return (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="alertCircle"
          title={isOnline ? "Couldn't load archive." : "You're offline."}
          message="Use Retry at the bottom of the screen to try again."
        />
      );
    }

    // ── Empty (cached or fresh) ──
    if (hasLoaded && !error && rows.length === 0) {
      return (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="search"
          title={isSearchActive ? 'No results for this search.' : 'Nothing found here yet.'}
        />
      );
    }

    // ── Loaded list with infinite scroll ──
    return (
      <FlatList
        data={rows}
        keyExtractor={item => item.identifier}
        renderItem={({item}) => (
          <ArchiveCard row={item} mediaType={tab} onPress={onPressRow} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={ItemSeparator}
        onEndReached={() => loadMore(tab)}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isLoadingMore || error ? (
            <View style={styles.footer}>
              {isLoadingMore ? (
                <ActivityOrb size={22} />
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => loadMore(tab)}
                  style={[
                    styles.loadMoreRetry,
                    {borderColor: colors.border.subtle},
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Try loading more">
                  <AppText variant="caption" color="secondary">
                    Could not load more — tap to retry
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
      />
    );
  },
);

// ─── Component ─────────────────────────────────────────────────────────

export const ArchiveScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {initialTab, query} = route.params ?? {};
  const {
    tab,
    selectTab,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    submitSearch,
    isSearchActive,
    isOnline,
    refreshing,
    handleRefresh,
    getScope,
    ensureLoaded,
    loadMore,
    retry,
  } = useArchiveScreen(initialTab, query);

  const handleRowPress = useCallback(
    (row: ArchiveRow, mediaType: ArchiveTab) => {
      if (mediaType === 'video') {
        navigation.navigate('MovieDetail', {
          identifier: row.identifier,
          title: row.title,
        });
      } else {
        navigation.navigate('ArchiveItemDetail', {
          identifier: row.identifier,
          title: row.title,
        });
      }
    },
    [navigation],
  );

  const routes = useMemo<Route[]>(
    () => [
      {key: 'audio', title: 'Audio'},
      {key: 'video', title: 'Video'},
    ],
    [],
  );
  const tabIndex = tab === 'video' ? 1 : 0;

  const renderTabBar = useCallback(
    (props: SceneRendererProps & {navigationState: {index: number; routes: Route[]}}) => (
      <SectionTabBar {...props} />
    ),
    [],
  );

  const renderScene = useCallback(
    ({route: tabRoute}: {route: Route}) => {
      const t = tabRoute.key as ArchiveTab;
      return (
        <ArchiveTabScene
          tab={t}
          scope={getScope(t)}
          isSearchActive={isSearchActive}
          isOnline={isOnline}
          refreshing={refreshing}
          ensureLoaded={ensureLoaded}
          loadMore={loadMore}
          retry={retry}
          handleRefresh={handleRefresh}
          onPressRow={handleRowPress}
        />
      );
    },
    [
      getScope,
      isSearchActive,
      isOnline,
      refreshing,
      ensureLoaded,
      loadMore,
      retry,
      handleRefresh,
      handleRowPress,
    ],
  );

  const renderLazyPlaceholder = useCallback(
    ({route: tabRoute}: {route: Route}) => (
      <Placeholder
        variant="loading"
        anchor="top-third"
        title={`Loading ${tabRoute.key === 'audio' ? 'Audio' : 'Video'}…`}
      />
    ),
    [],
  );

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Internet Archive" />

      {/* ── Search — stays put while tabs change ── */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder={
            tab === 'audio'
              ? 'Search audio: radio, concerts, speeches…'
              : 'Search films & documentaries…'
          }
        />
        {/* Quick-search chips */}
        {!searchQuery.trim() && (
          <FilterChips
            items={QUICK_SEARCH_CHIP_ITEMS}
            selectedKey={null}
            onSelect={submitSearch}
          />
        )}
      </View>

      {/* ── TabView — lazy scenes + per-scope cache ── */}
      <TabView
        navigationState={{index: tabIndex, routes}}
        onIndexChange={index => selectTab(routes[index].key as ArchiveTab)}
        renderTabBar={renderTabBar}
        renderScene={renderScene}
        renderLazyPlaceholder={renderLazyPlaceholder}
        lazy
        style={styles.sceneContainer}
      />
    </View>
  );
};

const ItemSeparator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchSection: {
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  sceneContainer: {
    flex: 1,
  },
  // (Replaced by the shared <Placeholder> component.)
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 80,
  },
  separator: {
    height: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '600',
  },
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
