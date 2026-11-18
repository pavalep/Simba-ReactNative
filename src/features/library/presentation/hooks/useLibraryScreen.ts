import {useState, useCallback, useRef, useEffect} from 'react';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FAB_SIZE} from '../../../../components/core/Fab/Fab';
import {useBottomChromeInset} from '../../../../infrastructure/player/miniPlayerChrome';
import {useSettingsStore} from '../../../../state';

import {useMediaScanner} from '../../../../hooks/useMediaScanner';
import {useToast} from '../../../../components/feedback/Toast';
import {ViewMode} from '../components/ViewToggle';
import type {LibraryScreenProps} from '../../../../navigation/types';
import { resolveStreamType, usePlayer, useResumeAwareLaunch } from '../../../../infrastructure/player';
import {useMediaStore, usePlayerStore, type ScannedTrack} from '../../../../state';
import type {
  LibraryMenuEntryKey,
  LocalMediaFilter,
  Segment,
  SortOption,
} from '../types';
import {
  LOCAL_FILE_SEGMENTS,
  LOCAL_FILTER_SEGMENTS,
  LOCAL_GRID_GAP,
  LOCAL_LIBRARY_MENU_ENTRIES,
  LOCAL_MEDIA_FILTERS,
  LOCAL_SORT_OPTIONS,
  LOCAL_SORT_SEGMENTS,
  LOCAL_VIEW_TOGGLE_SEGMENTS,
} from '../related/localFilesConfig';


const SEGMENTS = LOCAL_FILE_SEGMENTS;
const FILTER_CHIPS = LOCAL_MEDIA_FILTERS;
const SORT_OPTIONS = LOCAL_SORT_OPTIONS;
const LIBRARY_MENU_ENTRIES = LOCAL_LIBRARY_MENU_ENTRIES;
const GRID_GAP = LOCAL_GRID_GAP;
const VIEW_TOGGLE_SEGMENTS = LOCAL_VIEW_TOGGLE_SEGMENTS;
const SORT_SEGMENTS = LOCAL_SORT_SEGMENTS;
const FILTER_SEGMENTS = LOCAL_FILTER_SEGMENTS;

export {
  SEGMENTS,
  FILTER_CHIPS,
  SORT_OPTIONS,
  LIBRARY_MENU_ENTRIES,
  GRID_GAP,
};

// ── Hook ──

export function useLibraryScreen(navigation: LibraryScreenProps['navigation']) {
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  /**
   * The app's ONE bottom-chrome rule.
   *
   * A FAB floats: it overlaps whatever is under it, by design. But it
   * has to clear the bottom chrome — and the bottom chrome is either
   * the safe area or the mini-player dock, whichever is taller. This
   * used to be `insets.bottom + 104`, the clearance for the mini player
   * (56) plus the floating bottom tab bar (48) the app used to have.
   * The tab bar was deleted in v11 Wave 1 and the number was never
   * revised. See `infrastructure/player/miniPlayerChrome`.
   */
  const bottomChromeInset = useBottomChromeInset();
  /**
   * The scroll padding at the bottom of the Library's scroll view.
   *
   * It clears the bottom chrome (the safe area or the mini-player dock,
   * whichever is taller) and keeps the room a floating button used to
   * take: the Library has no floating button of its own any more — the
   * create-playlist FAB moved to All Playlists (spec §6.4) — and the
   * padding is left where the page has always ended it.
   */
  const contentBottomInset = bottomChromeInset + FAB_SIZE + spacing.md;
  const {openPlayer} = useResumeAwareLaunch();

  // ── Library State ──
  const [activeSegment, setActiveSegment] = useState<Segment>('folders');
  const [showDropdown, setShowDropdown] = useState(false);

  // ── View / Sort / Filter ──
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterType, setFilterType] = useState<LocalMediaFilter>('all');
  const [sortPickerVisible, setSortPickerVisible] = useState(false);

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
  const selectedSortLabel = SORT_OPTIONS.find(o => o.key === sortBy)?.label ?? 'Name';
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
  //   1. `navigate('Settings')` needed the object form (no params)
  //      for the discriminated union to resolve.
  //   2. `navigate('FolderLinkingWizard')` had no string-form
  //      overload available in this composite.
  //   3. `navigate('AlbumScreen', {artistName, albumTitle})` had
  //      the wrong param key: the route's typed param is
  //      `albumName`, not `albumTitle`. The previous code was
  //      silently dropping the album name on navigation, leaving
  //      the AlbumScreen to render with `albumName === ''`.
  // Each call uses the typed `{name, params?}` object form.
  //
  // The settings screens are ROOT routes now (they used to live in a
  // nested `SettingsStack`), so the nested `{screen: …}` form is gone:
  // `LinkedFolders` and `FolderLinkingWizard` are siblings of every
  // other route, reached with one plain `navigate` call.
  //
  // There is no `Settings` route any more: the preferences were merged
  // into the Profile on 2026-11-11 (`md/PROFILE_SETTINGS_MERGE.md`),
  // and the empty states that used to say "Go to Settings" now link the
  // folders directly — a page called Settings was never the right door
  // to a folder picker.

  // The `navigate(name, params)` form, not the object form.
