import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Alert,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {MpvPlayer, MpvChapter, MpvTrack, ScreenBrightness} from '../../native';
import {RootStackScreenProps} from '../../navigation/types';
import {useHaptics} from '../../hooks/useHaptics';
import {usePipLifecycle} from '../../hooks/usePipLifecycle';
import {usePipEntry} from '../../hooks/usePipEntry';
import {lockToPortrait, lockToLandscape} from '../../utils/orientation';
import {
  pickSubtitleFile,
  validateMediaFile,
  pickMediaFile,
  getFileName,
  getMediaType,
} from '../../services/fileService';
import {useAppDispatch, useAppSelector} from '../../store';
import {savePlaybackPosition} from '../../store/slices/sessionSlice';
import {
  addToPlaylist,
  removeFromPlaylist,
  playFromPlaylist,
  nextTrack,
  setLoopMode,
  toggleShuffle,
  clearPlaylist,
  clearPlayer,
  removeFromQueue,
  reorderQueue,
  prependToQueue,
  addToQueue,
  setQueueSelection,
  clearQueueSelection,
  removeSelectedFromQueue,
  moveSelectedToTop,
  clearAll,
  PlaylistEntry,
} from '../../store/slices/playerSlice';

// ── Extracted Components ──
import {VideoPlayerVideoSurface} from './components/VideoPlayerVideoSurface';
import {VideoPlayerTopBar} from './components/VideoPlayerTopBar';
import {PrimaryControls} from './components/PrimaryControls';
import {SecondaryToolbar} from './components/SecondaryToolbar';
import {VideoPlayerSubtitlePanel} from './components/VideoPlayerSubtitlePanel';
import {VideoPlayerAudioPanel} from './components/VideoPlayerAudioPanel';
import {VideoPlayerEqualizerPanel, EQ_BANDS, EQ_PRESETS} from './components/VideoPlayerEqualizerPanel';
import {VideoPlayerPlaylistPanel} from './components/VideoPlayerPlaylistPanel';
import {SimbaStatusBar} from '../../components/StatusBar';
import {VideoPlayerLoadingOverlay} from './components/VideoPlayerLoadingOverlay';
import VideoPlayerGestureLayer from './components/VideoPlayerGestureLayer';
import {SeekFeedbackOverlay} from './components/SeekFeedbackOverlay';
import {VolumeBrightnessOverlay} from './components/VolumeBrightnessOverlay';
import {BottomSheet} from '../../components/sheets/BottomSheet/BottomSheet';
import {ChapterList} from '../../components/player/NowPlayingInfo/ChapterList';
import {InfoSheet} from '../../components/player/NowPlayingInfo/InfoSheet';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet';
import {QueueSheet} from '../../components/sheets/QueueSheet/QueueSheet';
import {readTrackMetadata} from '../../services/metadataService';
import {selectAllTracks} from '../../store/slices/mediaSlice';
import type {ScannedTrack} from '../../store/slices/mediaSlice';

// ── Types ──
type Props = RootStackScreenProps<'VideoPlayer'>;

const FLAT = EQ_PRESETS['Flat'];

/** Build mpv audio filter string from 10 gain values */
function buildEqFilter(gains: number[]): string {
  return gains
    .map((gain, i) => `equalizer=f=${EQ_BANDS[i].freq}:t=h:w=1.0:g=${gain}`)
    .join(',');
}

