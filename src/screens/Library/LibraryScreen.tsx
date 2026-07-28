import React, {useState, useMemo, useCallback, useRef, useEffect} from 'react';
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
import {selectAllTracks} from '../../store/slices/mediaSlice';
import {selectAllPlaylists} from '../../store/slices/playlistSlice';
import {loadPlaylistToPlayer, playlistItemsToEntries} from '../../store/slices/playerSlice';
import {useMediaScanner} from '../../hooks/useMediaScanner';
import {useToast} from '../../components/feedback/Toast';
import {SimbaStatusBar} from '../../components/StatusBar';
import {AppText} from '../../components/core/AppText/AppText';
import {ScanProgressBanner} from '../../components/feedback/ScanProgressBanner/ScanProgressBanner';
import {SvgIcon, SvgIconName} from '../../components/utility/SvgIcon';
import {spacing, radius} from '../../theme/tokens';
import {LibraryScreenProps} from '../../navigation/types';
import {LibraryVideosSegment} from './components/LibraryVideosSegment';
import {LibraryAudioSegment} from './components/LibraryAudioSegment';
import {LibraryArtistsSegment} from './components/LibraryArtistsSegment';
import {LibraryAlbumsSegment} from './components/LibraryAlbumsSegment';
import {LibraryPlaylistsSegment} from './components/LibraryPlaylistsSegment';
import {ViewToggle, ViewMode} from './components/ViewToggle';
import {PlaylistCreateModal} from '../../components/playlist/PlaylistCreateModal';
import type {PlaylistKind} from '../../types/playlist';

type Props = LibraryScreenProps;
type Segment = 'videos' | 'audio' | 'artists' | 'albums';
type ContentMode = 'library' | 'playlists';
type FilterType = 'ALL' | 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'MIXED';

type SortOption = 'name' | 'dateAdded' | 'duration' | 'artist' | 'album';

