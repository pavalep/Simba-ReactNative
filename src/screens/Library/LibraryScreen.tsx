import React, {useEffect, useState, useMemo, useCallback, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {useAppSelector, useAppDispatch} from '../../store';
import {setTracks, setScanning, selectAllTracks} from '../../store/slices/mediaSlice';
import {loadPlaylistToPlayer, playlistItemsToEntries} from '../../store/slices/playerSlice';
import {selectAllPlaylists} from '../../store/slices/playlistSlice';
import {scanAudioFolders} from '../../services/metadataService';
import {SimbaStatusBar} from '../../components/StatusBar';
import {AppText} from '../../components/core/AppText/AppText';
import {LoadingOverlay} from '../../components/core/Skeleton/LoadingOverlay';
import {ScanProgressBanner} from '../../components/feedback/ScanProgressBanner/ScanProgressBanner';
import {SvgIcon, SvgIconName} from '../../components/utility/SvgIcon';
import {spacing, radius} from '../../theme/tokens';
import {LibraryScreenProps} from '../../navigation/types';
import {PlaylistCreateModal} from '../../components/playlist/PlaylistCreateModal';
import type {PlaylistKind} from '../../types/playlist';
import {LibraryVideosSegment} from './components/LibraryVideosSegment';
import {LibraryAudioSegment} from './components/LibraryAudioSegment';
import {LibraryArtistsSegment} from './components/LibraryArtistsSegment';
import {LibraryAlbumsSegment} from './components/LibraryAlbumsSegment';
import {LibraryFoldersSegment} from './components/LibraryFoldersSegment';
import {LibraryPlaylistsSegment} from './components/LibraryPlaylistsSegment';
import {ViewToggle, ViewMode} from './components/ViewToggle';

type Props = LibraryScreenProps;
type Segment = 'videos' | 'audio' | 'artists' | 'albums' | 'folders' | 'playlists';

type SortOption = 'name' | 'dateAdded' | 'duration' | 'artist' | 'album';

const SEGMENTS: {key: Segment; label: string; icon: SvgIconName}[] = [
  {key: 'videos', label: 'Videos', icon: 'video'},
  {key: 'audio', label: 'Audio', icon: 'music'},
  {key: 'artists', label: 'Artists', icon: 'headphones'},
  {key: 'albums', label: 'Albums', icon: 'listMusic'},
  {key: 'folders', label: 'Folders', icon: 'folder'},
  {key: 'playlists', label: 'Playlists', icon: 'listMusic'},
];

const FILTER_CHIPS: {key: 'all' | 'video' | 'audio'; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'video', label: 'Video'},
  {key: 'audio', label: 'Audio'},
];

const SORT_OPTIONS: {key: SortOption; label: string}[] = [
  {key: 'name', label: 'Name'},
  {key: 'dateAdded', label: 'Date Added'},
  {key: 'duration', label: 'Duration'},
  {key: 'artist', label: 'Artist'},
  {key: 'album', label: 'Album'},
];

/** Segments that support grid/list view toggle */
const VIEW_TOGGLE_SEGMENTS: Segment[] = ['videos', 'audio'];

/** Segments that show sort controls */
const SORT_SEGMENTS: Segment[] = ['videos', 'audio'];

/** Segments that show filter chips */
const FILTER_SEGMENTS: Segment[] = ['videos', 'audio'];

