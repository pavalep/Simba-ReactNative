import React, {useMemo, useState, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Share,
} from 'react-native';
import RNFS from 'react-native-fs';
import {pick, types, keepLocalCopy} from '@react-native-documents/picker';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
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
  importPlaylist,
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
import type {PlaylistKind} from '../../types/playlist';
import {
  generateM3u,
  generatePlaylistJson,
  parseM3u,
} from '../../utils/m3uParser';
import {spacing} from '../../theme/tokens';
import {isVideoFile} from '../../utils/timeAgo';
import {getFileName} from '../../services/fileService';
import {shareContent} from '../../services/shareService';
import {OptionSheetDialog} from '../../components/core/OptionSheetDialog/OptionSheetDialog';
import {MediaActionsSheet} from '../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useConfirmDialog} from '../../components/core/Dialog/ConfirmDialog';
import {useToast} from '../../components/feedback/Toast/Toast';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {BackButton} from '../../components/utility/BackButton/BackButton';
import {isRemoteUri} from '../../utils/mediaUri';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';

type Props = PlaylistDetailScreenProps;

const THUMBNAIL_SIZE = 48;
const ITEM_HEIGHT = 66;

// ─── Import helpers (56.5) ─────────────────────────────────

/** Derive a playlist kind from the media types of its items. */
function deriveKind(items: PlaylistItem[]): PlaylistKind {
  const hasVideo = items.some(i => i.mediaType === 'video');
  const hasAudio = items.some(i => i.mediaType === 'audio');
  return hasVideo && hasAudio
    ? 'MIXED'
    : hasVideo
      ? 'VIDEO_ONLY'
      : 'AUDIO_ONLY';
}

/** Parse the app's JSON playlist export into PlaylistItems (validated). */
function parseImportedJson(content: string): PlaylistItem[] {
  const parsed = JSON.parse(content) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((raw, i): PlaylistItem[] => {
    if (!raw || typeof raw !== 'object') return [];
    const entry = raw as Record<string, unknown>;
    if (typeof entry.fileUri !== 'string' || !entry.fileUri) return [];
    return [
      {
        id: `imp_${Date.now()}_${i}`,
        fileUri: entry.fileUri,
        title:
          typeof entry.title === 'string' && entry.title
            ? entry.title
            : getFileName(entry.fileUri).replace(/\.[^.]+$/, ''),
        duration: typeof entry.duration === 'number' ? entry.duration : 0,
        artist: typeof entry.artist === 'string' ? entry.artist : undefined,
        album: typeof entry.album === 'string' ? entry.album : undefined,
        thumbnailPath:
          typeof entry.thumbnailPath === 'string' ? entry.thumbnailPath : undefined,
        addedAt: new Date().toISOString(),
        // P34.4: prefer the exported media type — extensionless remote URLs
        // misclassify as video when guessed from the file name alone.
        mediaType:
          entry.mediaType === 'video' || entry.mediaType === 'audio'
            ? entry.mediaType
            : isVideoFile(entry.fileUri)
              ? 'video'
              : 'audio',
        source: typeof entry.source === 'string' ? entry.source : undefined,
      },
    ];
  });
}