// ── Screen ──
export const VideoPlayerScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  // ── Route params ──
  const title = route.params?.fileTitle ?? 'Untitled';
  const fileUri = route.params?.fileUri;

  // ── Core playback state ──
  const [secondaryVisible, setSecondaryVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [volume, setVolume] = useState(65);
  const [nativePtr, setNativePtr] = useState(0);
  const [showVideoSurface, setShowVideoSurface] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<{
    title: string;
    message: string;
    detail?: string;
  } | null>(null);
  const [chapters, setChapters] = useState<MpvChapter[]>([]);

  // ── Subtitle state ──
  const [subtitleTracks, setSubtitleTracks] = useState<MpvTrack[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<number | null>(null);
  const [subtitleVisible, setSubtitleVisible] = useState(true);
  const [subtitlePanelOpen, setSubtitlePanelOpen] = useState(false);
  const [subtitleFontSize, setSubtitleFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [subtitleOpacity, setSubtitleOpacity] = useState(1);

  // ── Audio track state ──
  const [audioTracks, setAudioTracks] = useState<MpvTrack[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<number | null>(null);
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);

  // ── Equalizer state ──
  const [eqGains, setEqGains] = useState<number[]>([...FLAT]);
  const [eqEnabled, setEqEnabled] = useState(false);
  const [eqPanelOpen, setEqPanelOpen] = useState(false);

  // ── Playlist state ──
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false);

  // ── Chapters panel state ──
  const [chaptersPanelOpen, setChaptersPanelOpen] = useState(false);

  // ── Info Sheet state (Phase 8) ──
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);

  // ── Playlist Sheet state (Phase 9) ──
  const [playlistSheetVisible, setPlaylistSheetVisible] = useState(false);
  const [currentTrackMetadata, setCurrentTrackMetadata] = useState<{
    title: string;
    artist: string;
    album: string;
    year: number;
    genre: string;
    trackNumber: number;
    albumArtUri: string;
    language: string;
    raw: Record<string, string>;
  } | null>(null);

  // ── Queue Sheet state (Phase 23) ──
  const [queueSheetVisible, setQueueSheetVisible] = useState(false);
  const [queueMultiSelect, setQueueMultiSelect] = useState(false);

  // ── PiP UI visibility (hides all overlays before PiP entry) ──
  const [pipUiVisible, setPipUiVisible] = useState(true);

  // ── Gesture overlay state (3.5 double-tap seek feedback + 3.6 volume/brightness) ──
  const [seekSide, setSeekSide] = useState<'left' | 'right'>('left');
  const [seekFeedbackVisible, setSeekFeedbackVisible] = useState(false);
  const [volumeOverlayValue, setVolumeOverlayValue] = useState(volume);
  const [volumeOverlayVisible, setVolumeOverlayVisible] = useState(false);
  const [brightnessOverlayValue, setBrightnessOverlayValue] = useState(100);
  const [brightnessOverlayVisible, setBrightnessOverlayVisible] = useState(false);

  // ── Refs ──
  const isSeeking = useRef(false);
  const dispatch = useAppDispatch();
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const fileUriRef = useRef<string | undefined>(fileUri);
  const titleRef = useRef(title);
  const resumeSeekDone = useRef(false);
  const overlayHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Redux ──
  const rememberPosition = useAppSelector(
    state => state.settings.rememberPlaybackPosition,
  );
  const sessionRecent = useAppSelector(state => state.session.recentFiles);
  const playlist = useAppSelector(state => state.player.playlist);
  const queue = useAppSelector(state => state.player.queue);
  const currentIndex = useAppSelector(state => state.player.currentIndex);
  const loopMode = useAppSelector(state => state.player.loopMode);
  const shuffle = useAppSelector(state => state.player.shuffle);
  const playbackHistory = useAppSelector(state => state.player.playbackHistory);
  const selectedQueueIndices = useAppSelector(state => state.player.selectedQueueIndices);
  const allTracks = useAppSelector(selectAllTracks);

  // ── Derive related tracks for InfoSheet (Phase 8) ──
  const relatedTracks = useMemo(() => {
    if (!currentTrackMetadata || allTracks.length === 0) {
      return [];
    }
    const {artist, album} = currentTrackMetadata;
    if (!artist && !album) {
      return [];
    }
    return allTracks.filter(
      t =>
        (artist && t.artist === artist) ||
        (album && t.album === album),
    );
  }, [currentTrackMetadata, allTracks]);

  // ── Error screen styles (theme-aware) ──
  const errorStyles = useMemo(() => ({
    container: {
      flex: 1 as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 32,
      backgroundColor: colors.background.primary,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.semantic.error + '26', // 15% opacity hex
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: 20,
    },
    icon: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.semantic.error,
    },
    title: {
      marginBottom: 8,
      textAlign: 'center' as const,
    },
    message: {
      marginBottom: 4,
      textAlign: 'center' as const,
      lineHeight: 20,
    },
    detail: {
      textAlign: 'center' as const,
      marginBottom: 28,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'column' as const,
      gap: 10,
      width: '100%' as const,
      maxWidth: 240,
    },
    btn: {
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    btnPrimary: {
      backgroundColor: colors.accent.gold,
    },
    btnPrimaryLabel: {
      color: colors.text.primary,
      fontSize: 15,
      fontWeight: '600' as const,
    },
    btnSecondary: {
      backgroundColor: colors.background.elevated,
      borderWidth: 0.5,
      borderColor: colors.border.subtle,
    },
  }), [colors]);

  // ── Sync refs ──
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { fileUriRef.current = fileUri; }, [fileUri]);
  useEffect(() => { titleRef.current = title; }, [title]);

  // ── Orientation: default portrait, toggle to landscape ──
  useEffect(() => {
    lockToPortrait();
  }, []);

  // ── Back / Cleanup ──
  const handleGoBack = useCallback(() => {
    const curUri = fileUriRef.current;
    const curPos = positionRef.current;
    const curDur = durationRef.current;
    let thumbPath = '';
    try {
      if (curUri) {
        thumbPath = MpvPlayer.captureThumbnail(curUri);
      }
    } catch {}

    try { MpvPlayer.stop(); } catch {}
    setShowVideoSurface(false);

    requestAnimationFrame(() => {
      if (curUri) {
        dispatch(
          savePlaybackPosition({
            fileUri: curUri,
            title: titleRef.current,
            position: curPos,
            duration: curDur,
            thumbnailPath: thumbPath,
            mediaType: getMediaType(curUri),
          }),
        );
      }
      (navigation.navigate as unknown as (name: string) => void)('MainTabs');
      lockToPortrait();
    });
  }, [dispatch, navigation]);

  // ── PiP lifecycle — enter→pause, exit→resume, close→destroy, expand→restore ──
  const {isInPipMode, prepareAndEnterPip} = usePipLifecycle({
    fileUri,
    fileTitle: title,
    chapters,
    position,
    duration,
    onHideUi: useCallback(() => setPipUiVisible(false), []),
    onShowUi: useCallback(() => setPipUiVisible(true), []),
    onNavigateBack: useCallback(() => {
      // Navigate back to main tabs on PiP close
      handleGoBack();
    }, [handleGoBack]),
  });

  // ── PiP swipe-down shrink animation ──
  const {
    pipScale,
    pipTranslateX,
    pipTranslateY,
    triggerShrinkAndEnterPip,
  } = usePipEntry({
    onEnterPip: prepareAndEnterPip,
    isInPipMode,
  });

  // ── Derived ──
  const savedEntry = fileUri && rememberPosition
    ? sessionRecent.find(f => f.fileUri === fileUri)
    : undefined;

  // ── Expanded mode (manual toggle, no auto-rotate) ──
  const [isLandscape, setIsLandscape] = useState(false);
  const handleToggleRotate = useCallback(() => {
    setIsLandscape(p => {
      const next = !p;
      if (next) {
        lockToLandscape();
        StatusBar.setHidden(true, 'fade');
      } else {
        lockToPortrait();
        StatusBar.setHidden(false, 'fade');
      }
      return next;
    });
  }, []);

  // ── Transport ──
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      MpvPlayer.pause();
    } else {
      MpvPlayer.resume();
    }
    haptics.medium();
  }, [isPlaying, haptics]);

  const handlePrev = useCallback(() => {
    MpvPlayer.seekTo(0);
  }, []);

  const handleNext = useCallback(() => {
    // If in playlist, go to next track
    if (playlist.length > 0 && currentIndex < playlist.length - 1) {
      const nextIdx = currentIndex + 1;
      dispatch(nextTrack());
      const entry = playlist[nextIdx];
      if (entry) MpvPlayer.loadFile(entry.uri);
    } else {
      MpvPlayer.seekTo(duration);
    }
  }, [playlist, currentIndex, duration, dispatch]);

  const handleSeek = useCallback((pct: number) => {
    isSeeking.current = true;
    const target = pct * durationRef.current;
    MpvPlayer.seekTo(target);
    setPosition(target);
    setTimeout(() => { isSeeking.current = false; }, 200);
  }, []);

  const handleChapterSeek = useCallback((time: number) => {
    isSeeking.current = true;
    MpvPlayer.seekTo(time);
    setPosition(time);
    setTimeout(() => { isSeeking.current = false; }, 200);
  }, []);

  const handleVolumeChange = useCallback(() => {
    MpvPlayer.toggleMute?.();
  }, []);

  // ── Gesture handlers ──
  const handleDoubleTapLeft = useCallback(() => {
    const target = Math.max(0, positionRef.current - 10);
    MpvPlayer.seekTo(target);
    setPosition(target);
    // Show seek feedback overlay
    setSeekSide('left');
    setSeekFeedbackVisible(true);
    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
    overlayHideTimer.current = setTimeout(() => setSeekFeedbackVisible(false), 1000);
  }, []);

  const handleDoubleTapRight = useCallback(() => {
    const target = Math.min(durationRef.current, positionRef.current + 10);
    MpvPlayer.seekTo(target);
    setPosition(target);
    // Show seek feedback overlay
    setSeekSide('right');
    setSeekFeedbackVisible(true);
    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
    overlayHideTimer.current = setTimeout(() => setSeekFeedbackVisible(false), 1000);
  }, []);

  // ── Swipe-up gesture: open InfoSheet ──
  const handleSwipeUp = useCallback(() => {
    setInfoSheetVisible(true);
  }, []);

  const handleSwipeDown = useCallback(() => {
    // On Android, swipe-down gesture enters PiP mode with shrink animation
    if (Platform.OS === 'android') {
      triggerShrinkAndEnterPip();
      return;
    }
    MpvPlayer.toggleMute?.();
  }, [triggerShrinkAndEnterPip]);

  const handleScreenshot = useCallback(() => {
    try {
      MpvPlayer.captureThumbnail(fileUriRef.current ?? '');
    } catch {}
  }, []);

  // ── InfoSheet callbacks (Phase 8) ──
  const handleInfo = useCallback(() => {
    setInfoSheetVisible(true);
  }, []);

  const handleInfoAddToPlaylist = useCallback(() => {
    setInfoSheetVisible(false);
    // Small delay to let InfoSheet close before PlaylistSheet opens
    setTimeout(() => setPlaylistSheetVisible(true), 350);
  }, []);

  const handleMorePress = useCallback(() => {
    setPlaylistSheetVisible(true);
  }, []);

  const handlePlayRelatedTrack = useCallback(
    (track: ScannedTrack) => {
      setInfoSheetVisible(false);
      MpvPlayer.loadFile(track.uri);
      setChapters([]);
      setIsPlaying(true);
    },
    [],
  );

  // ── Volume/Brightness gesture callbacks (3.6) ──
  const handleVolumeSwipe = useCallback((delta: number) => {
    setVolume(prev => {
      const newVol = Math.max(0, Math.min(100, prev + delta));
      MpvPlayer.setVolume(newVol);
      setVolumeOverlayValue(newVol);
      return newVol;
    });
    setVolumeOverlayVisible(true);
    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
    overlayHideTimer.current = setTimeout(() => setVolumeOverlayVisible(false), 1500);
  }, []);

  const handleBrightnessSwipe = useCallback((delta: number) => {
    setBrightnessOverlayValue(prev => {
      const newVal = Math.max(0, Math.min(100, prev + delta));
      ScreenBrightness.setBrightness(newVal / 100);
      return newVal;
    });
    setBrightnessOverlayVisible(true);
    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
    overlayHideTimer.current = setTimeout(() => setBrightnessOverlayVisible(false), 1500);
  }, []);

  const handleVolumeGestureEnd = useCallback(() => {
    // Auto-hide timer already set in handleVolumeSwipe
  }, []);

  const handleBrightnessGestureEnd = useCallback(() => {
    // Auto-hide timer already set in handleBrightnessSwipe
  }, []);

  // ── Shuffle / Loop ──
  const handleToggleShuffle = useCallback(() => {
    dispatch(toggleShuffle());
    haptics.medium();
  }, [dispatch, haptics]);

  const handleToggleLoop = useCallback(() => {
    const next = loopMode === 'none' ? 'file' : loopMode === 'file' ? 'playlist' : 'none';
    dispatch(setLoopMode(next));
    haptics.medium();
  }, [loopMode, dispatch, haptics]);

  // ── Subtitle ──
  const handleSelectSubtitle = useCallback((trackId: number | null) => {
    setActiveSubtitle(trackId);
    if (trackId === null) {
      MpvPlayer.setTrack('sub', 'no');
    } else {
      MpvPlayer.setTrack('sub', trackId);
    }
  }, []);

  const handleToggleSubtitleVisibility = useCallback(() => {
    setSubtitleVisible(p => !p);
    MpvPlayer.setProperty('sub-visibility', subtitleVisible ? 'no' : 'yes');
  }, [subtitleVisible]);

  const handleLoadExternalSubtitle = useCallback(async () => {
    try {
      const file = await pickSubtitleFile();
      if (!file) return;
      MpvPlayer.loadExternalSubtitle(file.uri);
      setSubtitlePanelOpen(false);
    } catch {}
  }, []);

  const handleFontSizeChange = useCallback((size: 'small' | 'medium' | 'large') => {
    setSubtitleFontSize(size);
  }, []);

  const handleOpacityChange = useCallback((opacity: number) => {
    setSubtitleOpacity(opacity);
  }, []);

  // ── Audio track ──
  const handleSelectAudioTrack = useCallback((trackId: number | null) => {
    setActiveAudioTrack(trackId);
    if (trackId === null) {
      MpvPlayer.setTrack('audio', 'no');
    } else {
      MpvPlayer.setTrack('audio', trackId);
    }
  }, []);

  // ── Equalizer ──
  const handleBandChange = useCallback((index: number, value: number) => {
    setEqGains(prev => {
      const next = [...prev];
      next[index] = value;
      if (eqEnabled) {
        MpvPlayer.setProperty('af', buildEqFilter(next));
      }
      return next;
    });
  }, [eqEnabled]);

  const handleApplyPreset = useCallback((name: string) => {
    const preset = EQ_PRESETS[name];
    if (!preset) return;
    setEqGains([...preset]);
    if (eqEnabled) {
      MpvPlayer.setProperty('af', buildEqFilter(preset));
    }
  }, [eqEnabled]);

  const handleResetEq = useCallback(() => {
    setEqGains([...FLAT]);
    MpvPlayer.setProperty('af', buildEqFilter(FLAT));
    setEqEnabled(false);
  }, []);

  const handleToggleEq = useCallback(() => {
    setEqEnabled(p => {
      const next = !p;
      MpvPlayer.setProperty('af', next ? buildEqFilter(eqGains) : '');
      return next;
    });
  }, [eqGains]);

  // ── Playlist ──
  const handleAddToPlaylist = useCallback(async () => {
    try {
      const file = await pickMediaFile();
      if (!file) return;
      const entry: PlaylistEntry = {
        uri: file.uri,
        title: file.title || getFileName(file.uri),
        duration: 0,
      };
      dispatch(addToPlaylist(entry));
      if (playlist.length === 0) {
        MpvPlayer.loadFile(entry.uri);
      }
    } catch {
      // eslint-disable-next-line no-alert
      Alert.alert('Error', 'Failed to add file to playlist.');
    }
  }, [dispatch, playlist.length]);

  const handleRemoveFromPlaylist = useCallback((index: number) => {
    dispatch(removeFromPlaylist(index));
  }, [dispatch]);

  const handlePlayFromPlaylist = useCallback((index: number) => {
    const entry = playlist[index];
    if (!entry) return;
    dispatch(playFromPlaylist(index));
    MpvPlayer.loadFile(entry.uri);
    setPlaylistPanelOpen(false);
  }, [dispatch, playlist]);

  const handleClearPlaylist = useCallback(() => {
    dispatch(clearPlaylist());
  }, [dispatch]);

  // ── Queue management (Phase 23) ──

  const handleQueueMoveItem = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= queue.length) return;
    dispatch(reorderQueue({fromIndex, toIndex}));
  }, [dispatch, queue.length]);

  const handleQueueRemoveItem = useCallback((index: number) => {
    dispatch(removeFromQueue(index));
  }, [dispatch]);

  // Play a queue item: find its playlist entry and switch playback
  const handleQueueSelectItem = useCallback((fileUri: string) => {
    const playlistIdx = playlist.findIndex(e => e.uri === fileUri);
    if (playlistIdx >= 0 && playlistIdx !== currentIndex) {
      const entry = playlist[playlistIdx];
      if (entry) {
        dispatch(playFromPlaylist(playlistIdx));
        MpvPlayer.loadFile(entry.uri);
      }
    }
    setQueueSheetVisible(false);
  }, [dispatch, playlist, currentIndex]);

  // Queue item tap: find by index and play
  const handleSelectQueueItem = useCallback((idx: number) => {
    const item = queue[idx];
    if (!item) return;
    handleQueueSelectItem(item.uri);
  }, [queue, handleQueueSelectItem]);

  // History item tap: play it
  const handleSelectHistoryItem = useCallback((idx: number) => {
    const item = playbackHistory[idx];
    if (!item) return;
    handleQueueSelectItem(item.uri);
  }, [playbackHistory, handleQueueSelectItem]);

  // "Play Next" from history: prepend to queue
  const handlePlayNext = useCallback((entry: PlaylistEntry) => {
    dispatch(prependToQueue(entry));
  }, [dispatch]);

  // "Add to Queue" from history: append to queue
  const handleAddToQueue = useCallback((entry: PlaylistEntry) => {
    dispatch(addToQueue(entry));
  }, [dispatch]);

  // ── Queue multi-select ──
  const handleEnterMultiSelect = useCallback(() => {
    setQueueMultiSelect(true);
  }, []);

  const handleExitMultiSelect = useCallback(() => {
    setQueueMultiSelect(false);
    dispatch(clearQueueSelection());
  }, [dispatch]);

  const handleToggleSelection = useCallback((index: number) => {
    const current = selectedQueueIndices;
    const isSelected = current.includes(index);
    if (isSelected) {
      dispatch(setQueueSelection(current.filter(i => i !== index)));
    } else {
      dispatch(setQueueSelection([...current, index]));
    }
  }, [dispatch, selectedQueueIndices]);

  const handleRemoveSelected = useCallback(() => {
    dispatch(removeSelectedFromQueue());
  }, [dispatch]);

  const handleMoveSelectedToTop = useCallback(() => {
    dispatch(moveSelectedToTop());
  }, [dispatch]);

  const handleClearAll = useCallback(() => {
    dispatch(clearAll());
  }, [dispatch]);

  // ── Error retry ──
  const handleRetry = useCallback(() => {
    setError(null);
    setIsReady(false);
    // Re-init will be triggered by a brief state toggle
    setNativePtr(0);
    setTimeout(() => {
      const ok = MpvPlayer.initPlayer();
      if (ok) {
        const ptr = MpvPlayer.getNativePtr();
        setNativePtr(ptr);
        setIsReady(true);
      } else {
        setError({
          title: 'Retry Failed',
          message: 'The player could not be re-initialized.',
        });
      }
    }, 500);
  }, []);

  // ══════════════════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════════════════

  // ── Init player on mount ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const playableUri = fileUri;

      if (playableUri) {
        const validation = await validateMediaFile(playableUri);
        if (cancelled) return;
        if (!validation.valid) {
          setError({
            title: validation.title,
            message: validation.message,
            detail: validation.detail,
          });
          return;
        }
      }

      const ok = MpvPlayer.initPlayer();
      if (!ok) {
        setError({
          title: 'Player Initialization Failed',
          message:
            'The native player engine could not be initialized. This may indicate a device compatibility issue.',
        });
        return;
      }

      const ptr = MpvPlayer.getNativePtr();
      setNativePtr(ptr);
      setIsReady(true);

      const sub = MpvPlayer.onSurfaceAttached(() => {
        if (playableUri) {
          MpvPlayer.loadFile(playableUri);
        }
        sub?.remove();
      });
    })();

    return () => {
      cancelled = true;
      try {
        const curUri = fileUriRef.current;
        const curPos = positionRef.current;
        const curDur = durationRef.current;
        if (curUri && rememberPosition && curPos > 0) {
          dispatch(
            savePlaybackPosition({
              fileUri: curUri,
              title: titleRef.current,
              position: curPos,
              duration: curDur,
              mediaType: getMediaType(curUri),
            }),
          );
        }
        try { MpvPlayer.stop(); } catch {}
        MpvPlayer.destroy();
        dispatch(clearPlayer());
      } catch {}
    };
  }, [dispatch, fileUri, rememberPosition]);

  // ── Periodic position save ──
  useEffect(() => {
    if (!isPlaying || !fileUri || !rememberPosition) return;

    const interval = setInterval(() => {
      const curPos = positionRef.current;
      if (curPos > 0) {
        dispatch(
          savePlaybackPosition({
            fileUri,
            title: titleRef.current,
            position: curPos,
            duration: durationRef.current,
            mediaType: getMediaType(fileUri ?? ''),
          }),
        );
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isPlaying, fileUri, rememberPosition, dispatch]);

  // ── Android back button ──
  useEffect(() => {
    const onBackPress = () => {
      handleGoBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [handleGoBack]);

  // ── Mpv event subscriptions ──
  useEffect(() => {
    if (!isReady) return;

    const unsubPos = MpvPlayer.on('onPositionChanged', ({position: pos}) => {
      if (!isSeeking.current) {
        setPosition(pos);
      }
    });

    const unsubState = MpvPlayer.on(
      'onPlaybackStateChanged',
      ({state}: {state: string}) => {
        setIsPlaying(state === 'playing');
      },
    );

    const unsubVol = MpvPlayer.on('onVolumeChanged', ({volume: vol}) => {
      setVolume(vol);
    });

    const unsubFile = MpvPlayer.on('onFileLoaded', () => {
      const dur = MpvPlayer.getDuration();
      setDuration(dur);
      setPosition(0);
      resumeSeekDone.current = false;

      dispatch(
        savePlaybackPosition({
          fileUri: fileUriRef.current ?? '',
          title: titleRef.current,
          position: 0,
          duration: dur,
          mediaType: getMediaType(fileUriRef.current ?? ''),
        }),
      );

      if (savedEntry && savedEntry.position > 0) {
        setTimeout(() => {
          MpvPlayer.seekTo(savedEntry.position);
          resumeSeekDone.current = true;
        }, 300);
      }

      try {
        setChapters(Array.from(MpvPlayer.getChapters() ?? []));
        const tracks: MpvTrack[] = MpvPlayer.getTracks();
        setSubtitleTracks(tracks.filter(t => t.type === 'sub'));
        setAudioTracks(tracks.filter(t => t.type === 'audio'));
        const audio = tracks.filter(t => t.type === 'audio');
        const activeAudio = audio.find(t => t.selected) || audio[0] || null;
        setActiveAudioTrack(activeAudio ? activeAudio.id : null);
      } catch {}

      // ── Load metadata for InfoSheet ──
      const currentUri = fileUriRef.current;
      if (currentUri) {
        readTrackMetadata(currentUri)
          .then(meta => {
            if (meta) {
              setCurrentTrackMetadata(meta);
            }
          })
          .catch(() => {
            // Non-critical — InfoSheet will show a fallback
          });
      }
    });

    const unsubEnd = MpvPlayer.on('onEndReached', () => {
      setIsPlaying(false);
    });

    const unsubError = MpvPlayer.on('onError', ({message: errMsg}) => {
      setError({
        title: 'Playback Error',
        message: errMsg || 'An unknown error occurred during playback.',
      });
    });

    const unsubTracks = MpvPlayer.on('onTracksChanged', () => {
      try {
        const tracks: MpvTrack[] = MpvPlayer.getTracks();
        setSubtitleTracks(tracks.filter(t => t.type === 'sub'));
        setAudioTracks(tracks.filter(t => t.type === 'audio'));
      } catch {}
    });

    // Poll position while playing (for smooth seek bar updates)
    const poll = setInterval(() => {
      if (!isSeeking.current) {
        try {
          const pos = MpvPlayer.getPosition();
          if (pos >= 0) setPosition(pos);
        } catch {}
      }
    }, 250);

    return () => {
      unsubPos();
      unsubState();
      unsubVol();
      unsubFile();
      unsubEnd();
      unsubError();
      unsubTracks();
      clearInterval(poll);
    };
  }, [isReady, savedEntry, dispatch]);

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  // ── Error full-screen overlay ──
  if (error) {
    return (
      <View style={[styles.root, errorStyles.container]}>
        <View style={errorStyles.iconCircle}>
          <AppText style={errorStyles.icon}>!</AppText>
        </View>
        <AppText
          variant="h2"
          color="primary"
          style={errorStyles.title}>
          {error.title}
        </AppText>
        <AppText
          variant="body2"
          color="secondary"
          style={errorStyles.message}>
          {error.message}
        </AppText>
        {error.detail && (
          <AppText
            variant="caption"
            color="tertiary"
            style={errorStyles.detail}>
            {error.detail}
          </AppText>
        )}
        <View style={errorStyles.actions}>
          <TouchableOpacity
            style={[errorStyles.btn, errorStyles.btnPrimary]}
            onPress={handleRetry}
            activeOpacity={0.8}>
            <AppText style={errorStyles.btnPrimaryLabel}>Retry</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[errorStyles.btn, errorStyles.btnSecondary]}
            onPress={handleGoBack}
            activeOpacity={0.8}>
            <AppText variant="body2" color="primary">
              Choose Different File
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main player layout ──
  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary}]}>
      <SimbaStatusBar variant="player" />

      {/* ── Video Surface (with PiP shrink animation) ── */}
      <VideoPlayerGestureLayer
        onSingleTap={() => setSecondaryVisible(p => !p)}
        onDoubleTapLeft={handleDoubleTapLeft}
        onDoubleTapRight={handleDoubleTapRight}
        onSwipeUp={handleSwipeUp}
        onSwipeDown={handleSwipeDown}
        onVolumeChange={handleVolumeSwipe}
        onBrightnessChange={handleBrightnessSwipe}
        onVolumeGestureEnd={handleVolumeGestureEnd}
        onBrightnessGestureEnd={handleBrightnessGestureEnd}>
        <Animated.View
          pointerEvents="box-none"
          style={[
            {
              transform: [
                {scale: pipScale},
                {translateX: pipTranslateX},
                {translateY: pipTranslateY},
              ],
            },
          ]}>
          <VideoPlayerVideoSurface
            nativePtr={nativePtr}
            showVideoSurface={showVideoSurface}
            isPlaying={isPlaying}
            controlsVisible={secondaryVisible}
          />
        </Animated.View>
      </VideoPlayerGestureLayer>

      {/* ── Top Bar (hidden during PiP) ── */}
      {showVideoSurface && pipUiVisible && (
        <VideoPlayerTopBar
          title={title}
          onGoBack={handleGoBack}
          topInset={insets.top}
          isLandscape={isLandscape}
          onToggleRotate={handleToggleRotate}
          onMorePress={handleMorePress}
        />
      )}

      {/* ── Primary Controls — Always Visible outside PiP (seek bar + transport) ── */}
      {showVideoSurface && pipUiVisible && (
        <PrimaryControls
          position={position}
          duration={duration}
          isPlaying={isPlaying}
          chapters={chapters}
          onPlayPause={handlePlayPause}
          onPrev={handlePrev}
          onNext={handleNext}
          onSeek={handleSeek}
          bottomInset={insets.bottom}
        />
      )}

      {/* ── Secondary Toolbar — Collapsible (hidden during PiP) ── */}
      {showVideoSurface && pipUiVisible && (
        <SecondaryToolbar
          visible={secondaryVisible}
          enabled={true}
          eqEnabled={eqEnabled}
          shuffleActive={shuffle}
          loopMode={loopMode}
          playlistLength={playlist.length}
          activeSubtitle={activeSubtitle}
          activeAudioTrack={activeAudioTrack}
          onToggleChapters={() => {
            setChaptersPanelOpen(p => !p);
            setAudioPanelOpen(false);
            setSubtitlePanelOpen(false);
            setEqPanelOpen(false);
            setPlaylistPanelOpen(false);
          }}
          onToggleAudio={() => {
            setAudioPanelOpen(p => !p);
            setChaptersPanelOpen(false);
            setSubtitlePanelOpen(false);
            setEqPanelOpen(false);
            setPlaylistPanelOpen(false);
          }}
          onToggleSubtitles={() => {
            setSubtitlePanelOpen(p => !p);
            setChaptersPanelOpen(false);
            setAudioPanelOpen(false);
            setEqPanelOpen(false);
            setPlaylistPanelOpen(false);
          }}
          onToggleEq={() => {
            setEqPanelOpen(p => !p);
            setChaptersPanelOpen(false);
            setAudioPanelOpen(false);
            setSubtitlePanelOpen(false);
            setPlaylistPanelOpen(false);
          }}
          onTogglePlaylist={() => {
            setPlaylistPanelOpen(p => !p);
            setChaptersPanelOpen(false);
            setAudioPanelOpen(false);
            setSubtitlePanelOpen(false);
            setEqPanelOpen(false);
          }}
          onInfo={handleInfo}
          onToggleShuffle={handleToggleShuffle}
          onToggleLoop={handleToggleLoop}
          onVolume={handleVolumeChange}
          onScreenshot={handleScreenshot}
          onToggleQueue={() => setQueueSheetVisible(true)}
          onAutoHide={() => setSecondaryVisible(false)}
          bottomInset={insets.bottom}
        />
      )}

      {/* ── BottomSheet Panels ── */}
      <BottomSheet
        title="Chapters"
        visible={chaptersPanelOpen}
        onClose={() => setChaptersPanelOpen(false)}>
        <ChapterList
          chapters={chapters.map(ch => ({
            title: ch.title,
            startTime: ch.startTime as number,
            endTime: ch.endTime as number,
          }))}
          currentTime={position}
          onSeek={handleChapterSeek}
        />
      </BottomSheet>

      <BottomSheet
        title="Audio Tracks"
        visible={audioPanelOpen}
        onClose={() => setAudioPanelOpen(false)}>
        <VideoPlayerAudioPanel
          audioTracks={audioTracks}
          activeAudioTrack={activeAudioTrack}
          onSelectTrack={handleSelectAudioTrack}
        />
      </BottomSheet>

      <BottomSheet
        title="Subtitles"
        visible={subtitlePanelOpen}
        onClose={() => setSubtitlePanelOpen(false)}>
        <VideoPlayerSubtitlePanel
          subtitleTracks={subtitleTracks}
          activeSubtitle={activeSubtitle}
          subtitleVisible={subtitleVisible}
          onSelectTrack={handleSelectSubtitle}
          onToggleVisibility={handleToggleSubtitleVisibility}
          onLoadExternal={handleLoadExternalSubtitle}
          subtitleFontSize={subtitleFontSize}
          onFontSizeChange={handleFontSizeChange}
          subtitleOpacity={subtitleOpacity}
          onOpacityChange={handleOpacityChange}
        />
      </BottomSheet>

      <BottomSheet
        title="Equalizer"
        visible={eqPanelOpen}
        onClose={() => setEqPanelOpen(false)}>
        <VideoPlayerEqualizerPanel
          eqGains={eqGains}
          eqEnabled={eqEnabled}
          onBandChange={handleBandChange}
          onToggle={handleToggleEq}
          onApplyPreset={handleApplyPreset}
          onReset={handleResetEq}
        />
      </BottomSheet>

      <BottomSheet
        title="Playlist"
        visible={playlistPanelOpen}
        onClose={() => setPlaylistPanelOpen(false)}>
        <VideoPlayerPlaylistPanel
          playlist={playlist.map(e => ({
            fileUri: e.uri,
            title: e.title,
            duration: e.duration,
          }))}
          currentIndex={currentIndex}
          onPlayFromPlaylist={handlePlayFromPlaylist}
          onRemoveFromPlaylist={handleRemoveFromPlaylist}
          onClearPlaylist={handleClearPlaylist}
          onAddToPlaylist={handleAddToPlaylist}
        />
      </BottomSheet>

      {/* ── Info Sheet (Phase 8) ── */}
      <InfoSheet
        visible={infoSheetVisible}
        onClose={() => setInfoSheetVisible(false)}
        metadata={currentTrackMetadata || {
          title,
          artist: '',
          album: '',
          year: 0,
          genre: '',
          trackNumber: 0,
          albumArtUri: '',
          language: '',
          raw: {},
        }}
        chapters={chapters.map(ch => ({
          title: ch.title,
          startTime: ch.startTime as number,
          endTime: ch.endTime as number,
        }))}
        currentTime={position}
        onSeek={handleChapterSeek}
        relatedTracks={relatedTracks}
        onAddToPlaylist={handleInfoAddToPlaylist}
        onPlayRelatedTrack={handlePlayRelatedTrack}
      />

      {/* ── Seek feedback overlay (3.5) ── */}
      {pipUiVisible && (
        <SeekFeedbackOverlay
          side={seekSide}
          visible={seekFeedbackVisible}
        />
      )}

      {/* ── Playlist Sheet (Phase 9) ── */}
      <PlaylistSheet
        visible={playlistSheetVisible}
        onClose={() => setPlaylistSheetVisible(false)}
        currentItem={{
          fileUri: fileUri || '',
          title,
          duration,
          artist: currentTrackMetadata?.artist,
          album: currentTrackMetadata?.album,
        }}
      />

      {/* ── Queue Sheet (Phase 23) ── */}
      <QueueSheet
        visible={queueSheetVisible}
        onClose={() => { setQueueSheetVisible(false); setQueueMultiSelect(false); dispatch(clearQueueSelection()); }}
        currentTrack={{uri: fileUri || '', title, duration}}
        queue={queue}
        playbackHistory={playbackHistory}
        selectedQueueIndices={selectedQueueIndices}
        mode={queueMultiSelect ? 'multiSelect' : 'view'}
        onSelectQueueItem={handleSelectQueueItem}
        onSelectHistoryItem={handleSelectHistoryItem}
        onMoveUp={(idx) => handleQueueMoveItem(idx, 'up')}
        onMoveDown={(idx) => handleQueueMoveItem(idx, 'down')}
        onRemoveItem={handleQueueRemoveItem}
        onEnterMultiSelect={handleEnterMultiSelect}
        onExitMultiSelect={handleExitMultiSelect}
        onToggleSelection={handleToggleSelection}
        onRemoveSelected={handleRemoveSelected}
        onMoveSelectedToTop={handleMoveSelectedToTop}
        onClearAll={handleClearAll}
        onPlayNext={handlePlayNext}
        onAddToQueue={handleAddToQueue}
      />

      {/* ── Volume overlay (3.6) ── */}
      {pipUiVisible && (
        <VolumeBrightnessOverlay
          type="volume"
          value={volumeOverlayValue}
          visible={volumeOverlayVisible}
        />
      )}

      {/* ── Brightness overlay (3.6) ── */}
      {pipUiVisible && (
        <VolumeBrightnessOverlay
          type="brightness"
          value={brightnessOverlayValue}
          visible={brightnessOverlayVisible}
        />
      )}

      {/* ── Loading overlay ── */}
      <VideoPlayerLoadingOverlay visible={!isReady && !error} message="Initializing player…" />
    </View>
  );
};

// ── Static styles ──
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});


