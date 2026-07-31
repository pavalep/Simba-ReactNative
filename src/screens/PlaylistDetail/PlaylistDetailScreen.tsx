import React, {useMemo, useState, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Share,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  removeItemFromPlaylist,
  reorderPlaylistItems,
  renamePlaylist,
  deletePlaylist,
  clearPlaylist,
  selectPlaylistById,
} from '../../store/slices/playlistSlice';
import {
  addToQueue,
  prependToQueue,
  loadPlaylistToPlayer,
  playlistItemsToEntries,
} from '../../store/slices/playerSlice';
import {AppText} from '../../components/core/AppText/AppText';
import type {RootStackScreenProps} from '../../navigation/types';
type PlaylistDetailScreenProps = RootStackScreenProps<'PlaylistDetail'>;
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {PlaylistModal} from '../../features/playlists/components/PlaylistModal';
import type {PlaylistItem} from '../../types/playlist';
import {
  generateM3u,
  generatePlaylistJson,
} from '../../utils/m3uParser';
import {spacing} from '../../theme/tokens';
import {isVideoFile} from '../../utils/timeAgo';
import {OptionSheetDialog} from '../../components/core/OptionSheetDialog/OptionSheetDialog';
import {useConfirmDialog} from '../../components/core/Dialog/ConfirmDialog';
import {useToast} from '../../components/feedback/Toast/Toast';

type Props = PlaylistDetailScreenProps;

const THUMBNAIL_SIZE = 48;
const ITEM_HEIGHT = 66;

