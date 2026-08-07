// ─── Audiobooks Browse Screen ────────────────────────────────────────
// Phase 3 formula: search bar above a react-native-tab-view tab bar.
//   • Search / Genres / New Releases are lazily-mounted scenes (native pager)
//   • each (tab, searchTerm, genre) scope is cached independently —
//     toggling tabs never refetches or clears already-loaded data
//   • every list paginates via onEndReached (infinite scroll)
// Tap a book → AudiobookDetail (chapter list + playback).

import React, {useCallback, useMemo} from 'react';
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
import type {AudiobooksScreenProps} from '../../navigation/types';
import {
  useAudiobooksScreen,
  type AudiobooksTab,
  type AudiobookScopeState,
} from './hooks/useAudiobooksScreen';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../components/feedback/Placeholder';
import {useToast} from '../../components/feedback/Toast';
import {LIBRIVOX_GENRES} from '../../constants/audiobookCategories';
import {archiveImageUrl, archiveIdentifierFromUrl} from '../../services/api/internetArchiveService';
import type {AudiobookResult} from '../../types/api';

type Props = AudiobooksScreenProps;

// ─── Normalized row ────────────────────────────────────────────────────

interface BookRow {
  id: number;
  title: string;
  author: string;
  image: string;
  subtitle: string;
  totalTime: number;
  language: string;
}

function toRow(book: AudiobookResult): BookRow {
  const identifier = archiveIdentifierFromUrl(book.urlIArchive);
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    image: identifier ? archiveImageUrl(identifier) : '',
    subtitle: [book.language].filter(Boolean).join(' · '),
    totalTime: book.totalTime,
    language: book.language,
  };
}

function formatTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Book Card ─────────────────────────────────────────────────────────

interface BookCardProps {
  row: BookRow;
  onPress: (row: BookRow) => void;
}

