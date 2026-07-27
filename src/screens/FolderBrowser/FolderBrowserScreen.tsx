import React, {useState, useMemo, useCallback, useRef} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {SimbaStatusBar} from '../../components/StatusBar';
import {AppText} from '../../components/core/AppText/AppText';
import {FolderBrowserScreenProps} from '../../navigation/types';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {addItemToPlaylist, createPlaylist} from '../../store/slices/playlistSlice';
import {PlaylistContextMenu} from '../../components/playlist/PlaylistContextMenu';
import {PlaylistCreateModal} from '../../components/playlist/PlaylistCreateModal';
import {useToast} from '../../components/feedback/Toast/Toast';
import {useAppDispatch, useAppSelector} from '../../store';
import type {Playlist, PlaylistItem, PlaylistKind} from '../../types/playlist';

// ── Mock Data ──────────────────────────────────────────

interface MockItem {
  name: string;
  type: 'folder' | 'file';
  children?: MockItem[];
}

const MOCK_ROOT: MockItem[] = [
  {
    name: 'Movies',
    type: 'folder',
    children: [
      {name: 'Inception (2010).mp4', type: 'file'},
      {name: 'Interstellar (2014).mp4', type: 'file'},
      {name: 'The Matrix (1999).mp4', type: 'file'},
      {name: 'Blade Runner 2049.mp4', type: 'file'},
    ],
  },
  {
    name: 'TV Shows',
    type: 'folder',
    children: [
      {
        name: 'Breaking Bad',
        type: 'folder',
        children: [
          {name: 'S01E01 - Pilot.mp4', type: 'file'},
          {name: 'S01E02 - Cats in the Bag.mp4', type: 'file'},
          {name: 'S01E03 - And the Bag in the River.mp4', type: 'file'},
        ],
      },
      {
        name: 'Stranger Things',
        type: 'folder',
        children: [
          {name: 'S01E01 - The Vanishing of Will Byers.mp4', type: 'file'},
          {name: 'S01E02 - The Weirdo on Maple Street.mp4', type: 'file'},
        ],
      },
    ],
  },
  {
    name: 'Music',
    type: 'folder',
    children: [
      {name: 'Live at the Hollywood Bowl.mp4', type: 'file'},
      {name: 'Acoustic Sessions.mp4', type: 'file'},
    ],
  },
  {
    name: 'Documents',
    type: 'folder',
    children: [], // empty folder
  },
  {name: 'readme.txt', type: 'file'},
];

// ── Helpers ─────────────────────────────────────────────

function getItemsAtPath(path: string[]): MockItem[] {
  let current = MOCK_ROOT;
  for (const segment of path) {
    const found = current.find(
      item => item.name === segment && item.type === 'folder',
    );
    if (found?.children) {
      current = found.children;
    } else {
      return [];
    }
  }
  return current;
}

