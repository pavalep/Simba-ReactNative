// ────────────────────────────────────────────────────────
// Simba Player — AlbumTrackList Component (Phase 17.6/17.8)
// Numbered track rows with playing indicator, duration, three-dot
// ────────────────────────────────────────────────────────

import React, {useState, useCallback} from 'react';
import {View, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import AudioWaveform from '../../../components/player/AudioWaveform/AudioWaveform';
import {MediaActionsSheet} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useQueueActions} from '../../../components/sheets/MediaActionsSheet/useQueueActions';

interface TrackItem {
  uri: string;
  title: string;
  duration: number;
  trackNumber: number;
}

interface AlbumTrackListProps {
  tracks: TrackItem[];
  isCurrentTrack: (uri: string) => boolean;
  isPlaying: boolean;
  onPlayTrack: (indexInAlbum: number) => void;
  formatDuration: (sec: number) => string;
  disableAnimation?: boolean;
}

export const AlbumTrackList: React.FC<AlbumTrackListProps> = React.memo(({
  tracks,
  isCurrentTrack,
  isPlaying,
  onPlayTrack,
  formatDuration,
}) => {
  const {colors} = useTheme();
  const {playNext, addToQueue} = useQueueActions();
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuTrack, setMenuTrack] = useState<{
    index: number;
    title: string;
    uri: string;
    duration: number;
  } | null>(null);

  const handleThreeDot = useCallback(
    (index: number, track: TrackItem) => {
      setMenuTrack({
        index,
        title: track.title,
        uri: track.uri,
        duration: track.duration,
      });
      setMenuVisible(true);
    },
    [],
  );

  // 59.2: stable renderItem — the inline renderItem was re-created on
  // every parent render, forcing all visible rows to re-render.
  const renderTrack = useCallback(
    ({item: track, index: idx}: {item: TrackItem; index: number}) => {
      const isActive = isCurrentTrack(track.uri);
      const isTrackPlaying = isActive && isPlaying;

      return (
        <TouchableOpacity
          key={track.uri}
          style={[
            styles.trackRow,
            {
              backgroundColor: isActive
                ? colors.accent.goldFaint
                : 'transparent',
            },
          ]}
          activeOpacity={0.6}
          onPress={() => onPlayTrack(idx)}
          onLongPress={() => handleThreeDot(idx, track)}
          delayLongPress={400}
          accessibilityRole="button"
          accessibilityLabel={`Play ${track.title}`}
          accessibilityState={{selected: isActive}}>
          {/* Number / Playing indicator */}
          <View style={styles.trackNumCol}>
            {isTrackPlaying ? (
              <AudioWaveform
                isPlaying={true}
                color={colors.accent.gold}
                size={16}
                barWidth={2}
                barGap={2}
              />
            ) : (
              <AppText variant="caption" color="tertiary">
                {track.trackNumber > 0 ? track.trackNumber : idx + 1}
              </AppText>
            )}
          </View>

          {/* Track title */}
          <View style={styles.trackTitleCol}>
            <AppText
              variant="body2"
              color={isActive ? 'accent' : 'primary'}
              numberOfLines={1}>
              {track.title}
            </AppText>
          </View>

          {/* Duration */}
          <View style={styles.trackDurationCol}>
            <AppText variant="caption" color="tertiary">
              {formatDuration(track.duration)}
            </AppText>
          </View>

          {/* Three-dot menu */}
          <TouchableOpacity
            style={styles.threeDotBtn}
            onPress={() => handleThreeDot(idx, track)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            activeOpacity={0.5}
            accessibilityRole="button"
            accessibilityLabel={`More options for ${track.title}`}>
            <SvgIcon name="sliders" size={14} color={colors.text.tertiary} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [colors, isCurrentTrack, isPlaying, onPlayTrack, formatDuration, handleThreeDot],
  );

  if (tracks.length === 0) {
    return (
      <View style={styles.emptyState}>
        <AppText variant="body2" color="tertiary" style={styles.emptyText}>
          No tracks in this album.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Column headers */}
      <View style={[styles.columnHeader, {borderBottomColor: colors.border.subtle}]}>
        <View style={styles.colNumHeader}>
          <AppText variant="caption" color="tertiary">#</AppText>
        </View>
        <View style={styles.colTitleHeader}>
          <AppText variant="caption" color="tertiary">Title</AppText>
        </View>
        <View style={styles.colDurationHeader}>
          <AppText variant="caption" color="tertiary">Duration</AppText>
        </View>
        <View style={styles.colSpacer} />
      </View>

      {/* Track rows */}
      <FlatList
        data={tracks}
        keyExtractor={track => track.uri}
        renderItem={renderTrack}
        scrollEnabled={false}
        initialNumToRender={tracks.length}
      />

      {/* 58.4/58.5: one menu everywhere — Play Next / Add to Queue / Play Now */}
      <MediaActionsSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title={menuTrack?.title ?? ''}
        actions={
          menuTrack
            ? [
                {
                  label: 'Play Next',
                  icon: 'skipForward',
                  onPress: () =>
                    playNext({
                      uri: menuTrack.uri,
                      title: menuTrack.title,
                      duration: menuTrack.duration,
                      mediaType: 'audio',
                    }),
                },
                {
                  label: 'Add to Queue',
                  icon: 'list',
                  onPress: () =>
                    addToQueue({
                      uri: menuTrack.uri,
                      title: menuTrack.title,
                      duration: menuTrack.duration,
                      mediaType: 'audio',
                    }),
                },
                {
                  label: 'Play Now',
                  icon: 'play',
                  onPress: () => onPlayTrack(menuTrack.index),
                },
              ]
            : []
        }
      />
    </View>
  );
},
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  colNumHeader: {
    width: 28,
    alignItems: 'center',
  },
  colTitleHeader: {
    flex: 1,
    marginLeft: 8,
  },
  colDurationHeader: {
    width: 56,
    alignItems: 'flex-end',
    marginRight: 4,
  },
  colSpacer: {
    width: 28,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  trackNumCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackTitleCol: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  trackDurationCol: {
    width: 56,
    alignItems: 'flex-end',
    marginRight: 4,
  },
  threeDotBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuSheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.xl,
    paddingBottom: 34,
    paddingHorizontal: spacing.lg,
  },
  menuTitle: {
    fontWeight: '600',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuItemLabel: {
    flex: 1,
  },
  emptyState: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
