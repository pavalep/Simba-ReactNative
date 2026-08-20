import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../components/feedback/Placeholder';
import LinearGradient from 'react-native-linear-gradient';
import RNFS from 'react-native-fs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {isVideoFile} from '../../utils/timeAgo';
import {getMediaType} from '../../services/fileService';
import {linkedMediaFolderIdFromPath, normalizeMediaClassification} from '../../types/media';

import {SimbaStatusBar} from '../../components/StatusBar';
import {AppText} from '../../components/core/AppText/AppText';
import type {RootStackScreenProps} from '../../navigation/types';
type FolderBrowserScreenProps = RootStackScreenProps<'FolderBrowser'>;
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';

import {PlaylistContextMenu} from '../../components/playlist/PlaylistContextMenu';
import {PlaylistCreateModal} from '../../components/playlist/PlaylistCreateModal';
import {useToast} from '../../components/feedback/Toast/Toast';
import {logger} from '../../lib/logger';
import {usePlaylists} from '../../features/playlists';
import {usePlaybackCommands} from '../../modules/playback';

import type {PlaylistItem, PlaylistKind} from '../../types/playlist';



// ── Constants ──────────────────────────────────────────

const ITEM_HEIGHT = 76;
const MEDIA_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp',
  '.mp3', '.flac', '.wav', '.aac', '.ogg', '.wma', '.m4a', '.opus',
]);

function isMediaFile(name: string): boolean {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  return MEDIA_EXTENSIONS.has(ext);
}

// ── Screen ──────────────────────────────────────────────

type Props = FolderBrowserScreenProps;

interface DirItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

