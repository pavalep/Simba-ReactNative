import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import {BottomSheet} from '../../sheets/BottomSheet';
import type {Playlist} from '../../../types/playlist';

export interface PlaylistActionMenuProps {
  /** Whether the menu is open. */
  visible: boolean;
  /** The playlist the menu acts on. `null` while nothing is selected. */
  playlist: Playlist | null;
  /** Called with the playlist id and the state it should END in. */
  onTogglePin: (playlistId: string, pinned: boolean) => void;
  /** Called when the menu closes — by a choice, a backdrop tap or a drag. */
  onClose: () => void;
}

/**
 * The long-press menu on a playlist.
 *
 * ## Why it is a menu and not a button on every card
 *
 * A playlist grid can hold fifty playlists. A permanent pin button on each
 * one is noise — the specification calls that out, and YouTube Music and
 * Spotify both put the pin behind a long-press for exactly this reason.
 *
 * ## Why it is NOT the only way to pin
 *
 * A long-press is not reachable by a screen reader or a keyboard. A pin
 * that could only be reached by a gesture would be a pin some users cannot
 * use (locked decision D-P8), so the **management row** and the **detail
 * header** also carry a visible 32 px toggle. This menu is the shortcut,
 * not the only door.
 *
 * The action is a **toggle**, not a confirmation: the label changes with
 * the state, and it states that state to a screen reader.
 */
export const PlaylistActionMenu: React.FC<PlaylistActionMenuProps> = ({
  visible,
  playlist,
  onTogglePin,
  onClose,
}) => {
  const {colors} = useTheme();

  const pinned = playlist?.pinned ?? false;

  const handleTogglePin = () => {
    if (!playlist) return;
    onTogglePin(playlist.id, !playlist.pinned);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={playlist?.name} snapPoints={['auto']}>
      {/* No playlist selected, NO action: a control that offers to pin a
          playlist that is not there is a control that lies. */}
      {playlist && (
        <View style={styles.body}>
          <TouchableOpacity
            style={[styles.row, {borderColor: colors.border.subtle}]}
            activeOpacity={0.7}
            onPress={handleTogglePin}
            accessibilityRole="button"
            accessibilityLabel={pinned ? 'Unpin from top' : 'Pin to top'}
            accessibilityHint={playlist.name}
            accessibilityState={{selected: pinned}}>
            <SvgIcon name={pinned ? 'pinFilled' : 'pin'} size={18} color={colors.accent.gold} />
            <AppText variant="body1" color="primary" style={styles.label}>
              {pinned ? 'Unpin from top' : 'Pin to top'}
            </AppText>
          </TouchableOpacity>
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    marginLeft: spacing.md,
  },
});

export default PlaylistActionMenu;
