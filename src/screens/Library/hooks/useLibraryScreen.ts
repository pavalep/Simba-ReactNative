import {useState, useMemo, useCallback, useRef, useEffect} from 'react';
import {useTheme} from '../../../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppSelector, useAppDispatch} from '../../../store';
import {selectAllTracks} from '../../../store/slices/mediaSlice';
import {selectAllPlaylists} from '../../../store/slices/playlistSlice';
import {loadPlaylistToPlayer, playlistItemsToEntries} from '../../../store/slices/playerSlice';
import {useMediaScanner} from '../../../hooks/useMediaScanner';
import {useToast} from '../../../components/feedback/Toast';
import {ViewMode} from '../components/ViewToggle';
import type {PlaylistKind} from '../../../types/playlist';
import type {SvgIconName} from '../../../components/utility/SvgIcon';
import type {LibraryScreenProps} from '../../../navigation/types';

// ── Types ──

export type Segment = 'videos' | 'audio' | 'artists' | 'albums';
export type ContentMode = 'library' | 'playlists';
export type FilterType = 'ALL' | 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'MIXED';
export type SortOption = 'name' | 'dateAdded' | 'duration' | 'artist' | 'album';

// ── Constants ──

export const SEGMENTS: {key: Segment; label: string; icon: SvgIconName}[] = [
  {key: 'videos', label: 'Videos', icon: 'video'},
  {key: 'audio', label: 'Audio', icon: 'music'},
  {key: 'artists', label: 'Artists', icon: 'headphones'},
  {key: 'albums', label: 'Albums', icon: 'list'},
];

export const FILTER_CHIPS: {key: 'all' | 'video' | 'audio'; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'video', label: 'Video'},
  {key: 'audio', label: 'Audio'},
];

export const SORT_OPTIONS: {key: SortOption; label: string}[] = [
  {key: 'name', label: 'Name'},
  {key: 'dateAdded', label: 'Date Added'},
  {key: 'duration', label: 'Duration'},
  {key: 'artist', label: 'Artist'},
  {key: 'album', label: 'Album'},
];

export const CONTENT_MODE_OPTIONS: {key: ContentMode; label: string}[] = [
  {key: 'library', label: 'Library'},
  {key: 'playlists', label: 'Playlists'},
];

export const PLAYLIST_FILTER_TYPES: {key: FilterType; label: string}[] = [
  {key: 'ALL', label: 'All'},
  {key: 'AUDIO_ONLY', label: 'Audio'},
  {key: 'VIDEO_ONLY', label: 'Video'},
  {key: 'MIXED', label: 'Mixed'},
];

/** Segments that support grid/list view toggle */
const VIEW_TOGGLE_SEGMENTS: Segment[] = ['videos', 'audio'];

/** Segments that show sort controls */
const SORT_SEGMENTS: Segment[] = [];

/** Segments that show filter chips */
const FILTER_SEGMENTS: Segment[] = [];

export const GRID_GAP = 8;

// ── Hook ──

export function useLibraryScreen(navigation: LibraryScreenProps['navigation']) {
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const bottomChromeInset = insets.bottom + 104;
  const dispatch = useAppDispatch();

  // ── Library State ──
  const [activeSegment, setActiveSegment] = useState<Segment>('videos');
  const [contentMode, setContentMode] = useState<ContentMode>('library');
  const [showDropdown, setShowDropdown] = useState(false);

  // ── View / Sort / Filter ──
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio'>('all');
  const [sortPickerVisible, setSortPickerVisible] = useState(false);

  // ── Playlist State ──
  const [playlistFilterType, setPlaylistFilterType] = useState<FilterType>('ALL');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // ── Redux Selectors ──
  const videoFolders = useAppSelector(s => s.settings?.videoFolders ?? []);
  const audioFolders = useAppSelector(s => s.settings?.audioFolders ?? []);
  const lastScanTimestamp = useAppSelector(s => s.settings?.lastScanTimestamp ?? null);
  const scannedTracks = useAppSelector(selectAllTracks);
  const scannedTrackCount = scannedTracks.length;
  const allPlaylists = useAppSelector(selectAllPlaylists);

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
  const currentTitle = CONTENT_MODE_OPTIONS.find(o => o.key === contentMode)?.label ?? 'Library';
  const showSortControls = SORT_SEGMENTS.includes(activeSegment);
  const showFilterChips = FILTER_SEGMENTS.includes(activeSegment);
  const showViewToggle = VIEW_TOGGLE_SEGMENTS.includes(activeSegment);

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
    scannedTrackCount,
    allPlaylists, filteredPlaylists,
    selectedSortLabel, currentTitle,
    showSortControls, showFilterChips, showViewToggle,
    isScanning, scanProgress, scanHistory,
    cancelScan,
    navigateToSettings, navigateToLinkedFolders, navigateToFolderBrowser,
    handleArtistPress, handleAlbumPress, handleScanAudioFolders,
    handleCreatePlaylist, handlePlayAllPlaylist, handleShufflePlaylist,
    handlePlaylistCardPress,
  };
}
