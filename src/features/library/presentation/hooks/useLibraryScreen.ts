import {useState, useMemo, useCallback, useRef, useEffect} from 'react';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSettingsStore} from '../../../../state';

import {usePlaylists} from '../../../../features/playlists';

import {useMediaScanner} from '../../../../hooks/useMediaScanner';
import {isVideoFile} from '../../../../utils/timeAgo';
import {useToast} from '../../../../components/feedback/Toast';
import {ViewMode} from '../components/ViewToggle';
import type {PlaylistKind} from '../../../../types/playlist';
import type {LibraryScreenProps} from '../../../../navigation/types';
import {normalizeMediaClassification} from '../../../../types/media';
import { resolveStreamType, useOpenPlaylist, usePlayer, useResumeAwareLaunch } from '../../../../infrastructure/player';
import {useMediaStore, usePlayerStore, playlistItemsToEntries, type ScannedTrack} from '../../../../state';
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

/**
 * The Library FAB's edge length (dp).
 *
 * It is exported because TWO files need it and they must not disagree:
 * this hook computes the scroll padding that clears the FAB, and
 * `LibraryScreenContent.tsx` draws the FAB.
 */
export const LIBRARY_FAB_SIZE = 56;

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
  /**
   * The Library FAB's own bottom offset.
   *
   * A FAB floats: one spacing step above the safe area, overlapping
   * whatever is under it. This used to be `insets.bottom + 104` — the
   * clearance for the mini player (56) plus the floating bottom tab
   * bar (48) the app used to have. The tab bar was deleted in v11
   * Wave 1 and the number was never revised, so the button hung 104 dp
   * above the bottom edge. The Movies, Music, Podcasts, Radio and Live
   * TV FABs have always used `insets.bottom + spacing.lg`.
   */
  const fabBottomInset = insets.bottom + spacing.lg;
  /**
   * The scroll padding that lets the last row clear the FAB.
   *
   * It has to reach the FAB's TOP edge, or the last row stops under
   * the button instead of above it.
   */
  const contentBottomInset =
    insets.bottom + spacing.lg + LIBRARY_FAB_SIZE + spacing.md;
  const {openPlayer} = useResumeAwareLaunch();
  // V15 Phase 64: `useOpenPlaylist` absorbs the "play all" two-step
  // pattern (entries extraction + start-track dispatch + openPlayer).
  const {openPlaylist} = useOpenPlaylist();

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
  // V20.10: the local `isRefreshing` state was redundant — the
  // media-scan store's `isScanning` (already destructured below
  // as `isScanning` from `useMediaScanner()`) is the single source
  // of truth. The screen's `<RefreshControl refreshing={isRefreshing}>`
  // now reads `isScanning` directly.
  const [hasAnimated, setHasAnimated] = useState(false);

  // ── Redux Selectors ──
  const videoFolders = useSettingsStore(s => s.videoFolders ?? []);
  const audioFolders = useSettingsStore(s => s.audioFolders ?? []);
  const lastScanTimestamp = useSettingsStore(s => s.lastScanTimestamp ?? null);
  const scannedTracks = useMediaStore(s => s.tracks);
  const scannedTrackCount = scannedTracks.length;
  const {list: allPlaylists, createPlaylist} = usePlaylists();

  // ── Player Selectors (for AudioWaveform) ──
  const currentFile = usePlayerStore(s => s.currentFile);
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
  // V20.10: no async wrapper / no spinner state / no try-catch.
  // The store's `isScanning` is the single source of truth for
  // the `<RefreshControl refreshing={...}>` boolean, and the
  // scan-error toast (in the `useEffect` above) is fired by
  // `scanHistory.errorsCount` change — not by an exception path.
  const handleRefresh = useCallback(() => {
    startScan();
  }, [startScan]);

  // ── Navigation Handlers ──
  // V16 Phase 73: removed 6 `(navigation as any).navigate(...)` casts.
  // The `as any` was hiding 3 real type issues:
  //   1. `navigate('Settings')` needs the object form (no params)
  //      for the discriminated union to resolve.
  //   2. `navigate('FolderLinkingWizard')` had no string-form
  //      overload available in this composite.
  //   3. `navigate('AlbumScreen', {artistName, albumTitle})` had
  //      the wrong param key: the route's typed param is
  //      `albumName`, not `albumTitle`. The previous code was
  //      silently dropping the album name on navigation, leaving
  //      the AlbumScreen to render with `albumName === ''`.
  // Each call uses the typed `{name, params?}` object form.
  const navigateToSettings = useCallback(() => {
    // Settings is a nested-stack route on the root stack; the
    // typed `navigate` requires the inner screen shape.
    navigation.navigate({name: 'Settings', params: {screen: 'Settings', params: undefined}});
  }, [navigation]);

  const navigateToLinkedFolders = useCallback(
    (type: 'video' | 'audio') => {
      navigation.navigate({
        name: 'Settings',
        params: {screen: 'LinkedFolders', params: {type}},
      });
    },
    [navigation],
  );

  const navigateToFolderBrowser = useCallback(
    (folderPath: string) => {
      navigation.navigate({name: 'FolderBrowser', params: {initialPath: folderPath}});
    },
    [navigation],
  );

  const handleLinkFolder = useCallback(() => {
    // FolderLinkingWizard is inside the Settings nested stack;
    // its typed `params` object is required even though its
    // inner `type` is optional.
    navigation.navigate({name: 'Settings', params: {screen: 'FolderLinkingWizard', params: {}}});
  }, [navigation]);

  const handleArtistPress = useCallback(
    (artistName: string) => {
      navigation.navigate({name: 'ArtistScreen', params: {artistName}});
    },
    [navigation],
  );

  const handleAlbumPress = useCallback(
    (albumTitle: string, artistName: string) => {
      // Real bug fix: the route's typed param is `albumName`, not
      // `albumTitle`. The previous `(navigation as any).navigate(...)`
      // was silently dropping the album name on navigation.
      navigation.navigate({
        name: 'AlbumScreen',
        params: {albumName: albumTitle, artistName},
      });
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
        usePlayerStore.getState().loadPlaylistToPlayer(entries);
        const first = entries[0];
        if (!first) return;
        // No `startPositionMs`. The seam resolves resume from bookmarks and
        // history for the track it actually starts, which is the only authority
        // that can be right once the caller is one screen among eight.
        // `first.resumePosition` was read here and is ALWAYS
        // undefined — `playlistItemsToEntries` never populates it. It
        // did nothing except read as if this launch resumed. The other six
        // `openPlaylist` call sites pass nothing; this one did not.
        openPlaylist(entries, {
          type: resolveStreamType(first.type),
        });
      }
    },
    [allPlaylists, openPlaylist],
  );

  const handleShufflePlaylist = useCallback(
    (playlistId: string) => {
      const pl = allPlaylists.find(p => p.id === playlistId);
      if (pl && pl.items.length > 0) {
        const entries = playlistItemsToEntries(pl.items);
        usePlayerStore.getState().loadPlaylistToPlayer(entries);
        const first = entries[0];
        if (!first) return;
        // No `startPositionMs` here either, and this is the site where it
        // could not be correct even if it were populated: the seam picks its
        // own start index when shuffling, so `entries[0]` is not the track
        // that plays. A position read off entry 0 would resume a different
        // file than the one audio comes from.
        openPlaylist(entries, {
          type: resolveStreamType(first.type),
          shuffle: true,
        });
      }
    },
    [allPlaylists, openPlaylist],
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
    theme, colors, isDark, insets, fabBottomInset, contentBottomInset,
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
    isRefreshing: isScanning, hasAnimated,
    isAudioPlaying, currentAudioUri,
    handleRefresh,
    navigateToSettings, navigateToLinkedFolders, navigateToFolderBrowser, handleLinkFolder,
    handleArtistPress, handleAlbumPress, handleScanAudioFolders, handleMediaPress,
    handleCreatePlaylist, handlePlayAllPlaylist, handleShufflePlaylist,
    handlePlaylistCardPress,
  };
}