export const PlaylistDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const {confirm, dialog} = useConfirmDialog();
  const {playlistId, playlistName} = route.params;
  // P34.5: offline guard for remote/streaming playlist items
  const {isOnline} = useNetworkStatus();

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
    if (items.length === 0) return;
    // P34.5: skip remote items while offline
    const playable = items.filter(i => !(isRemoteUri(i.fileUri) && !isOnline));
    if (playable.length === 0) {
      toast.show('Offline — streams are unavailable');
      return;
    }
    const entries = playlistItemsToEntries(playable);
    dispatch(loadPlaylistToPlayer(entries));
    const first = playable[0];
    // P34.4: mediaType wins over extension guessing for remote URLs
    const isVideo = first.mediaType
      ? first.mediaType === 'video'
      : isVideoFile(first.fileUri);
    navigation.navigate(isVideo ? 'VideoPlayer' : 'AudioPlayer', {
      fileUri: first.fileUri,
      fileTitle: first.title,
      ...(first.source ? {source: first.source} : {}),
      ...(!isVideo && first.thumbnailPath
        ? {artworkUri: first.thumbnailPath}
        : {}),
    });
  }, [items, dispatch, navigation, isOnline, toast]);

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

  // 56.4: share the playlist as a deep link + https fallback
  const handleSharePlaylist = useCallback(() => {
    const name = playlist?.name ?? playlistName;
    shareContent({
      route: 'PlaylistDetail',
      params: {playlistId},
      title: name,
      subtitle: `${items.length} item${items.length !== 1 ? 's' : ''}`,
    });
  }, [playlist, playlistName, playlistId, items.length]);

  // 56.5: import an .m3u / .json playlist file as a new playlist
  const handleImportPlaylist = useCallback(async () => {
    try {
      const [result] = await pick({
        type: [types.allFiles],
        allowMultiSelection: false,
        mode: 'open',
      });
      if (!result) return;

      // Copy to the app cache so RNFS can read it (content:// is unsupported)
      const copies = await keepLocalCopy({
        files: [{uri: result.uri, fileName: result.name ?? 'playlist.txt'}],
        destination: 'cachesDirectory',
      });
      const localUri =
        copies[0] && copies[0].status === 'success'
          ? copies[0].localUri
          : null;
      if (!localUri) {
        toast.show('Could not read the selected file');
        return;
      }

      const content = await RNFS.readFile(localUri, 'utf8');
      const ext = (result.name ?? '').split('.').pop()?.toLowerCase() ?? '';

      let imported: PlaylistItem[] = [];
      if (ext === 'm3u') {
        const parsed = parseM3u(content);
        imported = parsed.entries.map((e, i) => ({
          id: `imp_${Date.now()}_${i}`,
          fileUri: e.fileUri,
          title:
            e.title || getFileName(e.fileUri).replace(/\.[^.]+$/, ''),
          duration: e.duration > 0 ? e.duration * 1000 : 0,
          artist: e.artist,
          addedAt: new Date().toISOString(),
          mediaType: isVideoFile(e.fileUri) ? 'video' : 'audio',
        }));
      } else if (ext === 'json') {
        imported = parseImportedJson(content);
      } else {
        toast.show('Choose a .m3u or .json file');
        return;
      }

      if (imported.length === 0) {
        toast.show('No playable items found in file');
        return;
      }

      dispatch(
        importPlaylist({
          name: `${playlistName} (imported)`,
          items: imported,
          kind: deriveKind(imported),
        }),
      );
      toast.show(
        `Imported ${imported.length} item${imported.length !== 1 ? 's' : ''}`,
      );
    } catch {
      toast.show('Import failed — invalid file');
    }
  }, [dispatch, playlistName, toast]);

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
        case 'share':
          handleSharePlaylist();
          break;
        case 'import':
          handleImportPlaylist();
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
    [handleExport, handleClearPlaylist, handleSharePlaylist, handleImportPlaylist],
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
      // P34.5: remote items need a network connection to stream
      if (isRemoteUri(item.fileUri) && !isOnline) {
        toast.show('Offline — this stream is unavailable');
        return;
      }
      // P34.4: mediaType wins over extension guessing for remote URLs
      const isVideo = item.mediaType
        ? item.mediaType === 'video'
        : isVideoFile(item.fileUri);
      navigation.navigate(isVideo ? 'VideoPlayer' : 'AudioPlayer', {
        fileUri: item.fileUri,
        fileTitle: item.title,
        ...(item.source ? {source: item.source} : {}),
        ...(!isVideo && item.thumbnailPath
          ? {artworkUri: item.thumbnailPath}
          : {}),
      });
    },
    [navigation, isOnline, toast],
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
          if (isRemoteUri(menuItem.fileUri) && !isOnline) {
            toast.show('Offline — stream unavailable');
            break;
          }
          dispatch(
            prependToQueue({
              uri: menuItem.fileUri,
              title: menuItem.title,
              duration: menuItem.duration,
              // P34.7: keep source + media type so the queue routes correctly
              source: menuItem.source,
              mediaType: menuItem.mediaType,
            }),
          );
          toast.show('Playing next');
          break;
        case 'add-queue':
          if (isRemoteUri(menuItem.fileUri) && !isOnline) {
            toast.show('Offline — stream unavailable');
            break;
          }
          dispatch(
            addToQueue({
              uri: menuItem.fileUri,
              title: menuItem.title,
              duration: menuItem.duration,
              source: menuItem.source,
              mediaType: menuItem.mediaType,
            }),
          );
          toast.show('Added to queue');
          break;
        case 'share-item':
          // 56.4: share a single playlist item as a deep link
          shareContent({
            route:
              menuItem.mediaType === 'video' ||
              (menuItem.mediaType !== 'audio' &&
                isVideoFile(menuItem.fileUri))
                ? 'VideoPlayer'
                : 'AudioPlayer',
            params: {
              fileUri: menuItem.fileUri,
              fileTitle: menuItem.title,
              source: menuItem.source,
            },
            title: menuItem.title,
            subtitle: menuItem.artist,
          });
          break;
        case 'select':
          setIsSelecting(true);
          setSelectedIds(new Set([menuItem.id]));
          break;
      }
      setMenuItem(null);
    },
    [menuItem, dispatch, toast, isOnline],
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
        thumbnailImageWrap: {
          overflow: 'hidden',
          backgroundColor: colors.background.elevated,
        },
        thumbnailImage: {
          width: THUMBNAIL_SIZE,
          height: THUMBNAIL_SIZE,
        },
        offlineBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        offlineBadgeText: {
          color: colors.semantic.warning,
          fontSize: 10,
          fontWeight: '600',
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

          {/* Thumbnail — real art when available (P34.3) */}
          {item.thumbnailPath ? (
            <View style={[styles.thumbnail, styles.thumbnailImageWrap]}>
              <FastImage
                source={{uri: item.thumbnailPath}}
                style={styles.thumbnailImage}
                resizeMode={FastImage.resizeMode.cover}
              />
            </View>
          ) : (
            <View
              style={[
                styles.thumbnail,
                {backgroundColor: colors.accent.goldDim},
              ]}>
              <AppText style={styles.thumbnailText}>
                {item.title.charAt(0).toUpperCase()}
              </AppText>
            </View>
          )}

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
              {/* P34.5: offline badge for remote items */}
              {isRemoteUri(item.fileUri) && !isOnline && (
                <View style={styles.offlineBadge}>
                  <SvgIcon
                    name="alertCircle"
                    size={12}
                    color={colors.semantic.warning}
                  />
                  <AppText style={styles.offlineBadgeText}>Offline</AppText>
                </View>
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
      isOnline,
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
        <BackButton />

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
          {label: 'Share Playlist', value: 'share'},
          {label: 'Import Playlist', value: 'import'},
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
      {/* 58.4/58.5: item long-press → one bottom-sheet menu */}
      <MediaActionsSheet
        visible={itemMenuVisible}
        onClose={() => setItemMenuVisible(false)}
        title={menuItem?.title ?? 'Track Options'}
        subtitle={menuItem?.artist}
        actions={[
          {
            label: 'Play Next',
            icon: 'skipForward',
            onPress: () => handleItemMenuSelect('play-next'),
          },
          {
            label: 'Add to Queue',
            icon: 'list',
            onPress: () => handleItemMenuSelect('add-queue'),
          },
          {
            label: 'Share',
            icon: 'share',
            onPress: () => handleItemMenuSelect('share-item'),
          },
          {
            label: 'Select',
            icon: 'check',
            onPress: () => handleItemMenuSelect('select'),
          },
        ]}
      />

      {dialog}
    </View>
  );
};
