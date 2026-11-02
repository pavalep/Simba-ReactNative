import React, {useCallback, useMemo, useRef} from 'react';
import {View, TouchableOpacity, FlatList, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import {BottomSheet} from '../../sheets/BottomSheet/BottomSheet';
import {usePlaylists, compatiblePlaylistsFor} from '../../../features/playlists';
import type {Playlist} from '../../../features/playlists';
import type {MediaKind, MediaLane} from '../../../types/media';

export interface PlaylistContextMenuProps {
  /**
   * The media item to add to a playlist (single-item mode).
   *
   * `type` / `mediaType` are the item's TRUTHFUL classification - they are
   * what the compatibility rule is asked about. Without them the rule falls
   * back to the broad 'audio' / 'video', which is how a radio station ended
   * up offered a playlist.
   */
  item?: {
    fileUri: string;
    title: string;
    duration: number;
    artist?: string;
    album?: string;
    type?: MediaKind;
    mediaType?: MediaLane;
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
  const {playlists: allPlaylists} = usePlaylists();

  // A batch selection may legitimately MIX lanes - an audio file and a video
  // file picked together - so the batch branch shows every playlist and the
  // toast reports what was actually added. A single item is filtered by the
  // SAME rule the sheet uses, so the two surfaces cannot disagree.
  const isBatch = typeof batchCount === 'number' && batchCount > 1;
  const visiblePlaylists = useMemo(() => {
    if (isBatch || !item) return allPlaylists;
    return compatiblePlaylistsFor(item, allPlaylists);
  }, [allPlaylists, isBatch, item]);

  const sheetTitle = useMemo(() => {
    if (isBatch) {
      return `Add ${batchCount} items to Playlist`;
    }
    return item ? `Add "${item.title}" to Playlist` : 'Add to Playlist';
  }, [isBatch, batchCount, item]);

  const renderItem = useCallback(
    ({playlist}: {playlist: Playlist}) => (
      <TouchableOpacity
        style={[styles.row, {borderBottomColor: colors.border.subtle}]}
        activeOpacity={0.7}
        onPress={() => {
          onAddToPlaylist(playlist.id);
          onClose();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Add to ${playlist.name}`}>
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

  // The list scrolls, so true-sheet needs a handle on it to size and
  // scroll the sheet body. Without it the body measures to zero.
  const listRef = useRef<FlatList<Playlist>>(null);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['50%']}
      dismissable
      scrollableRef={listRef}
      title={sheetTitle}>
      <View style={styles.container}>
        <FlatList
          ref={listRef}
          data={visiblePlaylists}
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
                {allPlaylists.length === 0
                  ? 'No playlists yet'
                  : 'No playlist can take this item'}
              </AppText>
            </View>
          }
          style={styles.list}
        />

        {/* ── Create New ── */}
        <TouchableOpacity
          style={[styles.createRow, {borderTopColor: colors.border.subtle}]}
          activeOpacity={0.7}
          onPress={handleCreateNew}
          accessibilityRole="button">
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
  // No `flex` on either the container or the list. true-sheet measures the
  // sheet's content view UNCONSTRAINED (TrueSheetContentViewShadowNode), and
  // a `flexBasis: 0` child measures to ZERO in that pass — so a `flex: 1`
  // body collapses to nothing and only intrinsic-height siblings survive.
  // A natural-height body is what lets the sheet size and scroll it.
  container: {},
  list: {},
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
