import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import type {Playlist, PlaylistKind} from '../../../types/playlist';

const KIND_LABELS: Record<PlaylistKind, string> = {
  AUDIO_ONLY: 'Audio',
  VIDEO_ONLY: 'Video',
  MIXED: 'Mixed',
};

export interface PlaylistCardProps {
  playlist: Playlist;
  onPress: (playlistId: string) => void;
  onPlayAll?: (playlistId: string) => void;
  onShuffleAll?: (playlistId: string) => void;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onPress,
  onPlayAll,
  onShuffleAll,
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
  const coverItems = playlist.items.slice(0, 4);

  return (
    <TouchableOpacity
      style={[styles.card, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}
      activeOpacity={0.7}
      onPress={() => onPress(playlist.id)}>
      {/* ── Cover Collage ── */}
      <View style={styles.coverArea}>
        {coverItems.length === 0 ? (
          <View style={[styles.emptyCover, {backgroundColor: colors.background.floating}]}>
            <SvgIcon name="listMusic" size={24} color={colors.text.tertiary} />
          </View>
        ) : (
          <View style={styles.collage}>
            {coverItems.map((item, i) => (
              <View
                key={item.id}
                style={[
                  styles.collageCell,
                  {backgroundColor: colors.background.floating},
                  coverItems.length === 1 && styles.collageCellFull,
                ]}>
                {item.thumbnailPath ? (
                  <FastImage
                    source={{uri: item.thumbnailPath}}
                    style={StyleSheet.absoluteFill}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                ) : (
                  <SvgIcon
                    name={i % 2 === 0 ? 'music' : 'headphones'}
                    size={14}
                    color={colors.text.tertiary}
                  />
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Kind Badge ── */}
        <View style={[styles.kindBadge, {backgroundColor: colors.accent.goldDim}]}>
          <AppText variant="caption" style={{color: colors.accent.gold, fontSize: 9, fontWeight: '700'}}>
            {KIND_LABELS[playlist.kind]}
          </AppText>
        </View>
      </View>

      {/* ── Info ── */}
      <View style={styles.infoArea}>
        <AppText variant="body2" color="primary" numberOfLines={1} style={styles.name}>
          {playlist.name}
        </AppText>
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
              onPress={() => onPlayAll(playlist.id)}>
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
              onPress={() => onShuffleAll(playlist.id)}>
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
  emptyCover: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collage: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  collageCell: {
    width: '50%',
    height: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  collageCellFull: {
    width: '100%',
    height: '100%',
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
  name: {
    marginBottom: 2,
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
