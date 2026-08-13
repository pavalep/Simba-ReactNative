import React, {useState, useCallback, useMemo, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import {BottomSheet} from '../BottomSheet/BottomSheet';
import {AppText} from '../../core/AppText/AppText';
import {AppTextInput} from '../../core/AppTextInput/AppTextInput';
import {KeyboardAwareView} from '../../core/KeyboardAwareView/KeyboardAwareView';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {useAppDispatch, useAppSelector} from '../../../store';
import {
  selectAllPlaylists,
  addItemToPlaylist,
  removeItemFromPlaylist,
  createPlaylist,
} from '../../../store/slices/playlistSlice';
import type {Playlist, PlaylistItem, PlaylistKind} from '../../../types/playlist';
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
    source?: string;
    mediaType?: 'audio' | 'video';
  };
}

// ─── Kind helpers ───────────────────────────────────────────

const KIND_LABELS: Record<PlaylistKind, string> = {
  AUDIO_ONLY: 'Audio',
  VIDEO_ONLY: 'Video',
  MIXED: 'Mixed',
};

const KIND_OPTIONS: PlaylistKind[] = ['AUDIO_ONLY', 'VIDEO_ONLY', 'MIXED'];

// ─── Constants ──────────────────────────────────────────────

const ITEM_HEIGHT = 60;

// ─── Component ──────────────────────────────────────────────

export const PlaylistSheet: React.FC<PlaylistSheetProps> = ({
  visible,
  onClose,
  currentItem,
}) => {
  const {colors} = useTheme();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const haptics = useHaptics();
  const playlists = useAppSelector(selectAllPlaylists);

  // ── Create-mode state ──
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<PlaylistKind>('MIXED');

  // Reset create mode on close
  useEffect(() => {
    if (!visible) {
      setCreating(false);
      setNewName('');
      setNewKind('MIXED');
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
      const newItem: PlaylistItem = {
        id: generateItemId(),
        fileUri: currentItem.fileUri,
        title: currentItem.title,
        duration: currentItem.duration,
        artist: currentItem.artist,
        album: currentItem.album,
        thumbnailPath: currentItem.thumbnailPath,
        mediaType: currentItem.mediaType,
        source: currentItem.source,
        addedAt: new Date().toISOString(),
      };
      dispatch(addItemToPlaylist({playlistId, item: newItem}));
      haptics.medium();
      toast.show(`Added to "${playlistName}"`, 'success');
      // Auto-dismiss after short delay
      setTimeout(onClose, 800);
    },
    [currentItem, dispatch, haptics, toast, onClose],
  );

  // ── Remove item from playlist ──
  const handleRemoveFromPlaylist = useCallback(
    (playlist: Playlist) => {
      const existing = playlist.items.find(i => i.fileUri === currentItem.fileUri);
      if (existing) {
        dispatch(
          removeItemFromPlaylist({playlistId: playlist.id, itemId: existing.id}),
        );
        haptics.medium();
        toast.show(`Removed from "${playlist.name}"`, 'info');
        setTimeout(onClose, 800);
      }
    },
    [currentItem.fileUri, dispatch, haptics, toast, onClose],
  );

  // ── Toggle add/remove ──
  const handleTogglePlaylist = useCallback(
    (playlist: Playlist) => {
      if (itemExistsIn(playlist)) {
        handleRemoveFromPlaylist(playlist);
      } else {
        handleAddToPlaylist(playlist.id, playlist.name);
      }
    },
    [itemExistsIn, handleRemoveFromPlaylist, handleAddToPlaylist],
  );

  // ── Create new playlist ──
  const handleCreatePlaylist = useCallback(() => {
    if (!newName.trim()) return;
    dispatch(createPlaylist({name: newName.trim(), kind: newKind}));
    haptics.light();
    toast.show(`Created "${newName.trim()}"`, 'success');
    setCreating(false);
    setNewName('');
  }, [newName, newKind, dispatch, haptics, toast]);

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
          data={KIND_OPTIONS}
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
    [colors, newName, newKind, handleCreatePlaylist],
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Playlists">
      {creating ? (
        CreateForm
      ) : (
        <FlatList
          data={playlists}
          renderItem={renderPlaylistItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={playlists.length > 0 ? ListFooter : null}
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
    </BottomSheet>
  );
};

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
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
