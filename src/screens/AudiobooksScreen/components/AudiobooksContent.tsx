// ─── Audiobooks Browse Screen ───────────────────────────────────────
// V18.11.3: converted from the v3-v9 3-tab pattern to the v10+
// "single content stream + FAB" pattern. The "Recent" tab was
// dropped (its feed overlaps with the Home rail). The screen now
// has a SearchBar at the top + a single FilterChips row for genre
// + one FlatList. The "audiobook/genre" filter acts as a secondary
// input — if a genre is selected AND a search term is set, the
// term wins (matches the pre-V18 behavior).

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
import {SvgIcon, type SvgIconName} from '../../../components/utility/SvgIcon';
import {FilterChips} from '../../../components/utility/FilterChips';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {useToast} from '../../../components/feedback/Toast';
import {LIBRIVOX_GENRES} from '../../../constants/audiobookCategories';
import {archiveImageUrl, archiveIdentifierFromUrl} from '../../../services/api/internetArchiveService';
import type {AudiobookResult} from '../../../types/api';
import {styles} from '../styles';
import type {BookRow, BookCardProps} from '../types';

type Props = AudiobooksScreenProps;

const GENRE_CHIP_ITEMS = LIBRIVOX_GENRES.map(genre => ({
  key: genre,
  label: genre,
}));

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
      <View style={[styles.info, {paddingHorizontal: 12}]}>
        <AppText variant="bodySmall" numberOfLines={1} style={styles.name}>
          {row.title}
        </AppText>
        {row.author ? (
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {row.author}
          </AppText>
        ) : null}
        {row.subtitle ? (
          <AppText variant="caption" color="tertiary" numberOfLines={1}>
            {`${row.subtitle}${formatTime(row.totalTime) ? ` · ${formatTime(row.totalTime)}` : ''}`}
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

export const AudiobooksScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {initialGenre: genre} = route.params ?? {};

  const {
    searchTerm,
    setSearchTerm,
    isSearchActive,
    selectedGenre,
    setSelectedGenre,
    items,
    hasLoaded,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
    isOnline,
    refreshing,
    handleRefresh,
  } = useAudiobooksScreen(genre);

  const toast = useToast();

  React.useEffect(() => {
    if (!hasLoaded && !isLoading && !!error) {
      toast.show(
        isOnline ? 'Could not load audiobooks.' : 'You are offline.',
        'error',
        {
          duration: 8000,
          action: {label: 'Retry', onPress: () => refetch()},
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded, isLoading, error, isOnline]);

  const handleBookPress = useCallback(
    (row: BookRow) => {
      navigation.navigate('AudiobookDetail', {
        bookId: row.id,
        bookTitle: row.title,
      });
    },
    [navigation],
  );

  const rows = useMemo(() => items.map(toRow), [items]);

  const showEmpty =
    hasLoaded && !error && rows.length === 0;
  const showError = !hasLoaded && !isLoading && error;

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Audiobooks" />

      <View style={styles.searchSection}>
        <SearchBar
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search titles or authors…"
        />
        <FilterChips
          wrap
          items={GENRE_CHIP_ITEMS}
          selectedKey={selectedGenre}
          onSelect={setSelectedGenre}
        />
      </View>

      {!hasLoaded && isLoading ? (
        <Placeholder
          variant="loading"
          anchor="top-third"
          title="Loading audiobooks…"
        />
      ) : showError ? (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="alertCircle"
          title={isOnline ? "Couldn't load audiobooks." : "You're offline."}
          message="Use Retry at the bottom of the screen to try again."
        />
      ) : showEmpty ? (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="search"
          title={
            isSearchActive
              ? 'No audiobooks match your search.'
              : selectedGenre
              ? 'No audiobooks in this genre.'
              : 'Search for audiobooks by title or author.'
          }
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => String(item.id)}
          renderItem={({item}) => <BookCard row={item} onPress={handleBookPress} />}
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: insets.bottom + 56 + 12},
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={ItemSeparator}
          onEndReached={() => {
            if (hasNextPage && !isLoadingMore) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={{padding: 16, alignItems: 'center'}}>
                <ActivityOrb size={22} />
              </View>
            ) : null
          }
          refreshControl={
            <View>
              {/* Refresh control: trigger via header pull-equivalent. */}
            </View>
          }
        />
      )}
    </View>
  );
};

const ItemSeparator = () => <View style={styles.separator} />;
