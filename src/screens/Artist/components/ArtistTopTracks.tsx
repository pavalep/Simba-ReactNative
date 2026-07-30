// ────────────────────────────────────────────────────────
// Simba Player — ArtistTopTracks Component (Phase 16.4/16.8)
// Top 5 tracks with number/title/duration + See All
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
import type {PlaylistEntry} from '../../../store/slices/playerSlice';

interface TrackRowItem {
  uri: string;
  title: string;
  album: string;
  duration: number;
}

interface ArtistTopTracksProps {
  tracks: TrackRowItem[];
  isCurrentTrack: (uri: string) => boolean;
  isPlaying: boolean;
  onPlayTrack: (item: PlaylistEntry) => void;
  onSeeAll: () => void;
  /** Number of remaining tracks beyond these 5 */
  remainingCount?: number;
}

function formatDuration(sec: number): string {
  if (sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ArtistTopTracks: React.FC<ArtistTopTracksProps> = ({
  tracks,
  isCurrentTrack,
  isPlaying,
  onPlayTrack,
  onSeeAll,
  remainingCount = 0,
}) => {
  const {colors} = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuTrack, setMenuTrack] = useState<TrackRowItem | null>(null);

  const handleMenu = useCallback((track: TrackRowItem) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Play', 'Add to Playlist', 'Go to Album'],
          cancelButtonIndex: 0,
        },
        index => {
          if (index === 1) onPlayTrack(track as PlaylistEntry);
        },
      );
    } else {
      setMenuTrack(track);
      setMenuVisible(true);
    }
  }, [onPlayTrack]);

  if (tracks.length === 0) return null;

  return (
    <View style={styles.section}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <AppText variant="h3" color="primary">
          Popular Tracks
        </AppText>
        {remainingCount > 0 && (
          <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
            <AppText variant="body2" color="accent">
              See All{remainingCount > 0 ? ` (${remainingCount}+)` : ''}
            </AppText>
          </TouchableOpacity>
        )}
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
            onPress={() => onPlayTrack(track as PlaylistEntry)}
            onLongPress={() => handleMenu(track)}
            delayLongPress={400}>
            {/* Track number or playing indicator */}
            <View style={styles.numCol}>
              {isTrackPlaying ? (
                <AudioWaveform isPlaying={true} color="#C9A84C" size={16} barWidth={2} barGap={2} />
              ) : (
                <AppText variant="caption" color="tertiary" style={styles.numText}>
                  {idx + 1}
                </AppText>
              )}
            </View>

            {/* Track info */}
            <View style={styles.trackInfo}>
              <AppText
                variant="body2"
                color={isActive ? 'accent' : 'primary'}
                numberOfLines={1}
                style={styles.trackTitle}>
                {track.title}
              </AppText>
              <AppText variant="caption" color="tertiary" numberOfLines={1}>
                {track.album}
              </AppText>
            </View>

            {/* Duration */}
            <AppText variant="caption" color="tertiary" style={styles.duration}>
              {formatDuration(track.duration)}
            </AppText>

            {/* Three-dot menu */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => handleMenu(track)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              activeOpacity={0.5}>
              <SvgIcon name="sliders" size={16} color={colors.text.tertiary} />
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
            <AppText variant="body2" color="primary" style={styles.menuTitle}>
              {menuTrack?.title ?? ''}
            </AppText>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                if (menuTrack) onPlayTrack(menuTrack as PlaylistEntry);
                setMenuVisible(false);
              }}>
              <SvgIcon name="play" size={18} color={colors.text.primary} />
              <AppText variant="body2" color="primary" style={styles.menuItemText}>
                Play
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setMenuVisible(false)}>
              <SvgIcon name="close" size={18} color={colors.text.tertiary} />
              <AppText variant="body2" color="secondary" style={styles.menuItemText}>
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
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  numCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: 13,
    fontWeight: '500',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  trackTitle: {
    fontWeight: '500',
  },
  duration: {
    minWidth: 40,
    textAlign: 'right',
    marginRight: 4,
  },
  menuBtn: {
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
  menuItemText: {
    flex: 1,
  },
});
