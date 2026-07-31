// ─── Music Browser Screen ──────────────────────────────────────────────
// Browse free music from Jamendo and Audius APIs with genre category chips.

import React, {useCallback, useState} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {
  useMusicScreen,
  type MusicTrackDisplayItem,
} from './hooks/useMusicScreen';
import {MUSIC_CATEGORIES} from '../../constants/musicCategories';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet/PlaylistSheet';
import {MediaActionsSheet} from '../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useQueueActions} from '../../components/sheets/MediaActionsSheet/useQueueActions';
import {getJamendoTrackById} from '../../services/api/jamendoService';
import {getAudiusTrackById} from '../../services/api/audiusService';
import type {PlaylistSheetProps} from '../../components/sheets/PlaylistSheet/PlaylistSheet';
import {startDownload} from '../../services/downloadService';
import {useAppSelector} from '../../store';
import {selectDownloadedUriSet} from '../../store/slices/downloadsSlice';
import {useToast} from '../../components/feedback/Toast/Toast';

// ─── Helpers ────────────────────────────────────────────────────────────

function fmtDur(s: number): string {
  if (!s || s <= 0) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Genre Chip ─────────────────────────────────────────────────────────

interface GenreChipProps {
  category: (typeof MUSIC_CATEGORIES)[number];
  isSelected: boolean;
  onPress: () => void;
}

const GenreChip: React.FC<GenreChipProps> = React.memo(
  ({category, isSelected, onPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{selected: isSelected}}
        style={[
          styles.chip,
          {
            backgroundColor: isSelected
              ? colors.accent.gold
              : colors.background.elevated,
            borderColor: isSelected
              ? colors.accent.gold
              : colors.border.subtle,
          },
        ]}>
        <AppText
          variant="button"
          style={[
            styles.chipText,
            {color: isSelected ? colors.text.inverse : colors.text.secondary},
          ]}>
          {category.name}
        </AppText>
      </TouchableOpacity>
    );
  },
);

// ─── Track Card ─────────────────────────────────────────────────────────

interface TrackCardProps {
  item: MusicTrackDisplayItem;
  onPress: (item: MusicTrackDisplayItem) => void;
  onLongPress: (item: MusicTrackDisplayItem) => void;
}

const TrackCard: React.FC<TrackCardProps> = React.memo(
  ({item, onPress, onLongPress}) => {
    const {colors} = useTheme();
    const hasImage = item.imageUrl.length > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
        accessibilityRole="button"
        style={[
          styles.trackCard,
          {backgroundColor: colors.background.elevated},
        ]}>
        {/* Square image area */}
        <View
          style={[
            styles.imageWrap,
            {backgroundColor: colors.background.primary},
          ]}>
          {hasImage ? (
            <FastImage
              source={{uri: item.imageUrl}}
              style={styles.artworkImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <SvgIcon name="music" size={28} color={colors.accent.goldDim} />
            </View>
          )}
          {/* Duration badge */}
          <View
            style={[styles.durationBadge, {backgroundColor: colors.background.scrimMid}]}>
            <AppText
              variant="caption"
              style={[styles.durationText, {color: colors.text.bright}]}>
              {fmtDur(item.duration)}
            </AppText>
          </View>
        </View>

        {/* Info */}
        <View style={styles.trackInfo}>
          <AppText
            variant="bodySmall"
            numberOfLines={1}
            style={styles.trackTitle}>
            {item.title}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {item.artistName}
          </AppText>
        </View>
      </TouchableOpacity>
    );
  },
);

// ─── Screen ─────────────────────────────────────────────────────────────

export const MusicScreen: React.FC<
  RootStackScreenProps<'MusicScreen'>
> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {
    selectedCategory,
    results,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
  } = useMusicScreen(route.params?.genre);

  // P41.4: genre chips open the full genre detail page
  // (local library + streaming catalog + moods + radio)
  const handleChipPress = useCallback(
    (genre: string) => {
      navigation.navigate('GenreScreen', {genre});
    },
    [navigation],
  );

  const handleTrackPress = useCallback(
    (item: MusicTrackDisplayItem) => {
      navigation.navigate('MusicDetail', {
        trackId: String(item.id),
        source: item.source,
      });
    },
    [navigation],
  );

  // P34.1/34.7: long-press → standard actions menu; grid items carry no
  // audio URL, so the full track is resolved before the menu opens.
  const [sheetItem, setSheetItem] = useState<
    PlaylistSheetProps['currentItem'] | null
  >(null);
  const [menuState, setMenuState] = useState<{
    item: MusicTrackDisplayItem;
    uri: string;
    title: string;
    duration: number;
    source: 'jamendo' | 'audius';
  } | null>(null);
  const {playNext, addToQueue} = useQueueActions();
  const toast = useToast();
  const downloadedUris = useAppSelector(selectDownloadedUriSet);

  const resolveFull = useCallback(async (item: MusicTrackDisplayItem) => {
    const full =
      item.source === 'jamendo'
        ? await getJamendoTrackById(Number(item.id))
        : await getAudiusTrackById(String(item.id));
    if (!full) return null;
    return {
      fileUri: 'audioUrl' in full ? full.audioUrl : full.streamUrl,
      title: 'name' in full ? full.name : full.title,
      duration: full.duration,
      artist: full.artistName,
      album: 'albumName' in full ? full.albumName : undefined,
      thumbnailPath: 'imageUrl' in full ? full.imageUrl : full.artworkUrl,
    };
  }, []);

  const handleTrackLongPress = useCallback(
    async (item: MusicTrackDisplayItem) => {
      try {
        const full = await resolveFull(item);
        if (!full) return;
        setMenuState({
          item,
          uri: full.fileUri,
          title: full.title,
          duration: full.duration,
          source: item.source,
        });
      } catch {
        // Long-press is a convenience gesture — resolve silently.
      }
    },
    [resolveFull],
  );

  const handleMenuPlayNext = useCallback(() => {
    if (!menuState) return;
    playNext({
      uri: menuState.uri,
      title: menuState.title,
      duration: menuState.duration,
      source: menuState.source,
      mediaType: 'audio',
    });
  }, [menuState, playNext]);

  const handleMenuAddToQueue = useCallback(() => {
    if (!menuState) return;
    addToQueue({
      uri: menuState.uri,
      title: menuState.title,
      duration: menuState.duration,
      source: menuState.source,
      mediaType: 'audio',
    });
  }, [menuState, addToQueue]);

  const handleMenuSaveToPlaylist = useCallback(async () => {
    if (!menuState) return;
    try {
      const full = await resolveFull(menuState.item);
      if (!full) return;
      setSheetItem({
        fileUri: full.fileUri,
        title: full.title,
        duration: full.duration,
        artist: full.artist,
        album: full.album,
        thumbnailPath: full.thumbnailPath,
        source: menuState.source,
        mediaType: 'audio',
      });
    } catch {}
  }, [menuState, resolveFull]);

  const handleMenuDownload = useCallback(() => {
    if (!menuState) return;
    startDownload({
      uri: menuState.uri,
      title: menuState.title,
      mediaType: 'audio',
      source: menuState.source,
    }).catch(() => toast.show('Download failed'));
  }, [menuState, toast]);

  const menuIsDownloaded = menuState ? downloadedUris.has(menuState.uri) : false;

  const isEmpty = results.length === 0 && !isLoading && !error;

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Music" />

      {/* ── Search Bar (53.2: core SearchBar) ── */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search tracks…"
        />
      </View>

      {/* ── Genre Chips ── */}
      <View
        style={[
          styles.chipSection,
          {borderBottomColor: colors.border.subtle},
        ]}>
        <FlatList
          horizontal
          data={MUSIC_CATEGORIES}
          keyExtractor={cat => cat.id}
          renderItem={({item: cat}) => (
            <GenreChip
              category={cat}
              isSelected={selectedCategory === cat.genre}
              onPress={() => handleChipPress(cat.genre)}
            />
          )}
          contentContainerStyle={styles.chipScroll}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={MUSIC_CATEGORIES.length}
          windowSize={5}
          maxToRenderPerBatch={12}
        />
      </View>

      {/* ── Content Area ── */}
      <View style={styles.contentArea}>
        {isLoading && (
          <View style={styles.centerState}>
            <ActivityOrb />
            <AppText
              variant="body2"
              color="tertiary"
              style={styles.stateText}>
              Loading tracks...
            </AppText>
          </View>
        )}

        {error && !isLoading && (
          <View style={styles.centerState}>
            <SvgIcon name="alertCircle" size={40} color={colors.semantic.error} />
            <AppText
              variant="body2"
              color="tertiary"
              style={styles.stateText}>
              {error}
            </AppText>
          </View>
        )}

        {isEmpty && !isLoading && (
          <View style={styles.centerState}>
            <SvgIcon name="music" size={40} color={colors.accent.goldDim} />
            <AppText
              variant="body2"
              color="tertiary"
              style={styles.stateText}>
              No tracks found
            </AppText>
          </View>
        )}

        {!isLoading && !error && results.length > 0 && (
          <FlatList
            data={results}
            renderItem={({item}) => (
              <TrackCard
                item={item}
                onPress={handleTrackPress}
                onLongPress={handleTrackLongPress}
              />
            )}
            keyExtractor={item => `${item.source}-${item.id}`}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({length: 76, offset: 76 * index, index})}
            windowSize={5}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
          />
        )}
      </View>

      {/* P34.1: add streaming track to a playlist (long-press menu) */}
      <PlaylistSheet
        visible={sheetItem !== null}
        onClose={() => setSheetItem(null)}
        currentItem={
          sheetItem ?? {fileUri: '', title: '', duration: 0}
        }
      />

      {/* 58.4/58.5: standard long-press menu — Play Next / Queue / Playlist / Download */}
      <MediaActionsSheet
        visible={menuState !== null}
        onClose={() => setMenuState(null)}
        title={menuState?.title ?? 'Track Options'}
        subtitle={menuState?.item.artistName}
        actions={[
          {
            label: 'Play Next',
            icon: 'skipForward',
            onPress: handleMenuPlayNext,
          },
          {
            label: 'Add to Queue',
            icon: 'list',
            onPress: handleMenuAddToQueue,
          },
          {
            label: 'Save to Playlist',
            icon: 'listMusic',
            onPress: handleMenuSaveToPlaylist,
          },
          {
            label: menuIsDownloaded ? 'Downloaded' : 'Download',
            icon: 'download',
            onPress: menuIsDownloaded ? () => {} : handleMenuDownload,
          },
        ]}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  chipSection: {
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
  },
  chipScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
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
  gridContent: {
    padding: spacing.sm,
  },
  gridRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  trackCard: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.xs,
  },
  artworkImage: {
    ...StyleSheet.absoluteFill,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
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
  trackInfo: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  trackTitle: {
    fontWeight: '700',
    lineHeight: 16,
  },
});