//
// React Navigation 7 deprecated `navigate({name, params})` — it warns on
// every call ("Passing an object as the argument to 'navigate' is
// deprecated. Use 'navigate(name, params, options)' instead"), and the
// warning is in the user's console on every folder link. The typed
// overloads resolve the same way: the route name is a literal and the
// params are checked against the route's own param list.
const navigateToLinkedFolders = useCallback(
    (type: 'video' | 'audio') => {
      navigation.navigate('LinkedFolders', {type});
    },
    [navigation],
  );

  const navigateToFolderBrowser = useCallback(
    (folderPath: string) => {
      navigation.navigate('FolderBrowser', {initialPath: folderPath});
    },
    [navigation],
  );

  const handleLinkFolder = useCallback(() => {
    navigation.navigate('FolderLinkingWizard', {});
  }, [navigation]);

  const handleArtistPress = useCallback(
    (artistName: string) => {
      navigation.navigate('ArtistScreen', {artistName});
    },
    [navigation],
  );

  const handleAlbumPress = useCallback(
    (albumTitle: string, artistName: string) => {
      // Real bug fix: the route's typed param is `albumName`, not
      // `albumTitle`. The previous `(navigation as any).navigate(...)`
      // was silently dropping the album name on navigation.
      navigation.navigate('AlbumScreen', {albumName: albumTitle, artistName});
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

  /**
   * The title dropdown's two entries.
   *
   * The Library has ONE content mode: its own segments. "Playlists" is
   * a DESTINATION, not a mode — All Playlists owns the playlist list and
   * the kind chips (spec §6.4), so choosing it leaves the Library and
   * opens that page. "Library" is the page you are already on: it closes
   * the sheet and nothing else.
   */
  const handleLibraryMenuSelect = useCallback(
    (entry: LibraryMenuEntryKey) => {
      if (entry === 'playlists') {
        navigation.navigate('AllPlaylistsScreen');
      }
      setShowDropdown(false);
    },
    [navigation],
  );

  return {
    theme, colors, isDark, insets, contentBottomInset,
    activeSegment, setActiveSegment,
    showDropdown, setShowDropdown,
    viewMode, setViewMode,
    sortBy, setSortBy,
    filterType, setFilterType,
    sortPickerVisible, setSortPickerVisible,
    videoFolders, audioFolders, lastScanTimestamp,
    scannedTracks, scannedTrackCount,
    selectedSortLabel,
    showSortControls, showFilterChips, showViewToggle,
    isScanning, scanProgress, scanHistory,
    cancelScan,
    isRefreshing: isScanning, hasAnimated,
    isAudioPlaying, currentAudioUri,
    handleRefresh,
    navigateToLinkedFolders, navigateToFolderBrowser, handleLinkFolder,
    handleArtistPress, handleAlbumPress, handleScanAudioFolders, handleMediaPress,
    handleLibraryMenuSelect,
  };
}
