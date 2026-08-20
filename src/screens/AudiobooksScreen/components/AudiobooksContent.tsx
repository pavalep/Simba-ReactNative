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

} from 'react-native';

import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';

import type {AudiobooksScreenProps} from '../../../navigation/types';
import {useAudiobooksScreen} from '../hooks/useAudiobooksScreen';

import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../../components/core/AppText/AppText';
import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {FilterChips} from '../../../components/utility/FilterChips';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {useToast} from '../../../components/feedback/Toast';
import {LIBRIVOX_GENRES} from '../../../constants/audiobookCategories';
import {archiveImageUrl, archiveIdentifierFromUrl} from '../../../services/api/internetArchiveService';
import type {AudiobookResult} from '../../../types/api';
import {AUDIOBOOK_SCOPE_CHIPS} from '../related/scopeConfig';
import {styles} from '../styles';
import type {
  AudiobooksTab,
  AudiobookScopeState,
  BookRow,
  BookCardProps,
  AudiobookTabSceneProps,
} from '../types';

type Props = AudiobooksScreenProps;

// v10 Wave 4: genre chips run through the shared FilterChips primitive (wrap mode)
const GENRE_CHIP_ITEMS = LIBRIVOX_GENRES.map(genre => ({
  key: genre,
  label: genre,
}));

// ─── Normalized row ────────────────────────────────────────────────────



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
          } />
      );
    }

    // ── Genre chips above the list (Genres tab, already loaded) ──
    const genreChipsHeader =
      tab === 'genres' ? (
        <FilterChips
          wrap
          items={GENRE_CHIP_ITEMS}
          selectedKey={selectedGenre}
          onSelect={selectGenre}
        />
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

export const AudiobooksScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {initialTab, initialGenre: genre} = route.params ?? {};
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

  const currentScope = getScope(selectedTab);

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

            <View style={styles.scopeSection}>
        <FilterChips
          wrap
          items={AUDIOBOOK_SCOPE_CHIPS}
          selectedKey={selectedTab}
          onSelect={key => selectTab(key as AudiobooksTab)}
        />
      </View>

      <AudiobookTabScene
        tab={selectedTab}
        scope={currentScope}
        isSearchActive={isSearchActive}
        selectedGenre={selectedGenre}
        selectGenre={selectGenre}
        ensureLoaded={ensureLoaded}
        loadMore={loadMore}
        retry={retry}
        onPressBook={handleBookPress}
      />

    </View>
  );
};

// ─── List helpers ───────────────────────────────────────────────────────

const ItemSeparator = () => <View style={styles.separator} />;
