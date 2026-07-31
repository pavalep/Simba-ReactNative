import {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  BackHandler,
  Platform,
  StatusBar,
  Alert,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {MpvPlayer, MpvChapter, MpvTrack, ScreenBrightness} from '../../../native';
import {logError} from '../../../lib/errorLogger';
import {NotificationService} from '../../../services/notificationService';
import type {RootStackScreenProps} from '../../../navigation/types';
import {useHaptics} from '../../../hooks/useHaptics';
import {usePipLifecycle} from '../../../hooks/usePipLifecycle';
import {usePipEntry} from '../../../hooks/usePipEntry';
import {
  pickSubtitleFile,
  validateMediaFile,
  pickMediaFile,
  getFileName,
  getMediaType,
} from '../../../services/fileService';
import {loadSubtitleSettings, saveSubtitleSettings} from '../../../services/subtitleSettingsService';
import {useAppDispatch, useAppSelector} from '../../../store';
import {savePlaybackPosition} from '../../../store/slices/sessionSlice';
import {useBookmarks} from '../../../hooks/useBookmarks';
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
} from '../../../store/slices/playerSlice';
import {readTrackMetadata} from '../../../services/metadataService';
import {selectAllTracks} from '../../../store/slices/mediaSlice';
import type {ScannedTrack} from '../../../store/slices/mediaSlice';
import {EQ_BANDS, EQ_PRESETS} from '../components/VideoPlayerEqualizerPanel';

// ── Helpers ──

const FLAT = EQ_PRESETS.Flat;

/** Build mpv audio filter string from 10 gain values */
function buildEqFilter(gains: number[]): string {
  return gains
    .map((gain, i) => `equalizer=f=${EQ_BANDS[i].freq}:t=h:w=1.0:g=${gain}`)
    .join(',');
}

// ── Hook ──

export function useVideoPlayerScreen(
  navigation: RootStackScreenProps<'VideoPlayer'>['navigation'],
  route: RootStackScreenProps<'VideoPlayer'>['route'],
) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const dispatch = useAppDispatch();

  // ── Route params ──
  const title = route.params?.fileTitle ?? 'Untitled';
  const fileUri = route.params?.fileUri ?? null;
  const requestedStartPosition = route.params?.startPosition;

  // ── Core playback state ──
  const [secondaryVisible, setSecondaryVisible] = useState(true);
  // ── Lock controls (31.1): locked state ignores touches/gestures ──
