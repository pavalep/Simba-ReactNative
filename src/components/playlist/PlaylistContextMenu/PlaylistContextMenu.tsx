import React, {useCallback, useMemo} from 'react';
import {View, TouchableOpacity, FlatList, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import {BottomSheet} from '../../sheets/BottomSheet/BottomSheet';
import {useAppSelector} from '../../../store';
import {selectAllPlaylists} from '../../../store/slices/playlistSlice';
import type {Playlist} from '../../../types/playlist';

export interface PlaylistContextMenuProps {
  /** The media item to add to a playlist (single-item mode) */
  item?: {
    fileUri: string;
    title: string;
    duration: number;
    artist?: string;
    album?: string;
  };
  /** When set, shows batch-mode title instead of single item title */
  batchCount?: number;
  visible: boolean;
  onClose: () => void;
  /** Called when user picks a playlist to add items to */
  onAddToPlaylist: (playlistId: string) => void;
  /** Called when user wants to create a new playlist first */
  onCreateNew: () => void;
}

// ─── Constants ───────────────────────────────────────────

const ITEM_HEIGHT = 60;

// ─── Component ──────────────────────────────────────────

export const PlaylistContextMenu: React.FC<PlaylistContextMenuProps> = ({
  item,
  batchCount,
  visible,
  onClose,
  onAddToPlaylist,
  onCreateNew,
}) => {
  const {colors} = useTheme();
  const allPlaylists = useAppSelector(selectAllPlaylists);

  const sheetTitle = useMemo(() => {
    if (batchCount && batchCount > 1) {
      return `Add ${batchCount} items to Playlist`;
    }
    return item ? `Add "${item.title}" to Playlist` : 'Add to Playlist';
  }, [batchCount, item]);

  const renderItem = useCallback(
    ({playlist}: {playlist: Playlist}) => (
      <TouchableOpacity
        style={[styles.row, {borderBottomColor: colors.border.subtle}]}
        activeOpacity={0.7}
        onPress={() => {
          onAddToPlaylist(playlist.id);
          onClose();
        }}>
        <View style={[styles.iconWrap, {backgroundColor: colors.accent.goldDim}]}>
          <SvgIcon name="listMusic" size={16} color={colors.accent.gold} />
        </View>
        <View style={styles.rowInfo}>
          <AppText variant="body2" color="primary" numberOfLines={1}>
            {playlist.name}
          </AppText>
          <AppText variant="caption" color="tertiary">
            {playlist.items.length} {playlist.items.length === 1 ? 'item' : 'items'}
          </AppText>
        </View>
      </TouchableOpacity>
    ),
    [colors, onAddToPlaylist, onClose],
  );

  const handleCreateNew = useCallback(() => {
    onClose();
    // Small delay so the context menu closes before the creation modal opens
    setTimeout(() => onCreateNew(), 350);
  }, [onClose, onCreateNew]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['50%']}
      dismissable
      title={sheetTitle}>
      <View style={styles.container}>
        <FlatList
          data={allPlaylists}
          keyExtractor={p => p.id}
          renderItem={({item: playlist}) => renderItem({playlist})}
          getItemLayout={(_, index) => ({length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index})}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <SvgIcon name="listMusic" size={32} color={colors.text.tertiary} />
              <AppText variant="body2" color="tertiary" style={{marginTop: spacing.sm, textAlign: 'center'}}>
                No playlists yet
              </AppText>
            </View>
          }
          style={styles.list}
        />

        {/* ── Create New ── */}
        <TouchableOpacity
          style={[styles.createRow, {borderTopColor: colors.border.subtle}]}
          activeOpacity={0.7}
          onPress={handleCreateNew}>
          <View style={[styles.createIconWrap, {backgroundColor: colors.accent.goldDim}]}>
            <AppText style={{color: colors.accent.gold, fontSize: 18, lineHeight: 20}}>+</AppText>
          </View>
          <AppText variant="body2" style={{color: colors.accent.gold, marginLeft: spacing.md}}>
            Create New Playlist
          </AppText>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowInfo: {
    flex: 1,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  createIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