export const PlaylistDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const {confirm, dialog} = useConfirmDialog();
  const {playlistId, playlistName} = route.params;

  // ── Redux data ──
  const playlist = useAppSelector(selectPlaylistById(playlistId));
  const items = useMemo(() => playlist?.items ?? [], [playlist]);

  // ── Local UI state ──
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalMode, setModalMode] = useState<'rename' | 'delete' | null>(null);
  // 52.1: options menus replaced Alert.alert list pickers
  const [playlistMenuVisible, setPlaylistMenuVisible] = useState(false);
  const [itemMenuVisible, setItemMenuVisible] = useState(false);
  const [menuItem, setMenuItem] = useState<PlaylistItem | null>(null);

  // ── Header: Add ──
  // Open the folder browser in selection mode pre-targeting this playlist;
  // picked files are added directly to it (FolderBrowserScreen batch flow).
  const handleAdd = useCallback(() => {
    navigation.navigate('FolderBrowser', {
      targetPlaylistId: playlistId,
    });
  }, [navigation, playlistId]);

  // ── Header: Play All ──
  const handlePlayAll = useCallback(() => {
    if (items.length > 0) {
      const entries = playlistItemsToEntries(items);
      dispatch(loadPlaylistToPlayer(entries));
      navigation.navigate(
        isVideoFile(items[0].fileUri) ? 'VideoPlayer' : 'AudioPlayer',
        {fileUri: items[0].fileUri, fileTitle: items[0].title},
      );
    }
  }, [items, dispatch, navigation]);

  // ── Header: Options menu (52.1) ──
  const handleMore = useCallback(() => {
    setPlaylistMenuVisible(true);
  }, []);

  const handleExport = useCallback(
    async (kind: 'm3u' | 'json') => {
      try {
        const payload =
          kind === 'm3u' ? generateM3u(items) : generatePlaylistJson(items);
        await Share.share({
          message: payload,
          title: `${playlistName}.${kind === 'm3u' ? 'm3u' : 'json'}`,
        });
      } catch {
        // user cancelled share
      }
    },
    [items, playlistName],
  );

  const handleClearPlaylist = useCallback(async () => {
    const ok = await confirm({
      title: 'Clear Playlist',
      message: `Remove all ${items.length} items from "${playlistName}"?`,
      confirmLabel: 'Clear All',
      destructive: true,
    });
    if (ok) {
      dispatch(clearPlaylist(playlistId));
      toast.show('Playlist cleared');
    }
  }, [confirm, dispatch, items.length, playlistName, playlistId, toast]);

  const handlePlaylistMenuSelect = useCallback(
    (value: string | number) => {
      switch (value) {
        case 'rename':
          setModalMode('rename');
          break;
        case 'export-m3u':
          handleExport('m3u');
          break;
        case 'export-json':
          handleExport('json');
          break;
        case 'clear':
          handleClearPlaylist();
          break;
        case 'delete':
          setModalMode('delete');
          break;
      }
    },
    [handleExport, handleClearPlaylist],
  );

  // ── Batch select ──
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBatchDelete = useCallback(async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    const ok = await confirm({
      title: 'Remove Items',
      message: `Remove ${count} selected item${count !== 1 ? 's' : ''}?`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    selectedIds.forEach(id => {
      dispatch(
        removeItemFromPlaylist({playlistId, itemId: id}),
      );
    });
    setSelectedIds(new Set());
    setIsSelecting(false);
    toast.show(`Removed ${count} item${count !== 1 ? 's' : ''}`);
  }, [selectedIds, confirm, dispatch, playlistId, toast]);

  const exitBatchMode = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  // ── Item interactions ──
  const handlePlay = useCallback(
    (item: PlaylistItem) => {
      navigation.navigate(
        isVideoFile(item.fileUri) ? 'VideoPlayer' : 'AudioPlayer',
        {fileUri: item.fileUri, fileTitle: item.title},
      );
    },
    [navigation],
  );

  const handleItemPress = useCallback(
    (item: PlaylistItem) => {
      if (isSelecting) {
        toggleSelection(item.id);
      } else {
        handlePlay(item);
      }
    },
    [isSelecting, toggleSelection, handlePlay],
  );

  const handleItemLongPress = useCallback(
    (item: PlaylistItem) => {
      if (isSelecting) return;
      setMenuItem(item);
      setItemMenuVisible(true);
    },
    [isSelecting],
  );

  const handleItemMenuSelect = useCallback(
    (value: string | number) => {
      if (!menuItem) return;
      switch (value) {
        case 'play-next':
          dispatch(
            prependToQueue({
              uri: menuItem.fileUri,
              title: menuItem.title,
              duration: menuItem.duration,
            }),
          );
          toast.show('Playing next');
          break;
        case 'add-queue':
          dispatch(
            addToQueue({
              uri: menuItem.fileUri,
              title: menuItem.title,
              duration: menuItem.duration,
            }),
          );
          toast.show('Added to queue');
          break;
        case 'select':
          setIsSelecting(true);
          setSelectedIds(new Set([menuItem.id]));
          break;
      }
      setMenuItem(null);
    },
    [menuItem, dispatch, toast],
  );

  const handleMoveItem = useCallback(
    (fromIndex: number, direction: 'up' | 'down') => {
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= items.length) return;
      dispatch(reorderPlaylistItems({playlistId, fromIndex, toIndex}));
    },
    [dispatch, playlistId, items.length],
  );

  // ── Modal handlers ──
  const handleModalConfirm = useCallback(
    (result: string | boolean) => {
      if (modalMode === 'rename' && typeof result === 'string') {
        dispatch(renamePlaylist({id: playlistId, newName: result}));
      } else if (modalMode === 'delete' && result === true) {
        dispatch(deletePlaylist(playlistId));
        navigation.goBack();
      }
      setModalMode(null);
    },
    [modalMode, dispatch, playlistId, navigation],
  );

  const handleModalCancel = useCallback(() => {
    setModalMode(null);
  }, []);

  // ── Duration formatter ──
  const formatDuration = useCallback((ms: number): string => {
    if (ms <= 0) return '--:--';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }, []);

  // ── Styles ──
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.sm,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
          backgroundColor: colors.background.primary,
        },
        backButton: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerTitleSection: {
          flex: 1,
          marginLeft: spacing.xs,
        },
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        },
        headerBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background.elevated,
        },
        headerBtnDanger: {
          backgroundColor: colors.semantic.error,
        },
        deleteBtnText: {
          color: colors.text.primary,
          fontWeight: '700',
          fontSize: 13,
        },
        moreBtnText: {
          color: colors.text.secondary,
          fontSize: 20,
          lineHeight: 22,
        },
        listContent: {
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 20,
        },
        itemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
          height: ITEM_HEIGHT,
        },
        checkbox: {
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: colors.border.emphasis,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.sm,
        },
        checkboxChecked: {
          backgroundColor: colors.accent.gold,
          borderColor: colors.accent.gold,
        },
        checkmark: {
          color: colors.text.inverse,
          fontWeight: '700',
          fontSize: 14,
        },
        thumbnail: {
          width: THUMBNAIL_SIZE,
          height: THUMBNAIL_SIZE,
          borderRadius: THUMBNAIL_SIZE / 2,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: spacing.md,
        },
        thumbnailText: {
          color: colors.text.primary,
          fontWeight: '700',
          fontSize: 18,
        },
        itemInfo: {
          flex: 1,
          marginRight: spacing.sm,
        },
        itemMeta: {
          flexDirection: 'row',
          marginTop: 2,
          gap: spacing.sm,
        },
        moveBtns: {
          marginRight: spacing.xs,
        },
        moveBtn: {
          width: 28,
          height: 22,
          borderRadius: 4,
          backgroundColor: colors.border.subtle,
          alignItems: 'center',
          justifyContent: 'center',
        },
        moveBtnDisabled: {
          opacity: 0.3,
        },
        moveArrow: {
          color: colors.text.secondary,
          fontSize: 12,
          fontWeight: '700',
        },
        playButton: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.accent.goldDim,
          justifyContent: 'center',
          alignItems: 'center',
          marginLeft: spacing.xs,
        },
      }),
    [colors, insets],
  );

  // ── Render item ──
  const renderItem = useCallback(
    ({item, index}: {item: PlaylistItem; index: number}) => {
      const isChecked = selectedIds.has(item.id);
      const isFirst = index === 0;
      const isLast = index === items.length - 1;

      return (
        <TouchableOpacity
          style={styles.itemRow}
          activeOpacity={0.7}
          onPress={() => handleItemPress(item)}
          onLongPress={() => handleItemLongPress(item)}
          delayLongPress={400}>
          {/* Batch checkbox */}
          {isSelecting && (
            <TouchableOpacity
              style={[
                styles.checkbox,
                isChecked && styles.checkboxChecked,
              ]}
              onPress={() => toggleSelection(item.id)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              accessibilityLabel={isChecked ? 'Deselect' : 'Select'}
              accessibilityRole="button">
              {isChecked && (
                <AppText style={styles.checkmark}>✓</AppText>
              )}
            </TouchableOpacity>
          )}

          {/* Thumbnail */}
          <View
            style={[
              styles.thumbnail,
              {backgroundColor: colors.accent.goldDim},
            ]}>
            <AppText style={styles.thumbnailText}>
              {item.title.charAt(0).toUpperCase()}
            </AppText>
          </View>

          {/* Info */}
          <View style={styles.itemInfo}>
            <AppText variant="body2" color="primary" numberOfLines={1}>
              {item.title}
            </AppText>
            <View style={styles.itemMeta}>
              <AppText variant="caption" color="secondary">
                {formatDuration(item.duration)}
              </AppText>
              {item.artist && (
                <AppText variant="caption" color="tertiary" numberOfLines={1}>
                  {item.artist}
                </AppText>
              )}
            </View>
          </View>

          {/* Move buttons (hidden in batch mode) */}
          {!isSelecting && items.length > 1 && (
            <View style={styles.moveBtns}>
              <TouchableOpacity
                style={[styles.moveBtn, isFirst && styles.moveBtnDisabled]}
                onPress={() => handleMoveItem(index, 'up')}
                disabled={isFirst}
                hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}
                accessibilityLabel="Move up"
                accessibilityRole="button">
                <AppText style={styles.moveArrow}>▲</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moveBtn, isLast && styles.moveBtnDisabled]}
                onPress={() => handleMoveItem(index, 'down')}
                disabled={isLast}
                hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}
                accessibilityLabel="Move down"
                accessibilityRole="button">
                <AppText style={styles.moveArrow}>▼</AppText>
              </TouchableOpacity>
            </View>
          )}

          {/* Play button (hidden in batch mode) */}
          {!isSelecting && (
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => handlePlay(item)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              accessibilityLabel="Play"
              accessibilityRole="button">
              <AppText
                style={{
                  color: colors.accent.gold,
                  fontSize: 14,
                  fontWeight: '700',
                }}>
                {'>'}
              </AppText>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [
      styles,
      selectedIds,
      items.length,
      isSelecting,
      handleItemPress,
      handleItemLongPress,
      toggleSelection,
      handlePlay,
      handleMoveItem,
      colors,
      formatDuration,
    ],
  );

  const keyExtractor = useCallback((item: PlaylistItem) => item.id, []);

  // ── Render ──
  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={
          isDark
            ? [colors.background.primary, colors.background.elevated]
            : [colors.background.primary, colors.background.elevated]
        }
        style={StyleSheet.absoluteFill}
      />

      {/* ── Custom Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button">
          <AppText variant="body1" color="secondary" style={{fontSize: 22}}>
            ←
          </AppText>
        </TouchableOpacity>

        <View style={styles.headerTitleSection}>
          <AppText variant="h3" color="primary" numberOfLines={1}>
            {playlist?.name ?? playlistName}
          </AppText>
          <AppText variant="caption" color="tertiary" numberOfLines={1}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </AppText>
        </View>

        <View style={styles.headerRight}>
          {isSelecting ? (
            <>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={exitBatchMode}>
                <AppText variant="body2" color="secondary">
                  Cancel
                </AppText>
              </TouchableOpacity>
              {selectedIds.size > 0 && (
                <TouchableOpacity
                  style={[styles.headerBtn, styles.headerBtnDanger]}
                  onPress={handleBatchDelete}>
                  <AppText style={styles.deleteBtnText}>
                    {selectedIds.size}
                  </AppText>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              {items.length > 0 && (
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={handlePlayAll}
                  accessibilityLabel="Play all"
                  accessibilityRole="button">
                  <AppText variant="body1" color="accent">
                    Play All
                  </AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={handleAdd}
                accessibilityLabel="Add media to playlist"
                accessibilityRole="button">
                <AppText variant="body1" color="accent">
                  Add
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={handleMore}
                accessibilityLabel="Playlist options"
                accessibilityRole="button">
                <AppText style={styles.moreBtnText}>⋮</AppText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ── Item List / Empty State ── */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          items.length === 0 ? {flex: 1} : styles.listContent
        }
        ListEmptyComponent={
          <EmptyState
            icon="music"
            title="Empty Playlist"
            description="This playlist is empty. Add media to get started."
            actionLabel="Add Media"
            onAction={handleAdd}
          />
        }
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        getItemLayout={(_data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
      />

      {/* ── Modals ── */}
      <PlaylistModal
        visible={modalMode === 'rename'}
        mode="rename"
        currentName={playlist?.name ?? playlistName}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
      <PlaylistModal
        visible={modalMode === 'delete'}
        mode="delete"
        currentName={playlist?.name ?? playlistName}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />

      {/* 52.1: options menus + confirms (replaced Alert.alert) */}
      <OptionSheetDialog
        visible={playlistMenuVisible}
        title="Playlist Options"
        options={[
          {label: 'Rename Playlist', value: 'rename'},
          {label: 'Export as M3U', value: 'export-m3u'},
          {label: 'Export as JSON', value: 'export-json'},
          ...(items.length > 0
            ? [{label: 'Clear All Items', value: 'clear'}]
            : []),
          {label: 'Delete Playlist', value: 'delete'},
        ]}
        selectedValue={null}
        destructiveValues={['delete']}
        onSelect={handlePlaylistMenuSelect}
        onClose={() => setPlaylistMenuVisible(false)}
        colors={colors}
      />
      <OptionSheetDialog
        visible={itemMenuVisible}
        title={menuItem?.title ?? 'Track Options'}
        options={[
          {label: 'Play Next', value: 'play-next'},
          {label: 'Add to Queue', value: 'add-queue'},
          {label: 'Select', value: 'select'},
        ]}
        selectedValue={null}
        onSelect={handleItemMenuSelect}
        onClose={() => setItemMenuVisible(false)}
        colors={colors}
      />

      {dialog}
    </View>
  );
};