const BookCard: React.FC<BookCardProps> = React.memo(({row, onPress}) => {
  const {colors} = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(row)}
      style={[styles.card, {backgroundColor: colors.background.elevated}]}
      accessibilityRole="button"
      accessibilityLabel={`Open audiobook ${row.title}`}>
      <View style={[styles.thumb, {backgroundColor: colors.border.subtle}]}>
        {row.image ? (
          <FastImage
            source={{uri: row.image}}
            style={styles.thumb}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <SvgIcon name="headphones" size={22} color={colors.accent.gold} />
        )}
      </View>
      <View style={styles.info}>
        <AppText variant="bodySmall" numberOfLines={1} style={styles.name}>
          {row.title}
        </AppText>
        <AppText variant="caption" color="secondary" numberOfLines={1}>
          {row.author}
        </AppText>
        {row.subtitle || row.totalTime > 0 ? (
          <AppText variant="caption" color="tertiary" numberOfLines={1}>
            {[formatTime(row.totalTime), row.subtitle].filter(Boolean).join(' · ')}
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
});

// ─── Tab Scene ─────────────────────────────────────────────────────────

interface AudiobookTabSceneProps {
  tab: AudiobooksTab;
  scope: AudiobookScopeState;
  isSearchActive: boolean;
  selectedGenre: string | null;
  selectGenre: (genre: string) => void;
  ensureLoaded: (tab: AudiobooksTab) => void;
  loadMore: (tab: AudiobooksTab) => void;
  retry: (tab: AudiobooksTab) => void;
  onPressBook: (row: BookRow) => void;
}

const AudiobookTabScene: React.FC<AudiobookTabSceneProps> = React.memo(
  ({
    tab,
    scope,
    isSearchActive,
    selectedGenre,
    selectGenre,
    ensureLoaded,
    loadMore,
    retry,
    onPressBook,
  }) => {
    const {colors} = useTheme();
    const toast = useToast();
    const {items, hasLoaded, isLoading, isLoadingMore, error} = scope;

    // [FIX-PODCASTS-LOOP] Stash ensureLoaded in a ref.
    const ensureLoadedRef = React.useRef(ensureLoaded);
    ensureLoadedRef.current = ensureLoaded;
    React.useEffect(() => {
      ensureLoadedRef.current(tab);
    }, [tab]);

    // Surface page-1 load failures as a toast with a Retry action.
    // [FIX-PODCASTS-LOOP] deps only include state (not toast/retry fn refs).
    const lastShownErrorRef = React.useRef<string | null>(null);
    React.useEffect(() => {
      const shouldShow = !hasLoaded && !isLoading && !!error;
      const currentError = shouldShow ? 'Could not load results.' : null;
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
    }, [hasLoaded, isLoading, error]);

    const rows = useMemo<BookRow[]>(() => items.map(toRow), [items]);

    // ── Page-1 loader ──
    if (!hasLoaded && isLoading) {
      return (
        <Placeholder
          variant="loading"
          anchor="top-third"
          title="Loading audiobooks…"
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
          title="Couldn't load audiobooks."
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
          icon={tab === 'genres' ? 'layoutGrid' : 'headphones'}
          title={
            tab === 'search'
              ? isSearchActive
                ? 'No audiobooks match your search.'
                : 'Search for audiobooks by title or author.'
              : tab === 'genres'
              ? 'Select a genre to browse.'
              : 'No recent audiobooks found.'
          }>
          {/* Genre chips — only on the Genres tab when no results yet */}
          {tab === 'genres' && (
            <View style={styles.chipWrap}>
              {LIBRIVOX_GENRES.map(g => {
                const active = selectedGenre === g;
                return (
                  <TouchableOpacity
                    key={g}
                    activeOpacity={0.8}
                    onPress={() => selectGenre(g)}
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
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{selected: active}}>
                    <AppText
                      variant="caption"
                      style={{
                        color: active
                          ? colors.background.primary
                          : colors.text.secondary,
                        fontWeight: '700',
                      }}>
                      {g}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Placeholder>
      );
    }

    // ── Genre chips above the list (Genres tab, already loaded) ──
    const genreChipsHeader =
      tab === 'genres' ? (
        <View style={styles.chipWrap}>
          {LIBRIVOX_GENRES.map(g => {
            const active = selectedGenre === g;
            return (
              <TouchableOpacity
                key={g}
                activeOpacity={0.8}
                onPress={() => selectGenre(g)}
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
                ]}
                accessibilityRole="button"
                accessibilityState={{selected: active}}>
                <AppText
                  variant="caption"
                  style={{
                    color: active
                      ? colors.background.primary
                      : colors.text.secondary,
                    fontWeight: '700',
                  }}>
                  {g}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null;

    // ── Loaded list with infinite scroll ──
    return (
      <FlatList
        data={rows}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => (
          <BookCard row={item} onPress={onPressBook} />
        )}
        ListHeaderComponent={genreChipsHeader}
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
                  accessibilityRole="button">
                  <AppText variant="caption" color="secondary">
                    Could not load more — tap to retry
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        windowSize={5}
        maxToRenderPerBatch={10}
      />
    );
  },
);

// ─── Screen ────────────────────────────────────────────────────────────

const TABS: Array<{key: AudiobooksTab; title: string}> = [
  {key: 'search', title: 'Search'},
  {key: 'genres', title: 'Genres'},
  {key: 'recent', title: 'New Releases'},
];

export const AudiobooksScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {initialTab, genre} = route.params ?? {};
  const {
    selectedTab,
    selectTab,
    selectedGenre,
    selectGenre,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    getScope,
    ensureLoaded,
    loadMore,
    retry,
  } = useAudiobooksScreen(initialTab, genre);

  const handleBookPress = useCallback(
    (row: BookRow) => {
      navigation.navigate('AudiobookDetail', {
        bookId: row.id,
        bookTitle: row.title,
      });
    },
    [navigation],
  );

  // ── TabView wiring ──
  const routes = useMemo(
    () => TABS.map(t => ({key: t.key, title: t.title})),
    [],
  );
  const tabIndex = Math.max(
    0,
    TABS.findIndex(t => t.key === selectedTab),
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
      const t = tabRoute.key as AudiobooksTab;
      return (
        <AudiobookTabScene
          tab={t}
          scope={getScope(t)}
          isSearchActive={isSearchActive}
          selectedGenre={selectedGenre}
          selectGenre={selectGenre}
          ensureLoaded={ensureLoaded}
          loadMore={loadMore}
          retry={retry}
          onPressBook={handleBookPress}
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
      handleBookPress,
    ],
  );

  const renderLazyPlaceholder = useCallback(
    ({route: tabRoute}: {route: Route}) => (
      <Placeholder
        variant="loading"
        anchor="top-third"
        title={`Loading ${TABS.find(t => t.key === tabRoute.key)?.title ?? 'tab'}…`}
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
      <InternalHeader title="Audiobooks" />

      {/* ── Search (stays put while tabs change) ── */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onDebouncedChange={setSearchTerm}
          placeholder="Search titles or authors…"
        />
      </View>

      {/* ── TabView (lazy scenes) ── */}
      <TabView
        navigationState={{index: tabIndex, routes}}
        onIndexChange={index => selectTab(routes[index].key as AudiobooksTab)}
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

// ─── Styles ────────────────────────────────────────────────────────────

const ItemSeparator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  // ── Center states ──
  // (Replaced by the shared <Placeholder> component.)
  // ── Genre chips ──
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  genreChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  // ── List ──
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
    width: 52,
    height: 52,
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
