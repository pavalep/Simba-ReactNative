import React, {useState, useCallback, useMemo, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {AppTextInput} from '../../core/AppTextInput/AppTextInput';
import {KeyboardAwareView} from '../../core/KeyboardAwareView/KeyboardAwareView';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {usePlaylists} from '../../../features/playlists';
import type {Playlist, PlaylistKind} from '../../../features/playlists';
import {isPlaylistMediaKindAllowed} from '../../../types/playlist';
import type {MediaKind, MediaLane, MediaSource} from '../../../types/media';
import {normalizeMediaClassification} from '../../../types/media';
import {useToast} from '../../feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import {SvgIcon} from '../../utility/SvgIcon';

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

// ─── Kind helpers ───────────────────────────────────────────

const KIND_LABELS: Record<PlaylistKind, string> = {
  AUDIO_ONLY: 'Audio',
  VIDEO_ONLY: 'Video',
};

 type SingleLanePlaylistKind = PlaylistKind;

const KIND_OPTIONS: SingleLanePlaylistKind[] = ['AUDIO_ONLY', 'VIDEO_ONLY'];

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
  const compatiblePlaylists = useMemo(
    () => playlists.filter(playlist =>
      isPlaylistMediaKindAllowed(
        playlist.kind,
        classifiedCurrentItem.type,
        classifiedCurrentItem.mediaType,
      ),
    ),
    [playlists, classifiedCurrentItem],
  );
  const currentPlaylistKind: SingleLanePlaylistKind =
    classifiedCurrentItem.mediaType === 'video' ? 'VIDEO_ONLY' : 'AUDIO_ONLY';
  const availableKindOptions = useMemo(
    () => KIND_OPTIONS.filter(kind => kind === currentPlaylistKind),
    [currentPlaylistKind],
  );

  // ── Create-mode state ──
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<SingleLanePlaylistKind>('AUDIO_ONLY');

  // Reset create mode on close
  useEffect(() => {
    if (!visible) {
      setCreating(false);
      setNewName('');
      setNewKind(currentPlaylistKind);
      return;
    }
    setNewKind(currentPlaylistKind);
  }, [currentPlaylistKind, visible]);

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
  const handleCreatePlaylist = useCallback(() => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    const created = createPlaylist({name: trimmedName, kind: newKind});
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
    toast.show(`Created "${trimmedName}" and added the item`, 'success');
    setCreating(false);
    setNewName('');
    setTimeout(onClose, 800);
  }, [addItem, classifiedCurrentItem, createPlaylist, currentItem, haptics, newName, newKind, onClose, toast]);

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
                  {KIND_LABELS[item.kind]}
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
        onPress={() => setCreating(true)}
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
  const EmptyList = useMemo(
    () => (
      <View style={styles.emptyState}>
        <SvgIcon name="listMusic" size={40} color={colors.text.tertiary} />
        <AppText variant="body1" color="secondary" style={styles.emptyText}>
          No playlists yet. Create one to get started.
        </AppText>
      </View>
    ),
    [colors],
  );

  // ── Create-mode form ──
  const CreateForm = useMemo(
    () => (
      <KeyboardAwareView style={styles.createForm}>
        <AppText variant="displaySans" color="primary" style={{marginBottom: spacing.sm}}>
          New Playlist
        </AppText>

        {/* 53.3: AppTextInput for the playlist name field */}
        <AppTextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Playlist name"
          autoFocus
        />

        {/* Kind selector */}
        <AppText
          variant="caption"
          color="secondary"
          style={{marginTop: spacing.sm, marginBottom: spacing.xs}}>
          Type:
        </AppText>
        {/* 59.1: virtualized kind chips */}
        <FlatList
          horizontal
          data={availableKindOptions}
          keyExtractor={k => k}
          renderItem={({item: k}) => (
            <TouchableOpacity
              style={[
                styles.kindChip,
                {
                  backgroundColor:
                    newKind === k
                      ? colors.accent.goldDim
                      : colors.background.elevated,
                  borderColor:
                    newKind === k
                      ? colors.accent.gold
                      : colors.border.subtle,
                },
              ]}
              onPress={() => setNewKind(k)}
              accessibilityRole="button"
              accessibilityLabel={`${KIND_LABELS[k]} playlist type${newKind === k ? ', selected' : ''}`}>
              <AppText
                variant="caption"
                color="primary"
                style={{
                  color:
                    newKind === k ? colors.accent.gold : colors.text.secondary,
                }}>
                {KIND_LABELS[k]}
              </AppText>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.kindRow}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          initialNumToRender={KIND_OPTIONS.length}
        />

        {/* Action buttons */}
        <View style={styles.createActions}>
          <TouchableOpacity
            style={[
              styles.createBtn,
              {
                backgroundColor: colors.accent.gold,
                opacity: newName.trim() ? 1 : 0.5,
              },
            ]}
            onPress={handleCreatePlaylist}
            disabled={!newName.trim()}
            accessibilityRole="button"
            accessibilityLabel={newName.trim() ? `Create playlist "${newName.trim()}"` : 'Create playlist'}>
            <AppText
              variant="body1"
              color="primary"
              style={{color: colors.text.inverse}}>
              Create
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelBtn]}
            onPress={() => setCreating(false)}
            accessibilityRole="button"
            accessibilityLabel="Cancel creating playlist">
            <AppText variant="body1" color="secondary">
              Cancel
            </AppText>
          </TouchableOpacity>
        </View>
      </KeyboardAwareView>
    ),
    [availableKindOptions, colors, newName, newKind, handleCreatePlaylist],
  );

  return (
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
          {creating ? (
            CreateForm
          ) : (
            <FlatList
          data={compatiblePlaylists}
          renderItem={renderPlaylistItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={compatiblePlaylists.length > 0 ? ListFooter : null}
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
          )}
        </View>
      </View>
    </Modal>
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
  createForm: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  kindRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  kindChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  createActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  createBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
