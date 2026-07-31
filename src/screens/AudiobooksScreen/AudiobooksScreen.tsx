// ─── Audiobooks Browse Screen ─────────────────────────────────────────
// Phase 37.1: browse LibriVox by search / genre / recent. Tap a book →
// AudiobookDetail (chapter list + playback). Long-press is on detail.

import React, {useCallback} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {AudiobooksScreenProps} from '../../navigation/types';
import {
  useAudiobooksScreen,
  type AudiobooksMode,
} from './hooks/useAudiobooksScreen';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ErrorState} from '../../components/feedback/ErrorState/ErrorState';
import {SkeletonList} from '../../components/core/Skeleton/SkeletonList';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import FastImage from 'react-native-fast-image';
import {LIBRIVOX_GENRES} from '../../constants/audiobookCategories';
import {archiveImageUrl, archiveIdentifierFromUrl} from '../../services/api/internetArchiveService';
import type {AudiobookResult} from '../../types/api';

type Props = AudiobooksScreenProps;

// ─── Modes ─────────────────────────────────────────────────────────────

const MODES: Array<{id: AudiobooksMode; label: string}> = [
  {id: 'search', label: 'Search'},
  {id: 'genres', label: 'Genres'},
  {id: 'recent', label: 'New Releases'},
];

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
          <SvgIcon name="music" size={22} color={colors.accent.gold} />
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

// ─── Component ─────────────────────────────────────────────────────────

export const AudiobooksScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const {initialTab, genre} = route.params ?? {};
  const {
    mode,
    setMode,
    selectedGenre,
    setSelectedGenre,
    books,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    isOnline,
    refreshing,
    handleRefresh,
    retry,
  } = useAudiobooksScreen(initialTab, genre);

  const rows = React.useMemo(() => books.map(toRow), [books]);

  const handleBookPress = useCallback(
    (row: BookRow) => {
      navigation.navigate('AudiobookDetail', {
        bookId: row.id,
        bookTitle: row.title,
      });
    },
    [navigation],
  );

  const showGenreChips = mode === 'genres';
  const showSearch = mode === 'search';
  const isEmpty = !isLoading && !error && rows.length === 0;

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary}]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Audiobooks" />

      <View style={styles.content}>
        {/* Mode chips */}
        <View style={styles.modeRow}>
          <FlatList
            horizontal
            data={MODES}
            keyExtractor={m => m.id}
            renderItem={({item: m}) => {
              const active = mode === m.id;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setMode(m.id)}
                  style={[
                    styles.modeChip,
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
                  accessibilityState={{selected: active}}
                  accessibilityLabel={`${m.label} mode`}>
                  <AppText
                    variant="caption"
                    style={[
                      styles.modeChipText,
                      {
                        color: active
                          ? colors.background.primary
                          : colors.text.secondary,
                      },
                    ]}>
                    {m.label}
                  </AppText>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.modeRail}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            initialNumToRender={MODES.length}
          />
        </View>

        {showSearch && (
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search titles or authors…"
          />
        )}

        {showGenreChips && (
          <View style={styles.chipWrap}>
            {LIBRIVOX_GENRES.map(g => {
              const active = selectedGenre === g;
              return (
                <TouchableOpacity
                  key={g}
                  activeOpacity={0.8}
                  onPress={() => setSelectedGenre(g)}
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
                  accessibilityState={{selected: active}}
                  accessibilityLabel={`Genre ${g}`}>
                  <AppText
                    variant="caption"
                    style={[
                      styles.modeChipText,
                      {
                        color: active
                          ? colors.background.primary
                          : colors.text.secondary,
                      },
                    ]}>
                    {g}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {isLoading && <SkeletonList count={6} />}

        {!isLoading && error && (
          <ErrorState
            message={isOnline ? error : 'You are offline.'}
            onRetry={retry}
          />
        )}

        {isEmpty && (
          <View style={styles.centerState}>
            <SvgIcon name="music" size={40} color={colors.accent.goldDim} />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              {mode === 'search'
                ? 'No audiobooks found. Try another title or author.'
                : 'No audiobooks in this category.'}
            </AppText>
          </View>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <FlatList
            data={rows}
            keyExtractor={item => String(item.id)}
            renderItem={({item}) => (
              <BookCard row={item} onPress={handleBookPress} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={ItemSeparator}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.accent.gold}
                colors={[colors.accent.gold]}
              />
            }
          />
        )}
      </View>
    </View>
  );
};

const ItemSeparator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  modeRow: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  modeRail: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  modeChipText: {
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  genreChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
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
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
    paddingBottom: 80,
  },
  stateText: {
    textAlign: 'center',
  },
});
