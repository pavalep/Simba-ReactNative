import React, {useMemo, useState, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
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
import {AppText} from '../../components/core/AppText/AppText';
import {PlaylistDetailScreenProps} from '../../navigation/types';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {PlaylistModal} from '../../features/playlists/components/PlaylistModal';
import type {PlaylistItem} from '../../types/playlist';
import {
  generateM3u,
  generatePlaylistJson,
} from '../../utils/m3uParser';
import {spacing} from '../../theme/tokens';

type Props = PlaylistDetailScreenProps;

const THUMBNAIL_SIZE = 48;
const ITEM_HEIGHT = 66;

export const PlaylistDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const {playlistId, playlistName} = route.params;

  // ── Redux data ──
  const playlist = useAppSelector(selectPlaylistById(playlistId));
  const items = playlist?.items ?? [];

  // ── Local UI state ──
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalMode, setModalMode] = useState<'rename' | 'delete' | null>(null);

  // ── Header: Add ──
  const handleAdd = useCallback(() => {
    Alert.alert(
      'Add to Playlist',
      'Media picking flow would open here.',
    );
  }, []);

  // ── Header: Options menu ──
  const handleMore = useCallback(() => {
    Alert.alert('Playlist Options', '', [
      {
        text: 'Rename Playlist',
        onPress: () => setModalMode('rename'),
      },
      {
        text: 'Export as M3U',
        onPress: async () => {
          try {
            const m3u = generateM3u(items);
            await Share.share({
              message: m3u,
              title: `${playlistName}.m3u`,
            });
          } catch {
            // user cancelled share
          }
        },
      },
      {
        text: 'Export as JSON',
        onPress: async () => {
          try {
            const json = generatePlaylistJson(items);
            await Share.share({
              message: json,
              title: `${playlistName}.json`,
            });
          } catch {
            // user cancelled share
          }
        },
      },
      ...(items.length > 0
        ? [
            {
              text: 'Clear All Items',
              style: 'destructive' as const,
              onPress: () => {
                Alert.alert(
                  'Clear Playlist',
                  `Remove all ${items.length} items from "${playlistName}"?`,
                  [
                    {text: 'Cancel', style: 'cancel' as const},
                    {
                      text: 'Clear All',
                      style: 'destructive' as const,
                      onPress: () =>
                        dispatch(clearPlaylist(playlistId)),
                    },
                  ],
                );
              },
            },
          ]
        : []),
      {
        text: 'Delete Playlist',
        style: 'destructive' as const,
        onPress: () => setModalMode('delete'),
      },
      {text: 'Cancel', style: 'cancel' as const},
    ]);
  }, [items, playlistName, playlistId, dispatch]);

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

  const handleBatchDelete = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert(
      'Remove Items',
      `Remove ${count} selected item${count !== 1 ? 's' : ''}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            selectedIds.forEach(id => {
              dispatch(
                removeItemFromPlaylist({playlistId, itemId: id}),
              );
            });
            setSelectedIds(new Set());
            setIsSelecting(false);
          },
        },
      ],
    );
  }, [selectedIds, dispatch, playlistId]);

  const exitBatchMode = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  // ── Item interactions ──
  const handlePlay = useCallback(
    (item: PlaylistItem) => {
      navigation.navigate('VideoPlayer', {
        fileUri: item.fileUri,
        fileTitle: item.title,
      });
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
      if (!isSelecting) {
        setIsSelecting(true);
        setSelectedIds(new Set([item.id]));
      }
    },
    [isSelecting],
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
          color: '#FFFFFF',
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
          color: '#0A0A0C',
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
    [colors, insets, isDark],
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
    </View>
  );
};
