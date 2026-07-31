// ────────────────────────────────────────────────────────
// Simba Player — SongActions Component (Phase 18)
// Play, Add to Playlist, Share, Add to Queue buttons
// ────────────────────────────────────────────────────────

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {AppButton} from '../../../components/core/AppButton/AppButton';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {PlaylistSheet} from '../../../components/sheets/PlaylistSheet/PlaylistSheet';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import type {PlaylistSheetProps} from '../../../components/sheets/PlaylistSheet/PlaylistSheet';

interface SongActionsProps {
  onPlay: () => void;
  onAddToPlaylist: () => void;
  onShare: () => void;
  onAddToQueue: () => void;
  playlistSheetVisible: boolean;
  onClosePlaylistSheet: () => void;
  playlistSheetItem: PlaylistSheetProps['currentItem'];
}

export const SongActions: React.FC<SongActionsProps> = ({
  onPlay,
  onAddToPlaylist,
  onShare,
  onAddToQueue,
  playlistSheetVisible,
  onClosePlaylistSheet,
  playlistSheetItem,
}) => {
  const {colors} = useTheme();

  return (
    <View style={styles.container}>
      {/* Primary: Play */}
      <AppButton
        title="Play"
        variant="primary"
        onPress={onPlay}
        fullWidth
        icon={<SvgIcon name="play" size={18} color={colors.text.inverse} />}
      />

      {/* Secondary actions row */}
      <View style={styles.secondaryRow}>
        <AppButton
          title="Add to Playlist"
          variant="secondary"
          onPress={onAddToPlaylist}
          icon={<SvgIcon name="list" size={16} color={colors.accent.gold} />}
          style={styles.secondaryBtn}
        />
        <AppButton
          title="Share"
          variant="secondary"
          onPress={onShare}
          icon={<SvgIcon name="bookmark" size={16} color={colors.accent.gold} />}
          style={styles.secondaryBtn}
        />
        <AppButton
          title="Add to Queue"
          variant="secondary"
          onPress={onAddToQueue}
          icon={<SvgIcon name="listMusic" size={16} color={colors.accent.gold} />}
          style={styles.secondaryBtn}
        />
      </View>

      {/* PlaylistSheet */}
      <PlaylistSheet
        visible={playlistSheetVisible}
        onClose={onClosePlaylistSheet}
        currentItem={playlistSheetItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
  },
});