export const FolderBrowserScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {playlists, addItem, createPlaylist} = usePlaylists();
  const {openPlayer} = usePlaybackCommands();

  // Initialize breadcrumbs from initialPath param
  const initialPath = route.params?.initialPath ?? '';
  // When opened from PlaylistDetail "Add", pre-target a playlist so the
  // batch action adds directly to it (no picker).
  const targetPlaylistId = route.params?.targetPlaylistId;
  const initialCrumbs = useMemo(() => {
    if (!initialPath) return [];
    return initialPath.split('/').filter(Boolean);
  }, [initialPath]);

  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(initialCrumbs);
  const [items, setItems] = useState<DirItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Multi-select state ─────────────────────
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedFileNames, setSelectedFileNames] = useState<Set<string>>(
    new Set(),
  );
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const toast = useToast();

  // ── Build full path from breadcrumbs ───────
  const currentPath = useMemo(() => {
    if (breadcrumbs.length === 0) return RNFS.ExternalStorageDirectoryPath || '/storage/emulated/0';
    // If initialPath was absolute, reconstruct it
    if (initialPath.startsWith('/')) {
      return '/' + breadcrumbs.join('/');
    }
    return breadcrumbs.join('/');
  }, [breadcrumbs, initialPath]);

  // ── Read directory contents ────────────────
  const readDirectory = useCallback(async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      const entries = await RNFS.readDir(path);
      const filtered = entries
        .filter(e => e.isDirectory() || isMediaFile(e.name))
        .map(e => ({
          name: e.name,
          path: e.path,
          isDirectory: e.isDirectory(),
          size: Number(e.size),
        }))
        // Sort: folders first, then by name
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      setItems(filtered);
    } catch (err: any) {
      logger.warn('FolderBrowser readDir error:', err);
      const code = String(err?.code ?? '').toUpperCase();
      const message = String(err?.message ?? '').toLowerCase();
      const permissionDenied =
        code.includes('EACCES') ||
        code.includes('PERMISSION') ||
        message.includes('permission') ||
        message.includes('access denied');
      setError(
        permissionDenied
          ? 'Storage permission is required to browse this folder. Open Settings to review access, then retry.'
          : err.message || 'Unable to read directory',
      );
      setItems([]);
    } finally {
      setLoading(false);
    }

  }, []);

  // ── Effect: read directory when path changes ──
  useEffect(() => {
    readDirectory(currentPath);
  }, [currentPath, readDirectory]);

  // ── Auto-enter selection mode when opened to add to a target playlist ──
  useEffect(() => {
    if (targetPlaylistId) {
      setIsSelecting(true);
    }
  }, [targetPlaylistId]);

  // ── Handlers ────────────────────────────────

  const handleEnterFolder = useCallback((folderPath: string) => {
    // Extract folder name from the full path for breadcrumbs
    const folderName = folderPath.split('/').pop() || folderPath;
    setBreadcrumbs(prev => [...prev, folderName]);
  }, []);

  const handleBreadcrumbPress = useCallback((index: number) => {
    if (index < 0) {
      // Going back to root: use initial root
      setBreadcrumbs([]);
    } else {
      setBreadcrumbs(prev => prev.slice(0, index));
    }
  }, []);

  const handleFilePress = useCallback(
    (filePath: string, fileName: string) => {
      if (isSelecting) {
        setSelectedFileNames(prev => {
          const next = new Set(prev);
          if (next.has(fileName)) {
            next.delete(fileName);
          } else {
            next.add(fileName);
          }
          return next;
        });
        return;
      }
      const mediaType = getMediaType(filePath);
      openPlayer({
        uri: `file://${filePath}`,
        title: fileName,
        duration: 0,
        ...normalizeMediaClassification({
          source: 'local',
          type: mediaType === 'audio' ? 'audio' : 'video',
          mediaType,
          folderId: linkedMediaFolderIdFromPath(currentPath),
        }),
      });
    },
    [openPlayer, isSelecting, currentPath],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await readDirectory(currentPath);
    setRefreshing(false);
  }, [currentPath, readDirectory]);

  // Surface directory read failures as a toast with a Retry action.
  // The user can also still pull-to-refresh.
  useEffect(() => {
    if (error) {
      toast.show(error, 'error', {
        duration: 8000,
        action: error.toLowerCase().includes('permission')
          ? {
              label: 'Settings',
              onPress: () => navigation.navigate('Settings', {screen: 'Settings'}),
            }
          : {label: 'Retry', onPress: () => readDirectory(currentPath)},
      });
    }
  }, [error, currentPath, navigation, readDirectory, toast]);

  // ── Multi-select handlers ─────────────────────

  const handleToggleSelect = useCallback(() => {
    setIsSelecting(prev => {
      if (prev) {
        setSelectedFileNames(new Set());
      }
      return !prev;
    });
  }, []);

  const handleToggleFileSelection = useCallback((fileName: string) => {
    setSelectedFileNames(prev => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  }, []);

  const handleFileLongPress = useCallback(
    (fileName: string) => {
      if (!isSelecting) {
        setIsSelecting(true);
        setSelectedFileNames(new Set([fileName]));
      } else {
        handleToggleFileSelection(fileName);
      }
    },
    [isSelecting, handleToggleFileSelection],
  );

  const playlistNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    playlists.forEach(playlist => {
      map[playlist.id] = playlist.name;
    });
    return map;
  }, [playlists]);

  const handleBatchAddConfirm = useCallback(
    (playlistId: string) => {
      const selectedItems: PlaylistItem[] = items
        .filter(i => !i.isDirectory && selectedFileNames.has(i.name))
        .map(file => ({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          fileUri: `file://${file.path}`,
          title: file.name,
          duration: 0,
          addedAt: new Date().toISOString(),
          ...normalizeMediaClassification({
            source: 'local',
            type: getMediaType(file.path) === 'audio' ? 'audio' : 'video',
            mediaType: getMediaType(file.path),
            folderId: linkedMediaFolderIdFromPath(currentPath),
          }),
        }));

      selectedItems.forEach(item => {
        addItem(playlistId, item);
      });

      const plName = playlistNameMap[playlistId] ?? 'Playlist';
      toast.show(
        `Added ${selectedItems.length} items to ${plName}`,
        'success',
      );
      setIsSelecting(false);
      setSelectedFileNames(new Set());
      // Targeted flow (opened from PlaylistDetail "Add"): return to it.
      if (targetPlaylistId) {
        navigation.goBack();
      }
    },
    [items, selectedFileNames, toast, playlistNameMap, addItem, targetPlaylistId, navigation],
  );

  const handleBatchAddToPlaylist = useCallback(() => {
    if (targetPlaylistId) {
      // Opened from a playlist's "Add" button — add directly to it.
      handleBatchAddConfirm(targetPlaylistId);
    } else {
      setShowPlaylistPicker(true);
    }
  }, [targetPlaylistId, handleBatchAddConfirm]);

  const handleCreateNewFromBatch = useCallback(() => {
    setShowPlaylistPicker(false);
    setTimeout(() => setShowCreateModal(true), 350);
  }, []);

  const handleCreatePlaylistFromBatch = useCallback(
    (name: string, kind: PlaylistKind) => {
      setShowCreateModal(false);
      const result = createPlaylist({name, kind});
      if (result.status !== 'created') {
        toast.show('You can have up to 20 playlists', 'error');
        return;
      }
      const playlistId = result.playlist.id;

      const selectedItems: PlaylistItem[] = items
        .filter(i => !i.isDirectory && selectedFileNames.has(i.name))
        .map(file => ({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          fileUri: `file://${file.path}`,
          title: file.name,
          duration: 0,
          addedAt: new Date().toISOString(),
          ...normalizeMediaClassification({
            source: 'local',
            type: getMediaType(file.path) === 'audio' ? 'audio' : 'video',
            mediaType: getMediaType(file.path),
            folderId: linkedMediaFolderIdFromPath(currentPath),
          }),
        }));

      selectedItems.forEach(item => {
        addItem(playlistId, item);
      });
      toast.show(
        `Added ${selectedItems.length} items to "${name}"`,
        'success',
      );
      setIsSelecting(false);
      setSelectedFileNames(new Set());
    },
    [items, selectedFileNames, toast, createPlaylist, addItem],
  );

  // ── Styles ────────────────────────────────────────────

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {flex: 1},
        breadcrumbRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 8,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
          flexWrap: 'wrap',
        },
        breadcrumbItem: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        separator: {
          marginHorizontal: 6,
          color: colors.text.tertiary,
        },
        listContent: {
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20,
          flexGrow: 1,
        },
        listEmptyContent: {
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        },
        itemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        iconContainer: {
          width: 32,
          alignItems: 'center',
          marginRight: 12,
        },
        // (Replaced by the shared <Placeholder> component.)
        // ── Multi-select ────────────────────────
        checkbox: {
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        },
        checkboxChecked: {
          backgroundColor: colors.accent.gold,
          borderColor: colors.accent.gold,
        },
        checkboxUnchecked: {
          borderColor: colors.border.subtle,
        },
        checkmark: {
          color: colors.text.primary,
          fontSize: 14,
          fontWeight: '700',
          lineHeight: 16,
        },
        batchBar: {
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: insets.bottom + 16,
          backgroundColor: colors.background.elevated,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 8,
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.35,
          shadowRadius: 12,
        },
        batchBarText: {
          fontSize: 16,
          fontWeight: '600',
        },
      }),
    [colors, insets],
  );

  const renderItem = useCallback(
    ({item}: {item: DirItem}) => {
      const isFolder = item.isDirectory;
      const isChecked = !isFolder && selectedFileNames.has(item.name);
      return (
        <TouchableOpacity
          style={styles.itemRow}
          activeOpacity={0.6}
          onPress={() => {
            if (isFolder) {
              handleEnterFolder(item.path);
            } else {
              handleFilePress(item.path, item.name);
            }
          }}
          onLongPress={() => {
            if (!isFolder) {
              handleFileLongPress(item.name);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={isFolder ? `Open folder ${item.name}` : `Select file ${item.name}`}
          accessibilityState={{checked: isChecked}}>
          {/* Show checkbox in selection mode for files */}
          {isSelecting && !isFolder && (
            <View
              style={[
                styles.checkbox,
                isChecked
                  ? styles.checkboxChecked
                  : styles.checkboxUnchecked,
              ]}>
              {isChecked && (
                <AppText style={styles.checkmark}>{'\u2713'}</AppText>
              )}
            </View>
          )}
          <View style={styles.iconContainer}>
            <AppText
              variant="body2"
              color={isFolder ? 'accent' : 'secondary'}>
              {isFolder ? '\u25B6' : '\u25C9'}
            </AppText>
          </View>
          <AppText
            variant="body2"
            color={isFolder ? 'primary' : 'secondary'}
            style={{flex: 1}}
            numberOfLines={1}>
            {item.name}
          </AppText>
          {isFolder && (
            <AppText
              variant="caption"
              color="tertiary"
              style={{marginLeft: 8}}>
              folder
            </AppText>
          )}
        </TouchableOpacity>
      );
    },
    [styles, handleEnterFolder, handleFilePress, isSelecting, selectedFileNames, handleFileLongPress],
  );

  const renderBreadcrumbs = () => {
    return (
      <View style={styles.breadcrumbRow}>
        <TouchableOpacity
          onPress={() => handleBreadcrumbPress(-1)}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Go to home folder">
          <AppText
            variant="caption"
            color={breadcrumbs.length === 0 ? 'accent' : 'secondary'}>
            Home
          </AppText>
        </TouchableOpacity>
        {/* 59.1: flexWrap flow layout — .map kept (FlatList can't wrap) */}
        {breadcrumbs.map((segment, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <View key={`${segment}-${index}`} style={styles.breadcrumbItem}>
              <AppText variant="caption" style={styles.separator}>
                /
              </AppText>
              <TouchableOpacity
                onPress={() => handleBreadcrumbPress(index + 1)}
                disabled={isLast}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={`Go to folder ${segment}`}>
                <AppText
                  variant="caption"
                  color={isLast ? 'accent' : 'secondary'}>
                  {segment}
                </AppText>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    // Page-1 directory read failures are surfaced via the top-of-screen
    // toast (see useEffect above). The empty state below still shows.
    if (error) {
      return null;
    }
    return (
      <Placeholder
        variant="empty"
        anchor="top-third"
        icon="folder"
        title="This folder is empty"
        message="No media files or subfolders found."
      />
    );
  };

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.primary]}
        style={StyleSheet.absoluteFill}
      />
      <InternalHeader
        title="Folder Browser"
        subtitle={isSelecting ? `${selectedFileNames.size} Selected` : undefined}
        rightAction={{
          label: isSelecting ? 'Cancel' : 'Select',
          onPress: handleToggleSelect,
        }}
      />
      {renderBreadcrumbs()}
      {loading && items.length === 0 ? (
        <Placeholder variant="loading" anchor="top-third" title="Loading folder…" />
      ) : (
        <FlatList
          style={{flex: 1}}
          data={items}
          keyExtractor={item => item.path}
          renderItem={renderItem}
          contentContainerStyle={
            items.length === 0 ? styles.listEmptyContent : styles.listContent
          }
          ListEmptyComponent={renderEmptyState}
          getItemLayout={(_, index) => ({length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index})}
          windowSize={5}
          maxToRenderPerBatch={20}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent.gold}
              colors={[colors.accent.gold]}
              progressBackgroundColor={colors.background.primary}
            />
          }
        />
      )}

      {/* ── Floating batch action bar ────────── */}
      {isSelecting && selectedFileNames.size > 0 && (
        <TouchableOpacity
          style={styles.batchBar}
          activeOpacity={0.8}
          onPress={handleBatchAddToPlaylist}
          accessibilityRole="button">
          <AppText
            variant="body2"
            color="primary"
            style={styles.batchBarText}>
            {targetPlaylistId
              ? `Add to ${playlistNameMap[targetPlaylistId] ?? 'Playlist'} (${selectedFileNames.size})`
              : `Add to Playlist (${selectedFileNames.size})`}
          </AppText>
        </TouchableOpacity>
      )}

      {/* ── Playlist picker context menu ────── */}
      <PlaylistContextMenu
        item={undefined}
        batchCount={selectedFileNames.size || undefined}
        visible={showPlaylistPicker}
        onClose={() => setShowPlaylistPicker(false)}
        onAddToPlaylist={handleBatchAddConfirm}
        onCreateNew={handleCreateNewFromBatch}
      />

      {/* ── Create new playlist modal ─────────────── */}
      <PlaylistCreateModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreatePlaylistFromBatch}
      />
    </View>
  );
};
