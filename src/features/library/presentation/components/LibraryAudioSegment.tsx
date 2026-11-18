import React from 'react';
import {View, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {EmptyState} from '../../../../components/feedback/EmptyState/EmptyState';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {WaveformBars} from '../../../../components/feedback/WaveformBars/WaveformBars';
import {radius, ColorTokens} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import {
  PlaylistSheet,
  type PlaylistSheetProps,
} from '../../../../components/sheets/PlaylistSheet/PlaylistSheet';

import {linkedMediaFolderId} from '../../../../types/media';
import type {LocalMediaFilter, SortOption} from '../types';
import MediaListItem from './MediaListItem';

interface LibraryAudioSegmentProps {
  audioFolders: string[];
  scannedTracks: ScannedTrack[];
  filterType: LocalMediaFilter;
  sortBy: SortOption;
  colors: ColorTokens;
  viewMode?: 'grid' | 'list';
  isAudioPlaying?: boolean;
  currentAudioUri?: string | null;
  onNavigateToFolderBrowser: (folderPath: string) => void;
  onNavigateToLinkedFolders: (type: 'video' | 'audio') => void;
  onMediaPress: (track: ScannedTrack) => void;
}

export const LibraryAudioSegment: React.FC<LibraryAudioSegmentProps> = React.memo(({
  audioFolders,
  scannedTracks,
  filterType,
  sortBy,
  colors,
  isAudioPlaying = false,
  onNavigateToFolderBrowser,
  onNavigateToLinkedFolders,
  onMediaPress,
}) => {
  // The track whose playlist picker is open. The segment owns the scanned
  // tracks, so it owns the ONE playlist picker the rows open — a list must
  // not mount a sheet per row.
  const [playlistTrack, setPlaylistTrack] = React.useState<ScannedTrack | null>(null);

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          gap: 12,
        },
        nowPlayingBanner: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: radius.md,
          backgroundColor: colors.accent.goldSoft,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.accent.gold,
        },
        nowPlayingLabel: {
          // 600 lives in the family key — see src/constants/fontFamily.ts
          fontFamily: FONT_FAMILY.inter.semibold,
        },
        nowPlayingSpacer: {
          flex: 1,
        },
        folderGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
        },
        folderCard: {
          width: '100%',
          paddingVertical: 16,
          paddingHorizontal: 16,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.subtle,
        },
        folderCardRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        folderCardLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          gap: 12,
        },
        folderIconWrap: {
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent.goldSoft,
        },
        folderLabel: {
          flex: 1,
        },
        folderPath: {
          fontSize: 12,
          marginTop: 2,
        },
        ctaButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.accent.gold,
          gap: 8,
        },
        ctaIcon: {
          width: 18,
          height: 18,
        },
      }),
    [colors],
  );

  const visibleTracks = React.useMemo(() => {
    const filtered = scannedTracks.filter(track =>
      filterType === 'all' ? true : track.mediaType === filterType,
    );
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'dateAdded':
          return (b.dateAdded ?? 0) - (a.dateAdded ?? 0);
        case 'size':
          return (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0);
        case 'duration':
          return b.duration - a.duration;
        case 'artist':
          return a.artist.localeCompare(b.artist);
        case 'album':
          return a.album.localeCompare(b.album);
        case 'name':
        default:
          return a.title.localeCompare(b.title);
      }
    });
  }, [filterType, scannedTracks, sortBy]);

  /**
   * What the playlist picker receives. `ScannedTrack.duration` is SECONDS and
   * `PlaylistItem.duration` is SECONDS — the same unit, so there is nothing
   * to convert here. (The row's own `duration` prop is MILLISECONDS; that
   * conversion lives in `MediaListItem`, at the queue seam.)
   */
  const playlistItem = React.useMemo<PlaylistSheetProps['currentItem']>(
    () =>
      playlistTrack
        ? {
            fileUri: playlistTrack.uri,
            title: playlistTrack.title,
            duration: playlistTrack.duration,
            artist: playlistTrack.artist,
            album: playlistTrack.album,
            thumbnailPath: playlistTrack.albumArtUri || undefined,
            source: playlistTrack.source,
            type: playlistTrack.type,
            mediaType: playlistTrack.mediaType,
            provider: playlistTrack.provider,
            folderId: playlistTrack.folderId,
          }
        : {fileUri: '', title: '', duration: 0},
    [playlistTrack],
  );

  if (audioFolders.length === 0 && visibleTracks.length === 0) {
    return (
      <EmptyState
        icon="music"
        title="No audio files yet"
        description="Link an audio folder and Simba will scan it into your library."
        actionLabel="Link folders"
        onAction={() => onNavigateToLinkedFolders('audio')}
      />
    );
  }

  return (
    <View style={styles.wrapper}>
      {isAudioPlaying && (
        <View style={styles.nowPlayingBanner}>
          <WaveformBars height={20} barWidth={3} gap={2} barCount={4} />
          <AppText variant="body2" color="accent" style={styles.nowPlayingLabel}>
            Now Playing
          </AppText>
          <View style={styles.nowPlayingSpacer} />
          <SvgIcon name="music" size={16} color={colors.accent.gold} />
        </View>
      )}

      {visibleTracks.length > 0 && (
        <FlatList
          data={visibleTracks}
          keyExtractor={track => track.uri}
          renderItem={({item}) => (
            <MediaListItem
              id={item.uri}
              title={item.title}
              duration={item.duration * 1000}
              artist={item.artist}
              // The scanner's classification, passed down as-is. The queue
              // and the playlist must carry the REAL kind of the file.
              source={item.source}
              type={item.type}
              mediaType={item.mediaType}
              provider={item.provider}
              folderId={item.folderId}
              onPress={() => onMediaPress(item)}
              onAddToPlaylist={() => setPlaylistTrack(item)}
            />
          )}
          scrollEnabled={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      )}

      <View style={styles.folderGrid}>
        {/* 59.1: virtualized instead of .map */}
        <FlatList
          data={audioFolders}
          keyExtractor={folder => linkedMediaFolderId(folder, 'audio')}
          renderItem={({item: folder}) => (
            <TouchableOpacity
              style={styles.folderCard}
              activeOpacity={0.7}
              accessibilityRole="button"
              onPress={() => onNavigateToFolderBrowser(folder)}>
              <View style={styles.folderCardRow}>
                <View style={styles.folderCardLeft}>
                  <View style={styles.folderIconWrap}>
                    <SvgIcon name="folder" size={18} color={colors.accent.gold} />
                  </View>
                  <View style={styles.folderLabel}>
                    <AppText variant="body2" color="primary" numberOfLines={1}>
                      {folder.split('/').pop() || folder}
                    </AppText>
                    <AppText variant="caption" color="tertiary" style={styles.folderPath} numberOfLines={1}>
                      {folder}
                    </AppText>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          scrollEnabled={false}
          initialNumToRender={audioFolders.length}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.ctaButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              onPress={() => onNavigateToLinkedFolders('audio')}>
              <SvgIcon name="folder" size={18} color={colors.accent.gold} style={styles.ctaIcon} />
              <AppText variant="body2" color="accent">
                + Add Audio Folder
              </AppText>
            </TouchableOpacity>
          }
        />
      </View>

      {/* The app's ONE playlist picker. The rows' "Add to Playlist" opens it. */}
      <PlaylistSheet
        visible={playlistTrack !== null}
        onClose={() => setPlaylistTrack(null)}
        currentItem={playlistItem}
      />
    </View>
  );
},
);

import type {ScannedTrack} from '../../../../state';
