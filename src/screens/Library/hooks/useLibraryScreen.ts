import {useState, useMemo, useCallback, useRef, useEffect} from 'react';
import {useTheme} from '../../../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppSelector, useAppDispatch} from '../../../store';
import {selectAllTracks} from '../../../store/slices/mediaSlice';
import type {ScannedTrack} from '../../../store/slices/mediaSlice';
import {usePlaylists} from '../../../features/playlists';
import {loadPlaylistToPlayer, playlistItemsToEntries} from '../../../store/slices/playerSlice';
import {useMediaScanner} from '../../../hooks/useMediaScanner';
import {isVideoFile} from '../../../utils/timeAgo';
import {useToast} from '../../../components/feedback/Toast';
import {ViewMode} from '../components/ViewToggle';
import type {PlaylistKind} from '../../../types/playlist';
import type {LibraryScreenProps} from '../../../navigation/types';
import {normalizeMediaClassification} from '../../../types/media';
import { resolveStreamType, usePlayer, usePlayerActivity } from '@simba-dev/react-native-media-player';
import type {
  ContentMode,
  FilterType,
  LocalMediaFilter,
  Segment,
  SortOption,
} from '../types';
import {
  LOCAL_CONTENT_MODES,
  LOCAL_FILE_SEGMENTS,
  LOCAL_FILTER_SEGMENTS,
  LOCAL_GRID_GAP,
  LOCAL_MEDIA_FILTERS,
  LOCAL_PLAYLIST_FILTERS,
  LOCAL_SORT_OPTIONS,
  LOCAL_SORT_SEGMENTS,
  LOCAL_VIEW_TOGGLE_SEGMENTS,
} from '../related/localFilesConfig';

const SEGMENTS = LOCAL_FILE_SEGMENTS;
const FILTER_CHIPS = LOCAL_MEDIA_FILTERS;
const SORT_OPTIONS = LOCAL_SORT_OPTIONS;
const CONTENT_MODE_OPTIONS = LOCAL_CONTENT_MODES;
const PLAYLIST_FILTER_TYPES = LOCAL_PLAYLIST_FILTERS;
const GRID_GAP = LOCAL_GRID_GAP;
const VIEW_TOGGLE_SEGMENTS = LOCAL_VIEW_TOGGLE_SEGMENTS;
const SORT_SEGMENTS = LOCAL_SORT_SEGMENTS;
const FILTER_SEGMENTS = LOCAL_FILTER_SEGMENTS;

export {
  SEGMENTS,
  FILTER_CHIPS,
  SORT_OPTIONS,
  CONTENT_MODE_OPTIONS,
  PLAYLIST_FILTER_TYPES,
  GRID_GAP,
};

// ── Hook ──

