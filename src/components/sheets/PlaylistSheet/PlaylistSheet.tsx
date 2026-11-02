import React, {useState, useCallback, useMemo, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {usePlaylists, compatiblePlaylistsFor} from '../../../features/playlists';
import type {Playlist} from '../../../features/playlists';
import {PLAYLIST_KIND_LABELS, type PlaylistKind} from '../../../types/playlist';
import type {MediaKind, MediaLane, MediaSource} from '../../../types/media';
import {normalizeMediaClassification} from '../../../types/media';
import {useToast} from '../../feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import {SvgIcon} from '../../utility/SvgIcon';
import {PlaylistCreateModal} from '../../playlist/PlaylistCreateModal';

// ─── Helpers ────────────────────────────────────────────────

const generateItemId = (): string =>
  `pli_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// ─── Props ──────────────────────────────────────────────────

export interface PlaylistSheetProps {
  visible: boolean;
  onClose: () => void;
  currentItem: {
    fileUri: string;
    title: string;
    duration: number;
    artist?: string;
    album?: string;
    /** P34: remote/streaming metadata so playlists keep art + source + media type */
    thumbnailPath?: string;
    source?: MediaSource;
    type?: MediaKind;
    mediaType?: MediaLane;
    provider?: string;
    folderId?: string;
  };
}

// ─── Constants ──────────────────────────────────────────────

const ITEM_HEIGHT = 60;

// ─── Component ──────────────────────────────────────────────

export const PlaylistSheet: React.FC<PlaylistSheetProps> = ({
  visible,
  onClose,
  currentItem,
}) => {
  const {colors} = useTheme();
  const toast = useToast();
  const haptics = useHaptics();
  const {playlists, addItem, createPlaylist} = usePlaylists();
  const classifiedCurrentItem = useMemo(
    () => normalizeMediaClassification(currentItem),
    [currentItem],
  );

  // ONE rule for "which of these playlists can take this item". This sheet
  // used to filter by lane itself, and the batch picker did not filter at
  // all - which is how the two sheets came to disagree about the same
  // question. `compatiblePlaylistsFor` is now the only answer.
  const compatiblePlaylists = useMemo(
    () => compatiblePlaylistsFor(currentItem, playlists),
    [currentItem, playlists],
  );

  // ── Create state ──
  // The create FORM belongs to `PlaylistCreateModal` - the one owner. This
  // sheet only owns whether that modal is open.
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // The create modal closes with the sheet.
  useEffect(() => {
    if (!visible) {
      setCreateModalVisible(false);
    }
  }, [visible]);

  // ── Check if item is in a playlist ──
  const itemExistsIn = useCallback(
    (playlist: Playlist): boolean =>
      playlist.items.some(i => i.fileUri === currentItem.fileUri),
    [currentItem.fileUri],
  );

  // ── Add item to playlist ──
  const handleAddToPlaylist = useCallback(
    (playlistId: string, playlistName: string) => {
      const result = addItem(playlistId, {
        fileUri: currentItem.fileUri,
        title: currentItem.title,
        duration: currentItem.duration,
        artist: currentItem.artist,
        album: currentItem.album,
        thumbnailPath: currentItem.thumbnailPath,
        ...classifiedCurrentItem,
        provider: currentItem.provider,
        folderId: currentItem.folderId,
      });
      if (result.status === 'duplicate') {
        toast.show(`Already in "${playlistName}"`, 'info');
        return;
      }
      if (result.status === 'playlist-full') {
        toast.show(`"${playlistName}" is full (100 items)`, 'error');
        return;
      }
      if (result.status === 'lane-mismatch' || result.status === 'unsupported-media-kind') {
        toast.show('This media type cannot be added to that playlist', 'error');
        return;
      }
      if (result.status !== 'added') {
        toast.show('Unable to add to playlist', 'error');
        return;
      }
      haptics.medium();
      toast.show(`Added to "${playlistName}"`, 'success');
      setTimeout(onClose, 800);
    },
    [addItem, classifiedCurrentItem, currentItem, haptics, toast, onClose],
  );

  // ── Add-only player popup behavior ──
  const handleTogglePlaylist = useCallback(
    (playlist: Playlist) => {
      if (itemExistsIn(playlist)) {
        toast.show(`Already in "${playlist.name}". Remove it from the playlist page.`, 'info');
        return;
      }
      handleAddToPlaylist(playlist.id, playlist.name);
    },
    [itemExistsIn, handleAddToPlaylist, toast],
  );

  // ── Create new playlist ──
  // The form is `PlaylistCreateModal`'s; this handler only commits the
  // playlist and puts the current item in it.
  const handleCreatePlaylist = useCallback(
    (name: string, kind: PlaylistKind) => {
      setCreateModalVisible(false);
      const created = createPlaylist({name, kind});
      if (created.status === 'limit-reached') {
        toast.show(`You can create up to ${created.max} playlists`, 'error');
        return;
      }
      const added = addItem(created.playlist.id, {
        fileUri: currentItem.fileUri,
        title: currentItem.title,
        duration: currentItem.duration,
        artist: currentItem.artist,
        album: currentItem.album,
        thumbnailPath: currentItem.thumbnailPath,
        ...classifiedCurrentItem,
        provider: currentItem.provider,
        folderId: currentItem.folderId,
      });
      if (added.status !== 'added') {
        toast.show('Playlist created, but this item could not be added', 'error');
        return;
      }
      haptics.light();
      toast.show(`Created "${name}" and added the item`, 'success');
      setTimeout(onClose, 800);
    },
    [addItem, classifiedCurrentItem, createPlaylist, currentItem, haptics, onClose, toast],
  );

  // ── Render playlist row ──
  const renderPlaylistItem = useCallback(
    ({item}: {item: Playlist}) => {
      const exists = itemExistsIn(item);
      return (
        <TouchableOpacity
          style={[
            styles.playlistRow,
            {borderBottomColor: colors.border.subtle},
          ]}
          onPress={() => handleTogglePlaylist(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${itemExistsIn(item) ? 'Remove from' : 'Add to'} playlist "${item.name}"`}>
          {/* Cover / icon */}
          <View
            style={[
              styles.coverPlaceholder,
              {backgroundColor: colors.background.elevated},
            ]}>
            <SvgIcon
              name="listMusic"
              size={20}
              color={exists ? colors.accent.gold : colors.text.secondary}
            />
          </View>

          {/* Name + badge + count */}
          <View style={styles.playlistInfo}>
            <View style={styles.playlistNameRow}>
              <AppText
                variant="body1"
                color="primary"
                numberOfLines={1}
                style={styles.playlistName}>
                {item.name}
              </AppText>
              <View
                style={[
                  styles.kindBadge,
                  {backgroundColor: colors.accent.goldDim},
                ]}>
                <AppText
                  variant="caption"
                  color="primary"
                  style={{color: colors.accent.gold, fontSize: 10}}>
                  {PLAYLIST_KIND_LABELS[item.kind]}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color="secondary">
              {item.items.length} {item.items.length === 1 ? 'item' : 'items'}
            </AppText>
          </View>

          {/* Checkmark if exists */}
          {exists && (
            <View style={styles.checkmark}>
              <AppText style={{color: colors.accent.gold, fontSize: 16}}>
                {'✓'}
              </AppText>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [colors, itemExistsIn, handleTogglePlaylist],
  );

  // ── Key extractor ──
  const keyExtractor = useCallback((item: Playlist) => item.id, []);

  // ── List header ──
  const ListHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <AppText variant="displaySans" color="primary">
          Select a Playlist
        </AppText>
        <AppText variant="caption" color="secondary">
          Choose a playlist to add the current track
        </AppText>
      </View>
    ),
    [],
  );

  // ── List footer (Create New Playlist) ──
  const ListFooter = useMemo(
    () => (
      <TouchableOpacity
        style={[styles.createRow, {borderTopColor: colors.border.subtle}]}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Create new playlist">
        <View
          style={[
            styles.addIconCircle,
            {borderColor: colors.accent.gold},
          ]}>
          <AppText style={{color: colors.accent.gold, fontSize: 18, lineHeight: 20}}>
            +
          </AppText>
        </View>
        <AppText variant="body1" color="primary" style={{color: colors.accent.gold}}>
          Create New Playlist
        </AppText>
      </TouchableOpacity>
    ),
    [colors],
  );

  // ── Empty state ──
  // Two truths, told as one. "No playlists yet" is true only when the user
  // has NO playlists. When they have playlists but none of them can take
  // this item, the sheet must say THAT - and must not tell them to create
  // one, because that is not what is missing.
  const hasPlaylists = playlists.length > 0;
  const EmptyList = useMemo(
    () => (
      <View style={styles.emptyState}>
        <SvgIcon name="listMusic" size={40} color={colors.text.tertiary} />
        <AppText variant="body1" color="secondary" style={styles.emptyText}>
          {hasPlaylists
            ? 'No playlist can take this item.'
            : 'No playlists yet. Create one to get started.'}
        </AppText>
      </View>
    ),
    [colors, hasPlaylists],
  );

  // The create row is reachable when the user has NO playlists - the empty
  // state tells them to create one, so the control has to be there. It is
  // hidden when playlists exist and none of them can take this item, because
  // then "create one" is not what is missing.
  const showCreateRow = !hasPlaylists || compatiblePlaylists.length > 0;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}>
        <View style={[styles.overlay, {backgroundColor: colors.background.overlay}]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          <View style={[styles.popupCard, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}>
            <View style={styles.popupHeader}>
              <AppText variant="displaySans" color="primary">Playlists</AppText>
              <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close playlists">
                <AppText variant="h2" color="secondary">×</AppText>
              </TouchableOpacity>
            </View>
            <FlatList
              data={compatiblePlaylists}
              renderItem={renderPlaylistItem}
              keyExtractor={keyExtractor}
              ListHeaderComponent={ListHeader}
              ListFooterComponent={showCreateRow ? ListFooter : null}
              ListEmptyComponent={EmptyList}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              getItemLayout={(_data, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
              windowSize={5}
              maxToRenderPerBatch={10}
              removeClippedSubviews={true}
            />
          </View>
        </View>
      </Modal>

      {/* The create form has ONE owner: `PlaylistCreateModal`. */}
      <PlaylistCreateModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreatePlaylist}
      />
    </>
  );
};

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  popupCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '82%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  popupHeader: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  listHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 4,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  coverPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  playlistInfo: {
    flex: 1,
    gap: 2,
  },
  playlistNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  playlistName: {
    flex: 1,
  },
  kindBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  checkmark: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