const [controlsLocked, setControlsLocked] = useState(false);
  const [volume, setVolume] = useState(65);
  const [nativePtr, setNativePtr] = useState(0);
  const [showVideoSurface, setShowVideoSurface] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<
    'initializing' | 'loading' | 'seeking' | 'ready'
  >('initializing');
  const [error, setError] = useState<{
    title: string;
    message: string;
    detail?: string;
  } | null>(null);
  const [errorIsPermission, setErrorIsPermission] = useState(false);
  const [chapters, setChapters] = useState<MpvChapter[]>([]);

  // ── Subtitle state ──
  const [subtitleTracks, setSubtitleTracks] = useState<MpvTrack[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<number | null>(null);
  const [subtitleVisible, setSubtitleVisible] = useState(true);
  const [subtitlePanelOpen, setSubtitlePanelOpen] = useState(false);
  const [subtitleFontSize, setSubtitleFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [subtitleOpacity, setSubtitleOpacity] = useState(1);
  const [subtitlePosition, setSubtitlePosition] = useState(90);
  const [subtitleTextColor, setSubtitleTextColor] = useState<string>('#FFFFFF');
  const [subtitleBgOpacity, setSubtitleBgOpacity] = useState(0.5);

  // ── Audio track state ──
  const [audioTracks, setAudioTracks] = useState<MpvTrack[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<number | null>(null);
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  const [volumePanelOpen, setVolumePanelOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedPanelOpen, setSpeedPanelOpen] = useState(false);
  const [bookmarkSaved, setBookmarkSaved] = useState(false);
  const [bookmarkSheetVisible, setBookmarkSheetVisible] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showReplay, setShowReplay] = useState(false);

  // ── Refs (declared before useBookmarks due to value dependency) ──
  const isSeeking = useRef(false);
  const fileUriRef = useRef<string | null>(fileUri);
  const titleRef = useRef(title);
  const trackMetaRef = useRef({artist: '', album: '', albumArtUri: ''});
  const resumeSeekDone = useRef(false);
  const resumeTargetRef = useRef<number | null>(null);
  const hasSeenFirstPositionRef = useRef(false);
  const loadingPhaseRef = useRef(loadingPhase);
  const loadingFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushPositionRef = useRef<(pos: number) => void>((_: number) => {});

  const fileUriForHook = fileUriRef.current ?? '';
  const {
    bookmarksForFile,
    bookmarkCountForFile,
    add: addBookmarkEntry,
    remove: removeBookmarkEntry,
  } = useBookmarks(fileUriForHook);

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

  // ── Expanded mode (view rotation, not device rotation) ──
  const [isLandscape, setIsLandscape] = useState(false);
  const {width: screenWidth, height: screenHeight} = useWindowDimensions();

  // ── Redux ──
  const rememberPosition = useAppSelector(
    state => state.settings.rememberPlaybackPosition,
  );
  const sessionRecent = useAppSelector(state => state.session.recentFiles);
  const sessionRecentRef = useRef(sessionRecent);
  const playlist = useAppSelector(state => state.player.playlist);
  const queue = useAppSelector(state => state.player.queue);
  const currentIndex = useAppSelector(state => state.player.currentIndex);
  const loopMode = useAppSelector(state => state.player.loopMode);
  const shuffle = useAppSelector(state => state.player.shuffle);
  const playbackHistory = useAppSelector(state => state.player.playbackHistory);
  const selectedQueueIndices = useAppSelector(state => state.player.selectedQueueIndices);
  const allTracks = useAppSelector(selectAllTracks);
  const playerCurrentPosition = useAppSelector(state => state.player.currentPosition);
  const playerDuration = useAppSelector(state => state.player.duration);

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
  useEffect(() => { fileUriRef.current = fileUri; }, [fileUri]);
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { sessionRecentRef.current = sessionRecent; }, [sessionRecent]);
  useEffect(() => { loadingPhaseRef.current = loadingPhase; }, [loadingPhase]);

  // ── Load persisted subtitle settings on mount ──
  useEffect(() => {
    (async () => {
      const settings = await loadSubtitleSettings();
      setSubtitleFontSize(settings.fontSize);
      setSubtitleOpacity(settings.opacity);
      setSubtitlePosition(settings.position);
      setSubtitleTextColor(settings.textColor);
      setSubtitleBgOpacity(settings.bgOpacity);
    })();
  }, []);

  // ── Derived ──
  const savedEntry = fileUri && rememberPosition
    ? sessionRecent.find(f => f.fileUri === fileUri)
    : undefined;

  const loadingMessage = useMemo(() => {
    switch (loadingPhase) {
      case 'initializing':
        return 'Initializing player…';
      case 'seeking':
        return 'Resuming…';
      case 'loading':
        return 'Loading video…';
      default:
        return 'Loading…';
    }
  }, [loadingPhase]);

  const uiTopInset = isLandscape ? 0 : insets.top;
  const uiBottomInset = isLandscape ? 0 : insets.bottom;

  // ── Auto-navigate back if no fileUri (e.g. restored nav state after restart) ──
  useEffect(() => {
    if (!fileUri) {
      const t = setTimeout(() => {
        (navigation.navigate as unknown as (name: string) => void)('MainTabs');
      }, 100);
      return () => clearTimeout(t);
    }
  }, [fileUri, navigation]);

  // ── Back / Cleanup ──
  const handleReplay = useCallback(() => {
    setShowReplay(false);
    setError(null);
    MpvPlayer.seekTo(0);
    MpvPlayer.resume();
  }, []);

  const handleGoBack = useCallback(() => {
    const curUri = fileUriRef.current;
    const curPos = MpvPlayer.getPosition?.() ?? 0;
    const curDur = MpvPlayer.getDuration?.() ?? 0;
    let thumbPath = '';
    try {
      if (curUri) {
        const rawThumb = MpvPlayer.captureThumbnail(curUri);
        if (rawThumb) {
          thumbPath = 'file://' + rawThumb + '?t=' + Date.now();
        }
      }
    } catch {}

    try { MpvPlayer.stop(); } catch {}
    setShowVideoSurface(false);

    StatusBar.setHidden(false, 'fade');
    setIsLandscape(false);

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
    });
  }, [dispatch, navigation]);

  // ── PiP lifecycle — enter→pause, exit→resume, close→destroy, expand→restore ──
  const {isInPipMode, prepareAndEnterPip} = usePipLifecycle({
    fileUri: fileUri ?? undefined,
    fileTitle: title,
    chapters,
    position: playerCurrentPosition,
    duration: playerDuration,
    onHideUi: useCallback(() => setPipUiVisible(false), []),
    onShowUi: useCallback(() => setPipUiVisible(true), []),
    onNavigateBack: useCallback(() => {
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

  // ── Transport / Playback handlers ──
  const handlePlayPause = useCallback(() => {
    if (MpvPlayer.getPlaybackState() === 'playing') {
      MpvPlayer.pause();
    } else {
      MpvPlayer.resume();
    }
    haptics.medium();
  }, [haptics]);

  const handleSurfaceTap = useCallback(() => {
    if (controlsLocked) {
      // Locked: tapping the surface only reveals the top bar so the
      // persistent unlock chip stays reachable — never play/pause.
      setSecondaryVisible(v => !v);
      return;
    }
    if (!secondaryVisible) {
      setSecondaryVisible(true);
      return;
    }
    handlePlayPause();
  }, [controlsLocked, handlePlayPause, secondaryVisible]);

  const handleToggleLock = useCallback(() => {
    setControlsLocked(prev => {
      const next = !prev;
      // Always reveal the UI when toggling so the user sees the change.
      setSecondaryVisible(true);
      return next;
    });
  }, []);

  const handlePrev = useCallback(() => {
    MpvPlayer.seekTo(0);
  }, []);

  const handleNext = useCallback(() => {
    if (playlist.length > 0 && currentIndex < playlist.length - 1) {
      const nextIdx = currentIndex + 1;
      const entry = playlist[nextIdx];
      if (!entry) return;
      dispatch(nextTrack());
      // 31.9 mixed-queue handoff: next item is audio → seamless player swap
      if (getMediaType(entry.uri) === 'audio') {
        navigation.replace('AudioPlayer', {fileUri: entry.uri, fileTitle: entry.title});
        return;
      }
      MpvPlayer.loadFile(entry.uri);
    } else {
      MpvPlayer.seekTo(MpvPlayer.getDuration?.() ?? 0);
    }
  }, [playlist, currentIndex, dispatch, navigation]);

  const handleSeek = useCallback((pct: number) => {
    isSeeking.current = true;
    const target = pct * (MpvPlayer.getDuration?.() ?? 1);
    MpvPlayer.seekTo(target);
    setTimeout(() => { isSeeking.current = false; }, 200);
  }, []);

  const handleChapterSeek = useCallback((time: number) => {
    isSeeking.current = true;
    MpvPlayer.seekTo(time);
    setTimeout(() => { isSeeking.current = false; }, 200);
  }, []);

  const handleVolumeChange = useCallback(() => {
    setVolumePanelOpen(true);
  }, []);

  const handleToggleMute = useCallback(() => {
    MpvPlayer.toggleMute?.();
    setMuted(prev => !prev);
  }, []);

  const handleVolumeValueChange = useCallback((value: number) => {
    const nextVolume = Math.round(Math.max(0, Math.min(100, value)));
    MpvPlayer.setVolume(nextVolume);
    if (nextVolume > 0 && muted) {
      MpvPlayer.setMuted?.(false);
      setMuted(false);
    }
    setVolume(nextVolume);
  }, [muted]);

  const handleSpeedSelect = useCallback((nextSpeed: number) => {
    MpvPlayer.setSpeed(nextSpeed);
    setSpeed(nextSpeed);
    setSpeedPanelOpen(false);
  }, []);

  const handleAddBookmark = useCallback(
    (label?: string) => {
      const uri = fileUriRef.current;
      if (!uri) return;
      const position = MpvPlayer.getPosition?.() ?? 0;
      const duration = MpvPlayer.getDuration?.() ?? 0;
      if (position < 1) return;
      addBookmarkEntry({
        fileUri: uri,
        title: titleRef.current,
        position,
        duration,
        label: label ?? '',
        mediaType: getMediaType(uri),
      });
      setBookmarkSaved(true);
    },
    [addBookmarkEntry],
  );

  const handleOpenBookmarkSheet = useCallback(() => {
    setBookmarkSheetVisible(true);
  }, []);

  const handleCloseBookmarkSheet = useCallback(() => {
    setBookmarkSheetVisible(false);
  }, []);

  const handleBookmarkJumpTo = useCallback(
    (position: number) => {
      MpvPlayer.seekTo(position);
    },
    [],
  );

  // ── Gesture handlers ──
  const handleDoubleTapLeft = useCallback(() => {
    if (controlsLocked) return;
    const target = Math.max(0, (MpvPlayer.getPosition?.() ?? 0) - 10);
    MpvPlayer.seekTo(target);
    setSeekSide('left');
    setSeekFeedbackVisible(true);
    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
    overlayHideTimer.current = setTimeout(() => setSeekFeedbackVisible(false), 1000);
  }, []);

  const handleDoubleTapRight = useCallback(() => {
    if (controlsLocked) return;
    const target = Math.min(MpvPlayer.getDuration?.() ?? 1, (MpvPlayer.getPosition?.() ?? 0) + 10);
    MpvPlayer.seekTo(target);
    setSeekSide('right');
    setSeekFeedbackVisible(true);
    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
    overlayHideTimer.current = setTimeout(() => setSeekFeedbackVisible(false), 1000);
  }, []);

  const handleSwipeUp = useCallback(() => {
    if (controlsLocked) return;
    setInfoSheetVisible(true);
  }, [controlsLocked]);

  const handleSwipeDown = useCallback(() => {
    if (controlsLocked) return;
    if (Platform.OS === 'android') {
      triggerShrinkAndEnterPip();
      return;
    }
    MpvPlayer.toggleMute?.();
  }, [controlsLocked, triggerShrinkAndEnterPip]);

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
    },
    [],
  );

  // ── Volume/Brightness gesture callbacks (3.6) ──
  const handleVolumeSwipe = useCallback((delta: number) => {
    if (controlsLocked) return;
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
    if (controlsLocked) return;
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
    setSubtitlePanelOpen(false);
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
    MpvPlayer.setProperty('sub-font-size', size === 'small' ? 22 : size === 'large' ? 38 : 30);
    saveSubtitleSettings({fontSize: size});
  }, []);

  const handleOpacityChange = useCallback((opacity: number) => {
    setSubtitleOpacity(opacity);
    MpvPlayer.setProperty('sub-opacity', opacity);
    saveSubtitleSettings({opacity});
  }, []);

  const handleSubtitlePositionChange = useCallback((position: number) => {
    setSubtitlePosition(position);
    MpvPlayer.setProperty('sub-pos', position);
    saveSubtitleSettings({position});
  }, []);

  // ── Subtitle style sheet ──
  const handleTextColorChange = useCallback((color: string) => {
    setSubtitleTextColor(color);
    MpvPlayer.setProperty('sub-color', color);
    saveSubtitleSettings({textColor: color});
  }, []);

  const handleBgOpacityChange = useCallback((opacity: number) => {
    setSubtitleBgOpacity(opacity);
    saveSubtitleSettings({bgOpacity: opacity});
  }, []);

  // ── Audio track ──
  const handleSelectAudioTrack = useCallback((trackId: number | null) => {
    setActiveAudioTrack(trackId);
    if (trackId === null) {
      MpvPlayer.setTrack('audio', 'no');
    } else {
      MpvPlayer.setTrack('audio', trackId);
    }
    setAudioPanelOpen(false);
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

  const handleQueueSelectItem = useCallback((_fileUri: string) => {
    const playlistIdx = playlist.findIndex(e => e.uri === _fileUri);
    if (playlistIdx >= 0 && playlistIdx !== currentIndex) {
      const entry = playlist[playlistIdx];
      if (entry) {
        dispatch(playFromPlaylist(playlistIdx));
        MpvPlayer.loadFile(entry.uri);
      }
    }
    setQueueSheetVisible(false);
  }, [dispatch, playlist, currentIndex]);

  const handleSelectQueueItem = useCallback((idx: number) => {
    const item = queue[idx];
    if (!item) return;
    handleQueueSelectItem(item.uri);
  }, [queue, handleQueueSelectItem]);

  const handleSelectHistoryItem = useCallback((idx: number) => {
    const item = playbackHistory[idx];
    if (!item) return;
    handleQueueSelectItem(item.uri);
  }, [playbackHistory, handleQueueSelectItem]);

  const handlePlayNext = useCallback((entry: PlaylistEntry) => {
    dispatch(prependToQueue(entry));
  }, [dispatch]);

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
    setErrorIsPermission(false);
    setIsReady(false);
    setLoadingPhase('initializing');
    resumeTargetRef.current = null;
    hasSeenFirstPositionRef.current = false;
    if (loadingFallbackTimer.current) {
      clearTimeout(loadingFallbackTimer.current);
      loadingFallbackTimer.current = null;
    }
    setNativePtr(0);
    setTimeout(() => {
      const ok = MpvPlayer.initPlayer();
      if (ok) {
        const ptr = MpvPlayer.getNativePtr();
        setNativePtr(ptr);
        setIsReady(true);
        setLoadingPhase('loading');
        const playableUri = fileUriRef.current;
        const sub = MpvPlayer.onSurfaceAttached(() => {
          if (playableUri) {
            setLoadingPhase('loading');
            MpvPlayer.loadFile(playableUri);
          }
          sub?.remove();
        });
      } else {
        setError({
          title: 'Retry Failed',
          message: 'The player could not be re-initialized.',
        });
      }
    }, 500);
  }, []);

  // ── Toggle rotate ──
  const handleToggleRotate = useCallback(() => {
    setIsLandscape(p => {
      const next = !p;
      StatusBar.setHidden(next, 'fade');
      return next;
    });
  }, []);

  // ── Panel toggle handlers for SecondaryToolbar ──
  const handleToggleChapters = useCallback(() => {
    setChaptersPanelOpen(p => !p);
    setAudioPanelOpen(false);
    setSubtitlePanelOpen(false);
    setEqPanelOpen(false);
    setPlaylistPanelOpen(false);
  }, []);

  const handleToggleAudio = useCallback(() => {
    setAudioPanelOpen(p => !p);
    setChaptersPanelOpen(false);
    setSubtitlePanelOpen(false);
    setEqPanelOpen(false);
    setPlaylistPanelOpen(false);
  }, []);

  const handleToggleSubtitles = useCallback(() => {
    setSubtitlePanelOpen(p => !p);
    setChaptersPanelOpen(false);
    setAudioPanelOpen(false);
    setEqPanelOpen(false);
    setPlaylistPanelOpen(false);
  }, []);

  const handleToggleEqPanel = useCallback(() => {
    setEqPanelOpen(p => !p);
    setChaptersPanelOpen(false);
    setAudioPanelOpen(false);
    setSubtitlePanelOpen(false);
    setPlaylistPanelOpen(false);
  }, []);

  const handleTogglePlaylist = useCallback(() => {
    setPlaylistPanelOpen(p => !p);
    setChaptersPanelOpen(false);
    setAudioPanelOpen(false);
    setSubtitlePanelOpen(false);
    setEqPanelOpen(false);
  }, []);

  // ── Push position ref handler for VideoTransportDependentContent ──
  const handlePushPositionRef = useCallback((fn: (pos: number) => void) => {
    pushPositionRef.current = fn;
  }, []);

  // ── Close queue sheet with cleanup ──
  const handleCloseQueueSheet = useCallback(() => {
    setQueueSheetVisible(false);
    setQueueMultiSelect(false);
    dispatch(clearQueueSelection());
  }, [dispatch]);

  // ══════════════════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════════════════

  // ── Init player on mount ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const playableUri = fileUri;
      setLoadingPhase('initializing');
      resumeTargetRef.current = null;
      hasSeenFirstPositionRef.current = false;
      if (loadingFallbackTimer.current) {
        clearTimeout(loadingFallbackTimer.current);
        loadingFallbackTimer.current = null;
      }

      if (playableUri) {
        const validation = await validateMediaFile(playableUri);
        if (cancelled) return;
        if (!validation.valid) {
          const errDetail = validation.detail || '';
          setError({
            title: validation.title,
            message: validation.message,
            detail: errDetail,
          });
          logError({
            code: 'ERR_FILE_INVALID',
            message: validation.message,
            detail: errDetail,
            source: 'VideoPlayerScreen',
          });
          if (validation.title === 'Permission Denied') {
            setErrorIsPermission(true);
          }
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
        logError({
          code: 'ERR_ENGINE_INIT',
          message: 'Native player engine init failed',
          source: 'VideoPlayerScreen',
        });
        return;
      }

      const ptr = MpvPlayer.getNativePtr();
      setNativePtr(ptr);
      setIsReady(true);
      setLoadingPhase('loading');

      const sub = MpvPlayer.onSurfaceAttached(() => {
        if (playableUri) {
          setLoadingPhase('loading');
          MpvPlayer.loadFile(playableUri);

          setTimeout(() => {
            try {
              const thumb = MpvPlayer.captureThumbnail(playableUri);
              if (thumb) {
                dispatch(savePlaybackPosition({
                  fileUri: playableUri,
                  title: titleRef.current,
                  position: 0,
                  duration: MpvPlayer.getDuration() || 0,
                  thumbnailPath: 'file://' + thumb,
                  mediaType: getMediaType(playableUri),
                }));
              }
            } catch (e) {
              console.warn('Thumbnail capture failed', e);
            }
          }, 2000);
        }
        sub?.remove();
      });
    })();

    return () => {
      cancelled = true;
      if (loadingFallbackTimer.current) {
        clearTimeout(loadingFallbackTimer.current);
        loadingFallbackTimer.current = null;
      }
      try {
        const curUri = fileUriRef.current;
        const curPos = MpvPlayer.getPosition?.() ?? 0;
        const curDur = MpvPlayer.getDuration?.() ?? 0;
        if (curUri && rememberPosition && curPos > 0) {
          const existing = sessionRecentRef.current.find(f => f.fileUri === curUri);
          dispatch(
            savePlaybackPosition({
              fileUri: curUri,
              title: titleRef.current,
              position: curPos,
              duration: curDur,
              thumbnailPath: existing?.thumbnailPath,
              mediaType: getMediaType(curUri),
            }),
          );
        }
        try { MpvPlayer.stop(); } catch {}
        NotificationService.stop();
        MpvPlayer.destroy();
        dispatch(clearPlayer());
      } catch {}
    };
  }, [dispatch, fileUri, rememberPosition, requestedStartPosition]);

  // ── Periodic position save ──
  useEffect(() => {
    if (!fileUri || !rememberPosition) return;

    const interval = setInterval(() => {
      const curPos = MpvPlayer.getPosition?.() ?? 0;
      if (curPos > 0) {
        const existing = sessionRecentRef.current.find(f => f.fileUri === fileUri);
        dispatch(
          savePlaybackPosition({
            fileUri,
            title: titleRef.current,
            position: curPos,
            duration: MpvPlayer.getDuration?.() ?? 0,
            thumbnailPath: existing?.thumbnailPath,
            mediaType: getMediaType(fileUri ?? ''),
          }),
        );
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fileUri, rememberPosition, dispatch]);

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
        pushPositionRef.current(pos);
      }

      if (loadingPhaseRef.current !== 'ready') {
        if (!hasSeenFirstPositionRef.current && pos > 0) {
          hasSeenFirstPositionRef.current = true;
          if (resumeTargetRef.current == null) {
            setLoadingPhase('ready');
          }
        }

        const target = resumeTargetRef.current;
        if (target != null && pos >= Math.max(0, target - 0.35)) {
          resumeTargetRef.current = null;
          resumeSeekDone.current = true;
          setLoadingPhase('ready');
          MpvPlayer.resume();
        }
      }
    });

    const unsubState = MpvPlayer.on(
      'onPlaybackStateChanged',
      ({state: _state}: {state: string}) => {
        // TransportProvider's polling handles isPlaying state
      },
    );

    const unsubVol = MpvPlayer.on('onVolumeChanged', ({volume: vol}) => {
      setVolume(vol);
      setMuted(MpvPlayer.isMuted?.() ?? vol <= 0);
    });
    const unsubSpeed = MpvPlayer.on('onSpeedChanged', ({speed: nextSpeed}) => {
      setSpeed(nextSpeed);
    });

    const unsubFile = MpvPlayer.on('onFileLoaded', () => {
      resumeSeekDone.current = false;
      resumeTargetRef.current = null;
      hasSeenFirstPositionRef.current = false;
      setLoadingPhase('loading');

      if (loadingFallbackTimer.current) {
        clearTimeout(loadingFallbackTimer.current);
        loadingFallbackTimer.current = null;
      }

      dispatch(
        savePlaybackPosition({
          fileUri: fileUriRef.current ?? '',
          title: titleRef.current,
          position: 0,
          duration: MpvPlayer.getDuration(),
          mediaType: getMediaType(fileUriRef.current ?? ''),
        }),
      );

      const resumePosition = requestedStartPosition ?? savedEntry?.position ?? 0;
      if (resumePosition > 0) {
        setLoadingPhase('seeking');
        MpvPlayer.pause();
        setTimeout(() => {
          MpvPlayer.seekTo(resumePosition);
          resumeTargetRef.current = resumePosition;
        }, 300);

        loadingFallbackTimer.current = setTimeout(() => {
          if (resumeTargetRef.current != null) {
            resumeTargetRef.current = null;
            resumeSeekDone.current = true;
            setLoadingPhase('ready');
            MpvPlayer.resume();
          }
        }, 2500);
      } else {
        loadingFallbackTimer.current = setTimeout(() => {
          if (loadingPhaseRef.current !== 'ready') {
            setLoadingPhase('ready');
          }
        }, 700);
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

      // ── Load metadata for InfoSheet + Notification ──
      const currentUri = fileUriRef.current;
      if (currentUri) {
        readTrackMetadata(currentUri)
          .then(meta => {
            if (meta) {
              setCurrentTrackMetadata(meta);
              trackMetaRef.current = {
                artist: meta.artist || '',
                album: meta.album || '',
                albumArtUri: meta.albumArtUri || '',
              };
            }
            // Start foreground notification with available metadata
            NotificationService.start(
              {
                title: titleRef.current ?? 'Untitled',
                artist: trackMetaRef.current.artist,
                album: trackMetaRef.current.album,
                fileUri: currentUri,
                artworkPath: trackMetaRef.current.albumArtUri || currentUri,
                mediaType: 'video',
              },
              {
                position: MpvPlayer.getPosition?.() ?? 0,
                duration: MpvPlayer.getDuration?.() ?? 1,
                isPlaying: MpvPlayer.getPlaybackState() === 'playing',
              },
            );
          })
          .catch(() => {
            // Start notification with fallback metadata anyway
            NotificationService.start(
              {
                title: titleRef.current ?? 'Untitled',
                artist: '',
                album: '',
                fileUri: currentUri,
                artworkPath: '',
                mediaType: 'video',
              },
              {
                position: 0,
                duration: MpvPlayer.getDuration?.() ?? 1,
                isPlaying: false,
              },
            );
          });
      }
    });

    const unsubEnd = MpvPlayer.on('onEndReached', () => {
      // 31.9: at video end, hand off straight into the audio player when the
      // next queue item is audio (playback continues without a replay stop).
      const nextIdx = currentIndex + 1;
      const nextEntry = playlist[nextIdx];
      if (nextEntry && getMediaType(nextEntry.uri) === 'audio') {
        dispatch(nextTrack());
        navigation.replace('AudioPlayer', {fileUri: nextEntry.uri, fileTitle: nextEntry.title});
        return;
      }
      setShowReplay(true);
    });

    const unsubBuffering = MpvPlayer.on('onBuffering', ({percent}) => {
      setIsBuffering(percent > 0 && percent < 100);
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

    // ── Notification event subscriptions ──
    const unsubNotifPlayPause = NotificationService.onPlayPause(() => {
      isSeeking.current = false;
      handlePlayPause();
    });
    const unsubNotifNext = NotificationService.onNext(() => {
      handleNext();
    });
    const unsubNotifPrev = NotificationService.onPrevious(() => {
      handlePrev();
    });
    const unsubNotifStop = NotificationService.onStop(() => {
      handleGoBack();
    });
    const unsubNotifSeek = NotificationService.onSeekTo((pos: number) => {
      MpvPlayer.seekTo(pos);
      pushPositionRef.current(pos);
    });

    return () => {
      unsubPos();
      unsubState();
      unsubVol();
      unsubSpeed();
      unsubFile();
      unsubEnd();
      unsubBuffering();
      unsubError();
      unsubTracks();
      unsubNotifPlayPause();
      unsubNotifNext();
      unsubNotifPrev();
      unsubNotifStop();
      unsubNotifSeek();
    };
  }, [isReady, savedEntry, requestedStartPosition, dispatch, handlePlayPause, handleNext, handlePrev, handleGoBack, controlsLocked, playlist, currentIndex, navigation]);

  // ── Return ──
  // ── Computed labels for toolbar ──
  const subtitleLabel = useMemo(() => {
    if (activeSubtitle === null) {return '';}
    const track = subtitleTracks.find(t => Number(t.id) === activeSubtitle);
    return track?.lang?.toUpperCase() || track?.title || '';
  }, [activeSubtitle, subtitleTracks]);

  const audioLabel = useMemo(() => {
    if (activeAudioTrack === null) {return '';}
    const track = audioTracks.find(t => Number(t.id) === activeAudioTrack);
    return track?.lang?.toUpperCase() || track?.title || '';
  }, [activeAudioTrack, audioTracks]);

  return {
    // Theme & layout
    colors,
    insets,
    title,
    fileUri,

    // Core playback state
    secondaryVisible,
    setSecondaryVisible,
    controlsLocked,
    volume,
    nativePtr,
    showVideoSurface,
    isReady,
    loadingPhase,
    error,
    errorIsPermission,
    chapters,

    // Subtitle state
    subtitleTracks,
    activeSubtitle,
    subtitleVisible,
    subtitlePanelOpen,
    setSubtitlePanelOpen,
    subtitleFontSize,
    subtitleOpacity,
    subtitlePosition,
    subtitleTextColor,
    subtitleBgOpacity,

    // Audio track state
    audioTracks,
    activeAudioTrack,
    audioPanelOpen,
    setAudioPanelOpen,
    volumePanelOpen,
    setVolumePanelOpen,
    muted,
    speed,
    speedPanelOpen,
    setSpeedPanelOpen,
    bookmarkSaved,
    bookmarkSheetVisible,
    bookmarksForFile,
    bookmarkCountForFile,
    isBuffering,
    showReplay,
    handleReplay,

    // Equalizer state
    eqGains,
    eqEnabled,
    eqPanelOpen,
    setEqPanelOpen,

    // Playlist state
    playlistPanelOpen,
    setPlaylistPanelOpen,

    // Chapters panel state
    chaptersPanelOpen,
    setChaptersPanelOpen,

    // Info Sheet state
    infoSheetVisible,
    setInfoSheetVisible,

    // Playlist Sheet state
    playlistSheetVisible,
    setPlaylistSheetVisible,
    currentTrackMetadata,

    // Queue Sheet state
    queueSheetVisible,
    setQueueSheetVisible,
    queueMultiSelect,
    setQueueMultiSelect,

    // PiP
    pipUiVisible,

    // Gesture overlay state
    seekSide,
    seekFeedbackVisible,
    volumeOverlayValue,
    volumeOverlayVisible,
    brightnessOverlayValue,
    brightnessOverlayVisible,

    // Expanded mode
    isLandscape,
    screenWidth,
    screenHeight,
    uiTopInset,
    uiBottomInset,

    // Refs
    pushPositionRef,

    // Redux
    dispatch,
    playlist,
    queue,
    currentIndex,
    loopMode,
    shuffle,
    playbackHistory,
    selectedQueueIndices,

    // Derived data
    relatedTracks,
    errorStyles,
    savedEntry,
    loadingMessage,

    // PiP animation values
    pipScale,
    pipTranslateX,
    pipTranslateY,

    // Navigation / lifecycle handlers
    handleGoBack,
    handleRetry,

    // Transport / playback handlers
    handlePlayPause,
    handleSurfaceTap,
    handleToggleLock,
    handlePrev,
    handleNext,
    handleSeek,
    handleChapterSeek,

    // Volume handlers
    handleVolumeChange,
    handleToggleMute,
    handleVolumeValueChange,
    handleSpeedSelect,
    handleAddBookmark,
    handleOpenBookmarkSheet,
    handleCloseBookmarkSheet,
    handleBookmarkJumpTo,
    handleRemoveBookmark: removeBookmarkEntry,

    // Gesture handlers
    handleDoubleTapLeft,
    handleDoubleTapRight,
    handleSwipeUp,
    handleSwipeDown,
    handleScreenshot,

    // InfoSheet handlers
    handleInfo,
    handleInfoAddToPlaylist,
    handleMorePress,
    handlePlayRelatedTrack,

    // Volume/Brightness gesture handlers
    handleVolumeSwipe,
    handleBrightnessSwipe,
    handleVolumeGestureEnd,
    handleBrightnessGestureEnd,

    // Shuffle / Loop
    handleToggleShuffle,
    handleToggleLoop,

    // Subtitle handlers
    handleSelectSubtitle,
    handleToggleSubtitleVisibility,
    handleLoadExternalSubtitle,
    handleFontSizeChange,
    handleOpacityChange,
    handleSubtitlePositionChange,
    handleTextColorChange,
    handleBgOpacityChange,

    // Audio track handlers
    handleSelectAudioTrack,

    // Toolbar labels
    subtitleLabel,
    audioLabel,

    // Equalizer handlers
    handleBandChange,
    handleApplyPreset,
    handleResetEq,
    handleToggleEq,

    // Playlist handlers
    handleAddToPlaylist,
    handleRemoveFromPlaylist,
    handlePlayFromPlaylist,
    handleClearPlaylist,

    // Queue handlers
    handleQueueMoveItem,
    handleQueueRemoveItem,
    handleQueueSelectItem,
    handleSelectQueueItem,
    handleSelectHistoryItem,
    handlePlayNext,
    handleAddToQueue,
    handleCloseQueueSheet,

    // Queue multi-select handlers
    handleEnterMultiSelect,
    handleExitMultiSelect,
    handleToggleSelection,
    handleRemoveSelected,
    handleMoveSelectedToTop,
    handleClearAll,

    // Panel toggle handlers
    handleToggleRotate,
    handleToggleChapters,
    handleToggleAudio,
    handleToggleSubtitles,
    handleToggleEqPanel,
    handleTogglePlaylist,

    // Push position ref handler
    handlePushPositionRef,
  };
}