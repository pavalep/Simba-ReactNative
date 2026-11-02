import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import {PlaylistCover} from '../PlaylistCover';
import type {Playlist} from '../../../types/playlist';
import {PLAYLIST_KIND_LABELS} from '../../../types/playlist';

export interface PlaylistCardProps {
  playlist: Playlist;
  onPress: (playlistId: string) => void;
  onPlayAll?: (playlistId: string) => void;
  onShuffleAll?: (playlistId: string) => void;
  /**
   * Long-press — the shortcut to the playlist's action menu.
   *
   * Absent on a surface with no menu to open, and the card then carries no
   * hint either: a hint that promises a gesture the card does not have is
   * a lie the screen reader tells.
   */
  onLongPress?: (playlistId: string) => void;
  /**
   * The VISIBLE 32 px pin toggle.
   *
   * Present only on a management surface. A browsing grid of fifty
   * playlists must not carry a permanent pin button on every card — there
   * the long-press menu is the shortcut, and the management row is the
   * reachable door (D-P8, spec §4.5).
   */
  onTogglePin?: (playlistId: string, pinned: boolean) => void;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onPress,
  onPlayAll,
  onShuffleAll,
  onLongPress,
  onTogglePin,
}) => {
  const {colors} = useTheme();

  const lastUpdated = useMemo(() => {
    try {
      const d = new Date(playlist.updatedAt);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
    } catch {
      return '';
    }
  }, [playlist.updatedAt]);

  const itemCount = playlist.items.length;

  return (
    <TouchableOpacity
      style={[styles.card, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}
      activeOpacity={0.7}
      onPress={() => onPress(playlist.id)}
      onLongPress={onLongPress ? () => onLongPress(playlist.id) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Open playlist ${playlist.name}${playlist.pinned ? ', pinned' : ''}`}
      accessibilityHint={onLongPress ? 'Long press for more actions' : undefined}>
      {/* ── Cover ── */}
      {/* The ARTWORK has ONE owner (`PlaylistCover`), and the pin badge
          lives inside it - so the badge sits over the COVER, and it
          sits over the cover on EVERY surface a playlist is drawn
          (spec §4.2, §4.3). */}
      <View style={styles.coverArea}>
        <PlaylistCover playlist={playlist} style={styles.cover} />

        {/* ── Kind Badge ── */}
        <View style={[styles.kindBadge, {backgroundColor: colors.accent.goldDim}]}>
          <AppText variant="caption" style={{color: colors.accent.gold, fontSize: 9, fontWeight: '700'}}>
            {PLAYLIST_KIND_LABELS[playlist.kind]}
          </AppText>
        </View>
      </View>

      {/* ── Info ── */}
      <View style={styles.infoArea}>
        <View style={styles.nameRow}>
          <AppText variant="body2" color="primary" numberOfLines={1} style={styles.name}>
            {playlist.name}
          </AppText>
          {/* The VISIBLE pin toggle — a management surface only. The
              browsing grid gets the long-press menu instead. */}
          {onTogglePin && (
            <TouchableOpacity
              style={[
                styles.pinToggle,
                {backgroundColor: playlist.pinned ? colors.accent.goldDim : colors.border.subtle},
              ]}
              activeOpacity={0.7}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              onPress={() => onTogglePin(playlist.id, !playlist.pinned)}
              accessibilityRole="button"
              accessibilityLabel={playlist.pinned ? 'Unpin from top' : 'Pin to top'}
              accessibilityHint={playlist.name}
              accessibilityState={{selected: playlist.pinned}}>
              <SvgIcon
                name={playlist.pinned ? 'pinFilled' : 'pin'}
                size={14}
                color={playlist.pinned ? colors.accent.gold : colors.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
        <AppText variant="caption" color="tertiary" style={styles.meta}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'} · {lastUpdated}
        </AppText>
      </View>

      {/* ── Actions ── */}
      {(onPlayAll || onShuffleAll) && itemCount > 0 && (
        <View style={[styles.actionRow, {borderTopColor: colors.border.subtle}]}>
          {onPlayAll && (
            <TouchableOpacity
              style={[styles.actionBtn, {borderColor: colors.border.subtle}]}
              activeOpacity={0.7}
              onPress={() => onPlayAll(playlist.id)}
              accessibilityRole="button"
              accessibilityLabel={`Play all in ${playlist.name}`}>
              <SvgIcon name="play" size={14} color={colors.accent.gold} />
              <AppText variant="caption" style={{color: colors.accent.gold, marginLeft: 4}}>
                Play All
              </AppText>
            </TouchableOpacity>
          )}
          {onShuffleAll && (
            <TouchableOpacity
              style={[styles.actionBtn, {borderColor: colors.border.subtle}]}
              activeOpacity={0.7}
              onPress={() => onShuffleAll(playlist.id)}
              accessibilityRole="button"
              accessibilityLabel={`Shuffle ${playlist.name}`}>
              <SvgIcon name="shuffle" size={14} color={colors.accent.gold} />
              <AppText variant="caption" style={{color: colors.accent.gold, marginLeft: 4}}>
                Shuffle
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  coverArea: {
    position: 'relative',
    aspectRatio: 16 / 9,
  },
  // The cover fills the cover area. The CHROME - the 16:9 box - is the
  // card's; the ARTWORK is `PlaylistCover`'s.
  cover: {
    flex: 1,
  },
  kindBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  infoArea: {
    padding: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    marginBottom: 2,
  },
  // The pin toggle is a 32 px control (spec §4.5). The hit slop widens
  // the TARGET; the ICON does not grow, so the row does not.
  pinToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  meta: {},
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
});