const SEGMENTS: {key: Segment; label: string; icon: SvgIconName}[] = [
  {key: 'videos', label: 'Videos', icon: 'video'},
  {key: 'audio', label: 'Audio', icon: 'music'},
  {key: 'artists', label: 'Artists', icon: 'headphones'},
  {key: 'albums', label: 'Albums', icon: 'list'},
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

const CONTENT_MODE_OPTIONS: {key: ContentMode; label: string}[] = [
  {key: 'library', label: 'Library'},
  {key: 'playlists', label: 'Playlists'},
];

const PLAYLIST_FILTER_TYPES: {key: FilterType; label: string}[] = [
  {key: 'ALL', label: 'All'},
  {key: 'AUDIO_ONLY', label: 'Audio'},
  {key: 'VIDEO_ONLY', label: 'Video'},
  {key: 'MIXED', label: 'Mixed'},
];

// ── Dummy Data ──
const DUMMY_VIDEOS = [
  {path: '/storage/emulated/0/Movies/Interstellar_4K.mp4', name: 'Interstellar_4K.mp4'},
  {path: '/storage/emulated/0/Movies/Dark_Knight_Rises.mkv', name: 'Dark_Knight_Rises.mkv'},
  {path: '/storage/emulated/0/Movies/Inception_Trailer.mp4', name: 'Inception_Trailer.mp4'},
  {path: '/storage/emulated/0/Movies/Tenet_Final_Cut.mp4', name: 'Tenet_Final_Cut.mp4'},
];

const DUMMY_AUDIO = [
  {path: '/storage/emulated/0/Music/Hans_Zimmer_Cornfield_Chase.flac', name: 'Cornfield Chase.flac'},
  {path: '/storage/emulated/0/Music/Ludwig_Goransson_Meeting_Kitty.mp3', name: 'Meeting Kitty.mp3'},
  {path: '/storage/emulated/0/Music/Daft_Punk_Contact.wav', name: 'Contact.wav'},
  {path: '/storage/emulated/0/Music/Interstellar_Main_Theme.m4a', name: 'Interstellar Theme.m4a'},
];

const DUMMY_FOLDERS = [
  {path: '/storage/emulated/0/Movies', name: 'Movies', count: 12},
  {path: '/storage/emulated/0/Music', name: 'Music', count: 45},
  {path: '/storage/emulated/0/Download', name: 'Download', count: 8},
  {path: '/storage/emulated/0/DCIM/Camera', name: 'Camera', count: 24},
];

/** Segments that support grid/list view toggle */
const VIEW_TOGGLE_SEGMENTS: Segment[] = ['videos', 'audio'];

/** Segments that show sort controls */
const SORT_SEGMENTS: Segment[] = [];

/** Segments that show filter chips */
const FILTER_SEGMENTS: Segment[] = [];

export const LibraryScreen: React.FC<Props> = ({navigation}) => {
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const bottomChromeInset = insets.bottom + 104;
  const dispatch = useAppDispatch();

  const [activeSegment, setActiveSegment] = useState<Segment>('videos');

  // ── Content mode (Library vs Playlists) ──
  const [contentMode, setContentMode] = useState<ContentMode>('library');
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Phase 21: View mode, sort, filter ──
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio'>('all');
  const [sortPickerVisible, setSortPickerVisible] = useState(false);

  // ── Playlist state ──
  const [playlistFilterType, setPlaylistFilterType] = useState<FilterType>('ALL');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const videoFolders = useAppSelector(s => s.settings?.videoFolders ?? []);
  const audioFolders = useAppSelector(s => s.settings?.audioFolders ?? []);
  const lastScanTimestamp = useAppSelector(s => s.settings?.lastScanTimestamp ?? null);
  const scannedTracks = useAppSelector(selectAllTracks);
  const scannedTrackCount = scannedTracks.length;

  // ── Playlist data ──
  const allPlaylists = useAppSelector(selectAllPlaylists);

  const filteredPlaylists = useMemo(() => {
    if (playlistFilterType === 'ALL') return allPlaylists;
    return allPlaylists.filter(p => p.kind === playlistFilterType);
  }, [allPlaylists, playlistFilterType]);

  // ── Phase 25: Media Scanner hook ──
  const {
    startScan,
    cancelScan,
    isScanning,
    scanProgress,
    scanHistory,
  } = useMediaScanner();
  const toast = useToast();
  const prevScanErrorsRef = useRef(0);

  // Show toast for scan errors
  useEffect(() => {
    if (scanHistory && scanHistory.errorsCount > prevScanErrorsRef.current) {
      const newErrors = scanHistory.errorsCount - prevScanErrorsRef.current;
      toast.show(`${newErrors} file(s) could not be scanned`, 'error', 3000);
      prevScanErrorsRef.current = scanHistory.errorsCount;
    }
  }, [scanHistory, toast]);

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
        titleWrapper: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        titleChevron: {
          marginTop: 6,
        },

        // ── Segmented Control ──
        segmentedControl: {
          marginBottom: 12,
        },
        segment: {
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderBottomWidth: 2,
          borderBottomColor: 'transparent',
        },
        segmentActive: {
          borderBottomColor: colors.accent.gold,
        },
        segmentLabel: {
          fontWeight: '500',
          fontSize: 13,
        },
        segmentIcon: {
          width: 14,
          height: 14,
          marginRight: 8,
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

        // ── Content Mode Dropdown ──
        dropdownScrim: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        dropdownPanel: {
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: 34,
        },
        dropdownHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
        },
        dropdownDivider: {
          height: StyleSheet.hairlineWidth,
          marginHorizontal: spacing.lg,
        },
        dropdownOption: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: StyleSheet.hairlineWidth,
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

        // ── Playlist filter row ──
        playlistFilterRow: {
          flexDirection: 'row',
          paddingHorizontal: 20,
          marginBottom: 16,
          gap: spacing.sm,
        },
        playlistFilterChip: {
          paddingVertical: 6,
          paddingHorizontal: 16,
          borderRadius: radius.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.elevated,
        },
        playlistFilterChipActive: {
          backgroundColor: colors.accent.goldDim,
          borderColor: colors.accent.gold,
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

  // ── Library Handlers ──

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
    startScan();
  }, [startScan]);

  // ── Playlist Handlers ──

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
        (navigation as any).navigate('VideoPlayer');
      }
    },
    [allPlaylists, dispatch, navigation],
  );

  const handleShufflePlaylist = useCallback(
    (playlistId: string) => {
      const pl = allPlaylists.find(p => p.id === playlistId);
      if (pl && pl.items.length > 0) {
        const entries = playlistItemsToEntries(pl.items);
        for (let i = entries.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [entries[i], entries[j]] = [entries[j], entries[i]];
        }
        dispatch(loadPlaylistToPlayer(entries));
        (navigation as any).navigate('VideoPlayer');
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
  const currentTitle = CONTENT_MODE_OPTIONS.find(o => o.key === contentMode)?.label ?? 'Library';

  const showSortControls = SORT_SEGMENTS.includes(activeSegment);
  const showFilterChips = FILTER_SEGMENTS.includes(activeSegment);
  const showViewToggle = VIEW_TOGGLE_SEGMENTS.includes(activeSegment);

  const renderLibraryContent = () => (
    <>
      {/* ══ SEGMENTED CONTROL ══ */}
      <View style={styles.segmentedControl}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: 'row',
            paddingHorizontal: 20,
          }}>
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
        </ScrollView>
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

      {/* ══ CONTENT ══ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Scan Status Banner */}
        <ScanProgressBanner
          isScanning={isScanning}
          lastScanTimestamp={lastScanTimestamp}
          scanProgress={scanProgress}
          scanHistory={scanHistory}
          onCancel={cancelScan}
          trackCount={scannedTrackCount}
        />

        {activeSegment === 'videos' && (
          <LibraryVideosSegment
            videoFolders={videoFolders.length > 0 ? videoFolders : DUMMY_VIDEOS.map(v => v.path)}
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
            audioFolders={audioFolders.length > 0 ? audioFolders : DUMMY_AUDIO.map(a => a.path)}
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
            audioFolders={audioFolders.length > 0 ? audioFolders : DUMMY_FOLDERS.filter(f => f.name === 'Music').map(f => f.path)}
            isMediaScanning={isScanning}
            scannedTrackCount={scannedTrackCount || 45}
            colors={colors}
            onNavigateToSettings={navigateToSettings}
            onScanAudioFolders={handleScanAudioFolders}
            onArtistPress={handleArtistPress}
          />
        )}
        {activeSegment === 'albums' && (
          <LibraryAlbumsSegment
            audioFolders={audioFolders.length > 0 ? audioFolders : DUMMY_FOLDERS.filter(f => f.name === 'Music').map(f => f.path)}
            isMediaScanning={isScanning}
            scannedTrackCount={scannedTrackCount || 45}
            colors={colors}
            onNavigateToSettings={navigateToSettings}
            onScanAudioFolders={handleScanAudioFolders}
            onAlbumPress={handleAlbumPress}
          />
        )}
      </ScrollView>
    </>
  );

  const renderPlaylistContent = () => (
    <>
      {/* ══ PLAYLIST FILTER ROW ══ */}
      <View style={styles.playlistFilterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{flexDirection: 'row', gap: spacing.sm}}>
          {PLAYLIST_FILTER_TYPES.map(item => {
            const isActive = playlistFilterType === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.playlistFilterChip,
                  isActive && styles.playlistFilterChipActive,
                ]}
                onPress={() => setPlaylistFilterType(item.key)}
                activeOpacity={0.7}>
                <AppText
                  variant="caption"
                  color={isActive ? 'accent' : 'secondary'}
                  style={{fontWeight: '600'}}>
                  {item.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ══ PLAYLIST CONTENT ══ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <LibraryPlaylistsSegment
          playlists={filteredPlaylists}
          colors={colors}
          onPlaylistCardPress={handlePlaylistCardPress}
          onPlayAllPlaylist={handlePlayAllPlaylist}
          onShufflePlaylist={handleShufflePlaylist}
        />
      </ScrollView>

      {/* ══ FAB ══ */}
      <View style={styles.fabOverlay} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => setCreateModalVisible(true)}>
          <AppText style={styles.fabText}>+</AppText>
        </TouchableOpacity>
      </View>
    </>
  );

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
        <TouchableOpacity
          style={styles.titleWrapper}
          activeOpacity={0.7}
          onPress={() => setShowDropdown(true)}>
          <AppText variant="h1" color="primary">
            {currentTitle}
          </AppText>
          <SvgIcon
            name="chevronDown"
            size={20}
            color={colors.text.primary}
            style={styles.titleChevron}
          />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {contentMode === 'library' && showViewToggle && (
            <ViewToggle value={viewMode} onChange={setViewMode} />
          )}
        </View>
      </View>

      {/* ══ CONTENT (Library or Playlists) ══ */}
      {contentMode === 'library' ? renderLibraryContent() : renderPlaylistContent()}

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

      {/* ══ CONTENT MODE DROPDOWN MODAL ══ */}
      <Modal
        transparent
        visible={showDropdown}
        onRequestClose={() => setShowDropdown(false)}
        animationType="fade">
        <TouchableOpacity
          style={styles.dropdownScrim}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}>
          <View
            style={[
              styles.dropdownPanel,
              {
                backgroundColor: colors.background.elevated,
                borderColor: colors.border.subtle,
              },
            ]}>
            <View style={styles.dropdownHeader}>
              <AppText variant="body2" color="secondary">
                Select View
              </AppText>
              <TouchableOpacity onPress={() => setShowDropdown(false)}>
                <SvgIcon name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.dropdownDivider, {backgroundColor: colors.border.subtle}]} />
            {CONTENT_MODE_OPTIONS.map(option => {
              const isSelected = contentMode === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.dropdownOption,
                    {borderBottomColor: colors.border.subtle},
                  ]}
                  onPress={() => {
                    setContentMode(option.key);
                    setShowDropdown(false);
                  }}
                  activeOpacity={0.7}>
                  <AppText variant="body2" color={isSelected ? 'accent' : 'primary'}>
                    {option.label}
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
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══ PLAYLIST CREATE MODAL ══ */}
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