export const LibraryScreen: React.FC<Props> = ({navigation}) => {
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const bottomChromeInset = insets.bottom + 104;
  const dispatch = useAppDispatch();

  const [activeSegment, setActiveSegment] = useState<Segment>('videos');

  // ── Phase 21: View mode, sort, filter ──
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio'>('all');
  const [sortPickerVisible, setSortPickerVisible] = useState(false);

  const videoFolders = useAppSelector(s => s.settings?.videoFolders ?? []);
  const audioFolders = useAppSelector(s => s.settings?.audioFolders ?? []);
  const isSettingsScanning = useAppSelector(s => s.settings?.isScanning ?? false);
  const lastScanTimestamp = useAppSelector(s => s.settings?.lastScanTimestamp ?? null);
  const scannedTracks = useAppSelector(selectAllTracks);
  const isMediaScanning = useAppSelector(s => s.media?.isScanning ?? false);
  const allPlaylists = useAppSelector(selectAllPlaylists);
  const scannedTrackCount = scannedTracks.length;
  const scanningRef = useRef(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // ── Metadata scanning: trigger when user opens Artists or Albums ──
  useEffect(() => {
    if (
      (activeSegment === 'artists' || activeSegment === 'albums') &&
      scannedTracks.length === 0 &&
      audioFolders.length > 0 &&
      !isMediaScanning &&
      !scanningRef.current
    ) {
      scanningRef.current = true;
      dispatch(setScanning(true));

      scanAudioFolders(audioFolders)
        .then(tracks => {
          dispatch(setTracks(tracks));
        })
        .catch(() => {
          // Silently fail — user can retry by switching tabs
        })
        .finally(() => {
          dispatch(setScanning(false));
          scanningRef.current = false;
        });
    }
  }, [activeSegment, audioFolders, scannedTracks.length, isMediaScanning, dispatch]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },

        // ── Ambient glow ──
        glowWarm: {
          position: 'absolute',
          top: -120,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
        },

        // ── Header ──
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'android' ? 16 : 4,
          paddingBottom: 12,
        },

        // ── Segmented Control ──
        segmentedControl: {
          flexDirection: 'row',
          paddingHorizontal: 20,
          marginBottom: 12,
          gap: 0,
        },
        segment: {
          flex: 1,
          alignItems: 'center',
          paddingVertical: 10,
          borderBottomWidth: 2,
          borderBottomColor: 'transparent',
        },
        segmentActive: {
          borderBottomColor: colors.accent.gold,
        },
        segmentLabel: {
          fontWeight: '500',
        },
        segmentIcon: {
          width: 16,
          height: 16,
          marginRight: 6,
        },
        segmentInner: {
          flexDirection: 'row',
          alignItems: 'center',
        },

        // ── Sort & Filter bar ──
        controlBar: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          marginBottom: 12,
          gap: spacing.sm,
        },
        sortBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 6,
          paddingHorizontal: spacing.sm + 2,
          borderRadius: radius.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.elevated,
          gap: 6,
        },
        sortBtnLabel: {
          fontWeight: '500',
        },
        filterRow: {
          flex: 1,
          flexDirection: 'row',
          gap: spacing.xs,
        },
        filterChip: {
          paddingVertical: 6,
          paddingHorizontal: spacing.sm + 2,
          borderRadius: radius.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
        },
        filterChipActive: {
          backgroundColor: colors.accent.goldDim,
          borderColor: colors.accent.gold,
        },
        filterChipLabel: {
          fontWeight: '500',
        },

        // ── Sort Picker Modal ──
        sortPickerScrim: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        sortPickerPanel: {
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: 34,
        },
        sortPickerHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
        },
        sortPickerOption: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        sortPickerDivider: {
          height: StyleSheet.hairlineWidth,
          marginHorizontal: spacing.lg,
        },
        sortRadio: {
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sortRadioInner: {
          width: 10,
          height: 10,
          borderRadius: 5,
        },

        // ── View Toggle ──
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },

        // ── Content ──
        scroll: {
          flex: 1,
        },
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: bottomChromeInset,
        },

        // ── Grid content wrapper ──
        gridRow: {
          flexDirection: 'row',
          gap: GRID_GAP,
        },
        gridCol: {
          flex: 1,
        },

        // ── FAB ──
        fabOverlay: {
          position: 'absolute',
          bottom: bottomChromeInset,
          right: 20,
          zIndex: 10,
        },
        fab: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.accent.gold,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 8,
          shadowColor: colors.accent.gold,
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.35,
          shadowRadius: 8,
        },
        fabText: {
          fontSize: 28,
          lineHeight: 30,
          color: colors.text.inverse,
          fontWeight: '400',
        },
      }),
    [bottomChromeInset, colors, isDark],
  );

  // ── Handlers ──

  const navigateToSettings = useCallback(() => {
    (navigation as any).navigate('Settings');
  }, [navigation]);

  const navigateToLinkedFolders = useCallback(
    (type: 'video' | 'audio') => {
      (navigation as any).navigate('Settings', {
        screen: 'LinkedFolders',
        params: {type},
      });
    },
    [navigation],
  );

  const navigateToFolderBrowser = useCallback(
    (folderPath: string) => {
      (navigation as any).navigate('FolderBrowser', {initialPath: folderPath});
    },
    [navigation],
  );

  const handleArtistPress = useCallback(
    (artistName: string) => {
      navigation.navigate('ArtistDetail', {artistName});
    },
    [navigation],
  );

  const handleAlbumPress = useCallback(
    (albumTitle: string, artistName: string) => {
      navigation.navigate('AlbumDetail', {albumTitle, artistName});
    },
    [navigation],
  );

  const handleScanAudioFolders = useCallback(() => {
    dispatch(setScanning(true));
    scanAudioFolders(audioFolders)
      .then(tracks => dispatch(setTracks(tracks)))
      .catch(() => {})
      .finally(() => dispatch(setScanning(false)));
  }, [audioFolders, dispatch]);

  // ── Playlist handlers ──

  const handleCreatePlaylist = useCallback(
    (name: string, kind: PlaylistKind) => {
      dispatch({type: 'playlists/createPlaylist', payload: {name, kind}});
      setCreateModalVisible(false);
    },
    [dispatch],
  );

  const handlePlayAllPlaylist = useCallback(
    (playlistId: string) => {
      const pl = allPlaylists.find(p => p.id === playlistId);
      if (pl && pl.items.length > 0) {
        const entries = playlistItemsToEntries(pl.items);
        dispatch(loadPlaylistToPlayer(entries));
        (navigation as any).navigate('Player');
      }
    },
    [allPlaylists, dispatch, navigation],
  );

  const handleShufflePlaylist = useCallback(
    (playlistId: string) => {
      const pl = allPlaylists.find(p => p.id === playlistId);
      if (pl && pl.items.length > 0) {
        const entries = playlistItemsToEntries(pl.items);
        // Fisher-Yates shuffle in place
        for (let i = entries.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [entries[i], entries[j]] = [entries[j], entries[i]];
        }
        dispatch(loadPlaylistToPlayer(entries));
        (navigation as any).navigate('Player');
      }
    },
    [allPlaylists, dispatch, navigation],
  );

  const handlePlaylistCardPress = useCallback(
    (playlistId: string) => {
      const pl = allPlaylists.find(p => p.id === playlistId);
      if (pl) {
        navigation.navigate('PlaylistDetail', {
          playlistId,
          playlistName: pl.name,
        });
      }
    },
    [allPlaylists, navigation],
  );

  // ── Sort picker ──

  const selectedSortLabel = SORT_OPTIONS.find(o => o.key === sortBy)?.label ?? 'Name';

  const showSortControls = SORT_SEGMENTS.includes(activeSegment);
  const showFilterChips = FILTER_SEGMENTS.includes(activeSegment);
  const showViewToggle = VIEW_TOGGLE_SEGMENTS.includes(activeSegment);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />

      {/* ══ BACKGROUND ══ */}
      <LinearGradient
        colors={
          isDark
            ? [colors.background.primary, colors.background.elevated]
            : [colors.background.primary, colors.background.elevated]
        }
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.glowWarm,
          {
            backgroundColor: colors.accent.gold,
            opacity: isDark ? 0.22 : 0.12,
          },
        ]}
        pointerEvents="none"
      />

      {/* ══ HEADER ══ */}
      <View style={styles.header}>
        <AppText variant="h1" color="primary">
          Library
        </AppText>
        <View style={styles.headerRight}>
          {showViewToggle && (
            <ViewToggle value={viewMode} onChange={setViewMode} />
          )}
        </View>
      </View>

      {/* ══ SEGMENTED CONTROL ══ */}
      <View style={styles.segmentedControl}>
        {SEGMENTS.map(seg => {
          const isActive = activeSegment === seg.key;
          return (
            <TouchableOpacity
              key={seg.key}
              style={[styles.segment, isActive && styles.segmentActive]}
              onPress={() => setActiveSegment(seg.key)}
              activeOpacity={0.7}>
              <View style={styles.segmentInner}>
                <SvgIcon
                  name={seg.icon}
                  size={16}
                  color={isActive ? colors.accent.gold : colors.text.secondary}
                  style={styles.segmentIcon}
                />
                <AppText
                  variant="body2"
                  color={isActive ? 'accent' : 'secondary'}
                  style={styles.segmentLabel}>
                  {seg.label}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══ SORT & FILTER BAR (videos / audio segments only) ══ */}
      {(showSortControls || showFilterChips) && (
        <View style={styles.controlBar}>
          {/* Sort button */}
          {showSortControls && (
            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() => setSortPickerVisible(true)}
              activeOpacity={0.7}>
              <SvgIcon name="sliders" size={14} color={colors.text.secondary} />
              <AppText
                variant="caption"
                color="secondary"
                style={styles.sortBtnLabel}>
                {selectedSortLabel}
              </AppText>
            </TouchableOpacity>
          )}

          {/* Filter chips */}
          {showFilterChips && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}>
              {FILTER_CHIPS.map(chip => {
                const isActive = filterType === chip.key;
                return (
                  <TouchableOpacity
                    key={chip.key}
                    style={[
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterType(chip.key)}
                    activeOpacity={0.7}>
                    <AppText
                      variant="caption"
                      color={isActive ? 'accent' : 'secondary'}
                      style={styles.filterChipLabel}>
                      {chip.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* ══ SCROLLABLE CONTENT ══ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Scan Status Banner */}
        <ScanProgressBanner
          isScanning={isSettingsScanning}
          lastScanTimestamp={lastScanTimestamp}
        />

        {!isSettingsScanning && (
          <>
            {activeSegment === 'videos' && (
              <LibraryVideosSegment
                videoFolders={videoFolders}
                colors={colors}
                isDark={isDark}
                viewMode={viewMode}
                onNavigateToSettings={navigateToSettings}
                onNavigateToFolderBrowser={navigateToFolderBrowser}
                onNavigateToLinkedFolders={navigateToLinkedFolders}
              />
            )}
            {activeSegment === 'audio' && (
              <LibraryAudioSegment
                audioFolders={audioFolders}
                colors={colors}
                isDark={isDark}
                viewMode={viewMode}
                onNavigateToSettings={navigateToSettings}
                onNavigateToFolderBrowser={navigateToFolderBrowser}
                onNavigateToLinkedFolders={navigateToLinkedFolders}
              />
            )}
            {activeSegment === 'artists' && (
              <LibraryArtistsSegment
                audioFolders={audioFolders}
                isMediaScanning={isMediaScanning}
                scannedTrackCount={scannedTrackCount}
                colors={colors}
                onNavigateToSettings={navigateToSettings}
                onScanAudioFolders={handleScanAudioFolders}
                onArtistPress={handleArtistPress}
              />
            )}
            {activeSegment === 'albums' && (
              <LibraryAlbumsSegment
                audioFolders={audioFolders}
                isMediaScanning={isMediaScanning}
                scannedTrackCount={scannedTrackCount}
                colors={colors}
                onNavigateToSettings={navigateToSettings}
                onScanAudioFolders={handleScanAudioFolders}
                onAlbumPress={handleAlbumPress}
              />
            )}
            {activeSegment === 'folders' && (
              <LibraryFoldersSegment
                videoFolders={videoFolders}
                audioFolders={audioFolders}
                colors={colors}
                isDark={isDark}
                onNavigateToFolderBrowser={navigateToFolderBrowser}
              />
            )}
            {activeSegment === 'playlists' && (
              <LibraryPlaylistsSegment
                playlists={allPlaylists}
                colors={colors}
                onPlaylistCardPress={handlePlaylistCardPress}
                onPlayAllPlaylist={handlePlayAllPlaylist}
                onShufflePlaylist={handleShufflePlaylist}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* ══ SORT PICKER MODAL ══ */}
      <Modal
        transparent
        visible={sortPickerVisible}
        onRequestClose={() => setSortPickerVisible(false)}
        animationType="fade">
        <TouchableOpacity
          style={styles.sortPickerScrim}
          activeOpacity={1}
          onPress={() => setSortPickerVisible(false)}>
          <View
            style={[
              styles.sortPickerPanel,
              {
                backgroundColor: colors.background.elevated,
                borderColor: colors.border.subtle,
              },
            ]}>
            <View style={styles.sortPickerHeader}>
              <AppText variant="body2" color="primary">
                Sort by
              </AppText>
              <TouchableOpacity onPress={() => setSortPickerVisible(false)}>
                <SvgIcon name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.sortPickerDivider, {backgroundColor: colors.border.subtle}]} />
            <FlatList
              data={SORT_OPTIONS}
              keyExtractor={item => item.key}
              renderItem={({item}) => {
                const isSelected = sortBy === item.key;
                return (
                  <TouchableOpacity
                    style={[
                      styles.sortPickerOption,
                      {borderBottomColor: colors.border.subtle},
                    ]}
                    onPress={() => {
                      setSortBy(item.key);
                      setSortPickerVisible(false);
                    }}
                    activeOpacity={0.7}>
                    <AppText variant="body2" color={isSelected ? 'accent' : 'primary'}>
                      {item.label}
                    </AppText>
                    <View
                      style={[
                        styles.sortRadio,
                        {borderColor: isSelected ? colors.accent.gold : colors.border.subtle},
                      ]}>
                      {isSelected && (
                        <View
                          style={[
                            styles.sortRadioInner,
                            {backgroundColor: colors.accent.gold},
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══ LOADING OVERLAY ══ */}
      <LoadingOverlay
        visible={isSettingsScanning}
        message="Scanning linked folders..."
      />
      <LoadingOverlay
        visible={isMediaScanning && !isSettingsScanning}
        message="Scanning audio metadata..."
      />

      {/* ══ FAB (playlists tab only) ══ */}
      {activeSegment === 'playlists' && (
        <View style={styles.fabOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.85}
            onPress={() => setCreateModalVisible(true)}>
            <AppText style={styles.fabText}>+</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* ══ CREATE PLAYLIST MODAL ══ */}
      <PlaylistCreateModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreatePlaylist}
      />
    </SafeAreaView>
  );
};

/** Matches GRID_ITEM_GAP from MediaGridItem */
const GRID_GAP = 8;