function generateId(): string {
  return `fbs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Screen ──────────────────────────────────────────────

type Props = FolderBrowserScreenProps;

export const FolderBrowserScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // ── Multi-select state (10.4) ─────────────────────
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedFileNames, setSelectedFileNames] = useState<Set<string>>(
    new Set(),
  );
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const toast = useToast();

  const items = useMemo(() => getItemsAtPath(breadcrumbs), [breadcrumbs]);

  const handleEnterFolder = useCallback((folderName: string) => {
    setBreadcrumbs(prev => [...prev, folderName]);
  }, []);

  const handleBreadcrumbPress = useCallback((index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index));
  }, []);

  const handleFilePress = useCallback(
    (fileName: string) => {
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
      const fullPath = [...breadcrumbs, fileName].join('/');
      navigation.navigate('VideoPlayer', {
        fileUri: fullPath,
        fileTitle: fileName,
      });
    },
    [breadcrumbs, navigation, isSelecting],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate network refresh
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // ── Multi-select handlers (10.4) ─────────────────────

  const handleToggleSelect = useCallback(() => {
    setIsSelecting(prev => {
      if (prev) {
        // Exit selection → clear selected items
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

  const handleBatchAddToPlaylist = useCallback(() => {
    setShowPlaylistPicker(true);
  }, []);

  const playlistNameMap = useAppSelector(state => {
    const map: Record<string, string> = {};
    for (const pl of state.playlists.playlists) {
      map[pl.id] = pl.name;
    }
    return map;
  });

  const handleBatchAddConfirm = useCallback(
    (playlistId: string) => {
      const selectedItems: PlaylistItem[] = [];
      const allFiles = getItemsAtPath(breadcrumbs).filter(
        i => i.type === 'file',
      );
      for (const file of allFiles) {
        if (selectedFileNames.has(file.name)) {
          selectedItems.push({
            id: generateId(),
            fileUri: [...breadcrumbs, file.name].join('/'),
            title: file.name,
            duration: 0,
            addedAt: new Date().toISOString(),
          });
        }
      }
      selectedItems.forEach(item => {
        dispatch(addItemToPlaylist({playlistId, item}));
      });

      const plName = playlistNameMap[playlistId] ?? 'Playlist';
      toast.show(
        `Added ${selectedItems.length} items to ${plName}`,
        'success',
      );
      setIsSelecting(false);
      setSelectedFileNames(new Set());
    },
    [breadcrumbs, selectedFileNames, toast, playlistNameMap, dispatch],
  );

  const handleCreateNewFromBatch = useCallback(() => {
    setShowPlaylistPicker(false);
    setTimeout(() => setShowCreateModal(true), 350);
  }, []);

  const handleCreatePlaylistFromBatch = useCallback(
    (name: string, kind: PlaylistKind) => {
      setShowCreateModal(false);
      const result = dispatch(createPlaylist({name, kind}));
      const playlistId = (result as {payload: Playlist}).payload.id;

      const allFiles = getItemsAtPath(breadcrumbs).filter(
        i => i.type === 'file',
      );
      const selectedItems: PlaylistItem[] = [];
      for (const file of allFiles) {
        if (selectedFileNames.has(file.name)) {
          selectedItems.push({
            id: generateId(),
            fileUri: [...breadcrumbs, file.name].join('/'),
            title: file.name,
            duration: 0,
            addedAt: new Date().toISOString(),
          });
        }
      }
      selectedItems.forEach(item => {
        dispatch(addItemToPlaylist({playlistId, item}));
      });
      toast.show(
        `Added ${selectedItems.length} items to "${name}"`,
        'success',
      );
      setIsSelecting(false);
      setSelectedFileNames(new Set());
    },
    [breadcrumbs, selectedFileNames, toast, dispatch],
  );

  // ── Styles ────────────────────────────────────────────

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {flex: 1},
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
        },
        backButton: {
          paddingRight: 16,
          paddingVertical: 4,
        },
        title: {
          fontSize: 28,
          fontWeight: '700',
        },
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
        emptyContainer: {
          alignItems: 'center',
        },
        emptyText: {
          marginTop: 12,
          textAlign: 'center',
        },
        // ── Multi-select (10.4) ────────────────────────
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
    ({item}: {item: MockItem}) => {
      const isFolder = item.type === 'folder';
      const isChecked = !isFolder && selectedFileNames.has(item.name);
      return (
        <TouchableOpacity
          style={styles.itemRow}
          activeOpacity={0.6}
          onPress={() => {
            if (isFolder) {
              handleEnterFolder(item.name);
            } else {
              handleFilePress(item.name);
            }
          }}
          onLongPress={() => {
            if (!isFolder) {
              handleFileLongPress(item.name);
            }
          }}>
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
              {item.children?.length ?? 0} items
            </AppText>
          )}
        </TouchableOpacity>
      );
    },
    [styles, handleEnterFolder, handleFilePress, isSelecting, selectedFileNames, handleFileLongPress],
  );

  const renderBreadcrumbs = () => {
    const segments = ['Home', ...breadcrumbs];
    return (
      <View style={styles.breadcrumbRow}>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <View key={`${segment}-${index}`} style={styles.breadcrumbItem}>
              {index > 0 && (
                <AppText variant="caption" style={styles.separator}>
                  /
                </AppText>
              )}
              <TouchableOpacity
                onPress={() => handleBreadcrumbPress(index - 1)}
                disabled={isLast}
                activeOpacity={0.6}>
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

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <AppText variant="h3" color="tertiary">
        This folder is empty
      </AppText>
      <AppText variant="body2" color="tertiary" style={styles.emptyText}>
        No files or folders to show.
      </AppText>
    </View>
  );

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
      <FlatList
        style={{flex: 1}}
        data={items}
        keyExtractor={item => item.name}
        renderItem={renderItem}
        contentContainerStyle={
          items.length === 0 ? styles.listEmptyContent : styles.listContent
        }
        ListEmptyComponent={renderEmptyState}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        getItemLayout={(_data, index) => ({
          length: 50,
          offset: 50 * index,
          index,
        })}
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

      {/* ── Floating batch action bar (10.4.4) ────────── */}
      {isSelecting && selectedFileNames.size > 0 && (
        <TouchableOpacity
          style={styles.batchBar}
          activeOpacity={0.8}
          onPress={handleBatchAddToPlaylist}>
          <AppText
            variant="body2"
            color="primary"
            style={styles.batchBarText}>
            {`Add to Playlist (${selectedFileNames.size})`}
          </AppText>
        </TouchableOpacity>
      )}

      {/* ── Playlist picker context menu (10.4.5) ────── */}
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
