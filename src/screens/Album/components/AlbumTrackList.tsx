// ────────────────────────────────────────────────────────
// Simba Player — AlbumTrackList Component (Phase 17.6/17.8)
// Numbered track rows with playing indicator, duration, three-dot
// ────────────────────────────────────────────────────────

import React, {useState, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActionSheetIOS,
  Platform,
  Modal,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import AudioWaveform from '../../../components/player/AudioWaveform/AudioWaveform';

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

export const AlbumTrackList: React.FC<AlbumTrackListProps> = ({
  tracks,
  isCurrentTrack,
  isPlaying,
  onPlayTrack,
  formatDuration,
}) => {
  const {colors} = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuTrack, setMenuTrack] = useState<{
    index: number;
    title: string;
  } | null>(null);

  const handleThreeDot = useCallback(
    (index: number, title: string) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Play', 'Add to Playlist', 'Go to Artist'],
            cancelButtonIndex: 0,
          },
          btnIndex => {
            if (btnIndex === 1) onPlayTrack(index);
          },
        );
      } else {
        setMenuTrack({index, title});
        setMenuVisible(true);
      }
    },
    [onPlayTrack],
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
      {tracks.map((track, idx) => {
        const isActive = isCurrentTrack(track.uri);
        const isTrackPlaying = isActive && isPlaying;

        return (
          <TouchableOpacity
            key={track.uri}
            style={[
              styles.trackRow,
              {
                backgroundColor: isActive
                  ? 'rgba(201,168,76,0.06)'
                  : 'transparent',
              },
            ]}
            activeOpacity={0.6}
            onPress={() => onPlayTrack(idx)}
            onLongPress={() => handleThreeDot(idx, track.title)}
            delayLongPress={400}>
            {/* Number / Playing indicator */}
            <View style={styles.trackNumCol}>
              {isTrackPlaying ? (
                <AudioWaveform
                  isPlaying={true}
                  color="#C9A84C"
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
              onPress={() => handleThreeDot(idx, track.title)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              activeOpacity={0.5}>
              <SvgIcon name="sliders" size={14} color={colors.text.tertiary} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}

      {/* Android context menu modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}>
          <View
            style={[
              styles.menuSheet,
              {backgroundColor: colors.background.elevated},
            ]}>
            <AppText
              variant="body2"
              color="primary"
              style={styles.menuTitle}
              numberOfLines={1}>
              {menuTrack?.title ?? ''}
            </AppText>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                if (menuTrack) onPlayTrack(menuTrack.index);
                setMenuVisible(false);
              }}>
              <SvgIcon name="play" size={18} color={colors.text.primary} />
              <AppText variant="body2" color="primary" style={styles.menuItemLabel}>
                Play
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setMenuVisible(false)}>
              <SvgIcon name="close" size={18} color={colors.text.tertiary} />
              <AppText variant="body2" color="secondary" style={styles.menuItemLabel}>
                Cancel
              </AppText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