export function useLibraryScreen(navigation: LibraryScreenProps['navigation']) {
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const bottomChromeInset = insets.bottom + 104;
  const dispatch = useAppDispatch();
  const {openPlayer} = usePlayerActivity();

  // ── Library State ──
  const [activeSegment, setActiveSegment] = useState<Segment>('folders');
  const [contentMode, setContentMode] = useState<ContentMode>('library');
  const [showDropdown, setShowDropdown] = useState(false);

  // ── View / Sort / Filter ──
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterType, setFilterType] = useState<LocalMediaFilter>('all');
  const [sortPickerVisible, setSortPickerVisible] = useState(false);

  // ── Playlist State ──
  const [playlistFilterType, setPlaylistFilterType] = useState<FilterType>('ALL');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // ── Pull-to-refresh ──
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // ── Redux Selectors ──
  const videoFolders = useAppSelector(s => s.settings?.videoFolders ?? []);
  const audioFolders = useAppSelector(s => s.settings?.audioFolders ?? []);
  const lastScanTimestamp = useAppSelector(s => s.settings?.lastScanTimestamp ?? null);
  const scannedTracks = useAppSelector(selectAllTracks);
  const scannedTrackCount = scannedTracks.length;
  const {list: allPlaylists, createPlaylist} = usePlaylists();

  // ── Player Selectors (for AudioWaveform) ──
  const currentFile = useAppSelector(s => s.player.currentFile);
  // V14 Phase 62: source of truth for isPlaying moves to the module.
  const {state: playerState} = usePlayer();
  const isAudioPlaying = playerState.isPlaying;
  const currentAudioUri = currentFile?.uri ?? null;

  // ── Media Scanner ──
  const {startScan, cancelScan, isScanning, scanProgress, scanHistory} = useMediaScanner();
  const toast = useToast();
  const prevScanErrorsRef = useRef(0);

  useEffect(() => {
    if (scanHistory && scanHistory.errorsCount > prevScanErrorsRef.current) {
      const newErrors = scanHistory.errorsCount - prevScanErrorsRef.current;
      toast.show(`${newErrors} file(s) could not be scanned`, 'error', 3000);
      prevScanErrorsRef.current = scanHistory.errorsCount;
    }
  }, [scanHistory, toast]);

  // ── Computed ──
  const filteredPlaylists = useMemo(() => {
    if (playlistFilterType === 'ALL') return allPlaylists;
    return allPlaylists.filter(p => p.kind === playlistFilterType);
  }, [allPlaylists, playlistFilterType]);

  const selectedSortLabel = SORT_OPTIONS.find(o => o.key === sortBy)?.label ?? 'Name';
  const currentTitle = useMemo(() => {
    if (contentMode === 'playlists') return 'Playlists';
    return 'Library';
  }, [contentMode]);
  const showSortControls = SORT_SEGMENTS.includes(activeSegment);
  const showFilterChips = FILTER_SEGMENTS.includes(activeSegment);
  const showViewToggle = VIEW_TOGGLE_SEGMENTS.includes(activeSegment);

  // ── Stagger animation ──
  useEffect(() => {
    if (!hasAnimated) {
      // Allow animation on next frame
      requestAnimationFrame(() => setHasAnimated(true));
    }
  }, [hasAnimated]);

  // ── Pull-to-refresh ──
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await startScan();
    } catch {
      // Scan errors handled by toast
    } finally {
      setIsRefreshing(false);
    }
  }, [startScan]);

  // ── Navigation Handlers ──
  const navigateToSettings = useCallback(() => {
    (navigation as any).navigate('Settings');
  }, [navigation]);

  const navigateToLinkedFolders = useCallback(
    (type: 'video' | 'audio') => {
      (navigation as any).navigate('Settings', {screen: 'LinkedFolders', params: {type}});
    },
    [navigation],
  );

  const navigateToFolderBrowser = useCallback(
    (folderPath: string) => {
      (navigation as any).navigate('FolderBrowser', {initialPath: folderPath});
    },
    [navigation],
  );

  const handleLinkFolder = useCallback(() => {
    (navigation as any).navigate('FolderLinkingWizard');
  }, [navigation]);

  const handleArtistPress = useCallback(
    (artistName: string) => {
      (navigation as any).navigate('ArtistScreen', {artistName});
    },
    [navigation],
  );

  const handleAlbumPress = useCallback(
    (albumTitle: string, artistName: string) => {
      (navigation as any).navigate('AlbumScreen', {artistName, albumTitle});
    },
    [navigation],
  );

  const handleScanAudioFolders = useCallback(() => {
    startScan();
  }, [startScan]);

  const handleMediaPress = useCallback(
    (track: ScannedTrack) => {
      openPlayer({
        uri: track.uri,
        title: track.title,
        type: resolveStreamType(track.mediaType),
      });
    },
    [openPlayer],
  );

  // ── Playlist Handlers ──
  const handleCreatePlaylist = useCallback(
    (name: string, kind: PlaylistKind) => {
      const result = createPlaylist({name, kind});
      if (result.status === 'created') {
        setCreateModalVisible(false);
      } else {
        toast.show('You can have up to 20 playlists', 'error');
      }
    },
    [createPlaylist, toast],
  );

  const handlePlayAllPlaylist = useCallback(
    (playlistId: string) => {
      const pl = allPlaylists.find(p => p.id === playlistId);
      if (pl && pl.items.length > 0) {
        const entries = playlistItemsToEntries(pl.items);
        dispatch(loadPlaylistToPlayer(entries));
        const first = entries[0];
        if (!first) return;
        openPlayer({
          uri: first.uri,
          title: first.title,
          startPositionMs: first.resumePosition,
          type: resolveStreamType(resolveStreamType(first.type)),
        });
      }
    },
    [allPlaylists, dispatch, openPlayer],
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
        const first = entries[0];
        if (!first) return;
        openPlayer({
          uri: first.uri,
          title: first.title,
          startPositionMs: first.resumePosition,
          type: resolveStreamType(resolveStreamType(first.type)),
        });
      }
    },
    [allPlaylists, dispatch, openPlayer],
  );

  const handlePlaylistCardPress = useCallback(
    (playlistId: string) => {
      const pl = allPlaylists.find(p => p.id === playlistId);
      if (pl) {
        navigation.navigate('PlaylistDetail', {playlistId, playlistName: pl.name});
      }
    },
    [allPlaylists, navigation],
  );

  return {
    theme, colors, isDark, insets, bottomChromeInset, dispatch,
    activeSegment, setActiveSegment,
    contentMode, setContentMode, showDropdown, setShowDropdown,
    viewMode, setViewMode,
    sortBy, setSortBy,
    filterType, setFilterType,
    sortPickerVisible, setSortPickerVisible,
    playlistFilterType, setPlaylistFilterType,
    createModalVisible, setCreateModalVisible,
    videoFolders, audioFolders, lastScanTimestamp,
    scannedTracks, scannedTrackCount,
    allPlaylists, filteredPlaylists,
    selectedSortLabel, currentTitle,
    showSortControls, showFilterChips, showViewToggle,
    isScanning, scanProgress, scanHistory,
    cancelScan,
    isRefreshing, hasAnimated,
    isAudioPlaying, currentAudioUri,
    handleRefresh,
    navigateToSettings, navigateToLinkedFolders, navigateToFolderBrowser, handleLinkFolder,
    handleArtistPress, handleAlbumPress, handleScanAudioFolders, handleMediaPress,
    handleCreatePlaylist, handlePlayAllPlaylist, handleShufflePlaylist,
    handlePlaylistCardPress,
  };
}
