import {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  BackHandler,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {MpvPlayer, MpvChapter, MpvTrack, ScreenBrightness} from '../../../native';
import {logError} from '../../../lib/errorLogger';
import {logger} from '../../../lib/logger';
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
import {DEFAULT_SUBTITLE_COLOR} from '../../../constants/subtitleColors';
import {useToast} from '../../../components/feedback/Toast/Toast';
import {useAppDispatch, useAppSelector} from '../../../store';
import {savePlaybackPosition} from '../../../store/slices/sessionSlice';
import {
  setSubtitleFontSize as setSliceSubtitleFontSize,
  setSubtitleTextColor as setSliceSubtitleTextColor,
  setSubtitleBackgroundOpacity as setSliceSubtitleBgOpacity,
  setEqGains,
  setEqEnabled,
  setEqPreset,
} from '../../../store/slices/settingsSlice';
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
import {shareContent} from '../../../services/shareService';
import {isRemoteUri, sourceFromUri, classifyStreamType} from '../../../utils/mediaUri';
import {lockToLandscape, lockToPortrait} from '../../../utils/orientation';
import {selectAllTracks} from '../../../store/slices/mediaSlice';
import type {ScannedTrack} from '../../../store/slices/mediaSlice';
import {EQ_PRESETS, buildAfFilter} from '../../../services/audioSettingsService';

// ── Helpers ──

const FLAT = EQ_PRESETS.Flat;

// ── Hook ──

export function useVideoPlayerScreen(
  navigation: RootStackScreenProps<'VideoPlayer'>['navigation'],
  route: RootStackScreenProps<'VideoPlayer'>['route'],
) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const toast = useToast();
  const dispatch = useAppDispatch();

  // ── Route params ──
  const title = route.params?.fileTitle ?? 'Untitled';
  const fileUri = route.params?.fileUri ?? null;
  const requestedStartPosition = route.params?.startPosition;
  const routeSource = route.params?.source;
  const initialError = route.params?.initialError ?? null;
  // P36.5: live channel list (IPTV) — enables channel up/down
  const liveChannels = route.params?.liveChannels;
  const liveChannelIndex = route.params?.liveChannelIndex ?? 0;

  // P36.5: switch to the previous/next live channel (replaces the player)
  const handleChannelSwitch = useCallback(
    (dir: 1 | -1) => {
      if (!liveChannels || liveChannels.length === 0) return;
      const nextIndex =
        (liveChannelIndex + dir + liveChannels.length) % liveChannels.length;
      const next = liveChannels[nextIndex];
      navigation.replace('VideoPlayer', {
        fileUri: next.url,
        fileTitle: next.name,
        source: 'iptv',
        liveChannels,
        liveChannelIndex: nextIndex,
      });
    },
    [liveChannels, liveChannelIndex, navigation],
  );

  // ── Core playback state ──
  const [secondaryVisible, setSecondaryVisible] = useState(true);
  // ── Lock controls (31.1): locked state ignores touches/gestures ──
const [controlsLocked, setControlsLocked] = useState(false);
  // ── Resume prompt (31.2) + auto-advance card (31.3) ──
const [resumePrompt, setResumePrompt] = useState<{position: number} | null>(null);
const [autoAdvance, setAutoAdvance] = useState<{uri: string; title: string} | null>(null);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(5);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceCountdownRef = useRef(5);

  // V6 1.1.1-1.1.3: Cleanup all timer refs on unmount to prevent callbacks
  // from firing after navigation completes (potential crash source).
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, []);

  // 1.1.1: Cleanup loadingFallbackTimer + overlayHideTimer on unmount
  // (declared as useRef below — we capture them via a separate effect after
  //  declaration to avoid TDZ).
  // Forward-declared timer cleanup effect.
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  useEffect(() => {
    return () => {
      // These refs are declared later in the file. The closure captures
      // them by reference via module-level identifiers, so cleanup runs
      // safely on unmount regardless of declaration order.
      try {
        if (loadingFallbackTimer.current) {
          clearTimeout(loadingFallbackTimer.current);
          loadingFallbackTimer.current = null;
        }
        if (overlayHideTimer.current) {
          clearTimeout(overlayHideTimer.current);
          overlayHideTimer.current = null;
        }
      } catch {
        // Ignore — refs may be uninitialised if unmount fires before mount.
      }
    };
  }, []);

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
  const [subtitleTextColor, setSubtitleTextColor] = useState<string>(DEFAULT_SUBTITLE_COLOR);
  const [subtitleBgOpacity, setSubtitleBgOpacity] = useState(0.5);

  // ── Audio track state ──
  const [audioTracks, setAudioTracks] = useState<MpvTrack[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<number | null>(null);
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  const [volumePanelOpen, setVolumePanelOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedPanelOpen, setSpeedPanelOpen] = useState(false);
  // ── Live currentPosition (tracked locally so the bookmark icon can
  //    switch to "filled" the instant playback reaches a saved bookmark).
  //    A ref keeps the value hot for the toggle handler; the state mirrors
  //    it so consumers (e.g. TopBar) re-render when the position lands
  //    within the bookmark-tolerance window. ──
  const currentPositionRef = useRef(0);
  const [currentPosition, setCurrentPositionState] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [showReplay, setShowReplay] = useState(false);

  // ── Refs (declared before useBookmarks due to value dependency) ──
  const isSeeking = useRef(false);
  const fileUriRef = useRef<string | null>(fileUri);
  const titleRef = useRef(title);
  const routeSourceRef = useRef<string | undefined>(routeSource);
  const trackMetaRef = useRef({artist: '', album: '', albumArtUri: ''});
  const resumeSeekDone = useRef(false);
  const resumeTargetRef = useRef<number | null>(null);
  const hasSeenFirstPositionRef = useRef(false);
  const loadingPhaseRef = useRef(loadingPhase);
  const loadingFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushPositionRef = useRef<(pos: number) => void>((_: number) => {});

  // V6 1.2.1: Mount state ref — guards async callbacks from setting state
  // after navigation completes. Prevents "setState on unmounted component" warnings
  // and state corruption when the new player mounts before async work finishes.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /** V6 1.2.3: Safe setState — only updates state if component is still mounted. */
  const safeSetState = useRef(<T>(setter: (v: T) => void, value: T) => {
    if (isMountedRef.current) {
      setter(value);
    }
  });

  const fileUriForHook = fileUriRef.current ?? '';
  const {
    bookmarksForFile,
    bookmarkCountForFile,
    add: addBookmarkEntry,
    remove: removeBookmarkEntry,
  } = useBookmarks(fileUriForHook);

  // ── Equalizer state (Phase 45: settings slice is the source of truth) ──
  const eqGains = useAppSelector(s => s.settings.eqGains);
  const eqEnabled = useAppSelector(s => s.settings.eqEnabled);
  const dialogueBoost = useAppSelector(s => s.settings.isDialogueBoostEnabled);
  const [eqPanelOpen, setEqPanelOpen] = useState(false);

  // 51.3: media notification is gated by the user preference
  const notificationsEnabled = useAppSelector(s => s.settings.notificationsEnabled);
  const notificationsEnabledRef = useRef(notificationsEnabled);
  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

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

  // 44.6: settings slice is the source of truth for subtitle style; ref mirrors it for load-time mpv props
  const sliceSubtitleFontSize = useAppSelector(state => state.settings.subtitleFontSize);
  const sliceSubtitleTextColor = useAppSelector(state => state.settings.subtitleTextColor);
  const sliceSubtitleBgOpacity = useAppSelector(state => state.settings.subtitleBackgroundOpacity);
  const preferredLanguages = useAppSelector(state => state.settings.preferredLanguages);
  const subtitleSliceRef = useRef({
    fontSize: sliceSubtitleFontSize,
    textColor: sliceSubtitleTextColor,
    bgOpacity: sliceSubtitleBgOpacity,
    languages: preferredLanguages,
  });
  useEffect(() => {
    subtitleSliceRef.current = {
      fontSize: sliceSubtitleFontSize,
      textColor: sliceSubtitleTextColor,
      bgOpacity: sliceSubtitleBgOpacity,
      languages: preferredLanguages,
    };
  }, [sliceSubtitleFontSize, sliceSubtitleTextColor, sliceSubtitleBgOpacity, preferredLanguages]);

  // 46.1: accessibility — larger controls scale + high-contrast subtitle override
  const largerControls = useAppSelector(s => s.settings.largerControls);
  const controlScale = largerControls ? 1.18 : 1;
  const highContrastSubtitles = useAppSelector(s => s.settings.highContrastSubtitles);
  const highContrastRef = useRef(highContrastSubtitles);
  useEffect(() => {
    highContrastRef.current = highContrastSubtitles;
  }, [highContrastSubtitles]);

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

  // ── Load persisted subtitle settings on mount (slice is source of truth; service is fallback) ──
  useEffect(() => {
    (async () => {
      const settings = await loadSubtitleSettings();
      // V6 1.2.3: bail if component unmounted during async load
      if (!isMountedRef.current) return;
      const slice = subtitleSliceRef.current;
      setSubtitleFontSize(slice.fontSize < 20 ? 'small' : slice.fontSize > 30 ? 'large' : 'medium');
      setSubtitleOpacity(settings.opacity);
      setSubtitlePosition(settings.position);
      setSubtitleTextColor(slice.textColor || settings.textColor);
      setSubtitleBgOpacity(slice.bgOpacity);
    })();
  }, []);

  // ── Derived ──
  const savedEntry = fileUri && rememberPosition
    ? sessionRecent.find(f => f.fileUri === fileUri)
    : undefined;

  // V6 9.3.4: derive the current video's thumbnail (if any) for the
  // SeekBar scrub preview. This is the first-frame thumbnail captured
  // by the player after loadFile; it lives in sessionRecent keyed by
  // the file URI. Until native thumbnail-strip support ships, this is
  // the best we can show in the scrub bubble.
  const currentThumbnailPath = useMemo(() => {
    if (!fileUri) return undefined;
    const entry = sessionRecent.find(f => f.fileUri === fileUri);
    return entry?.thumbnailPath ?? undefined;
  }, [fileUri, sessionRecent]);

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

  // ── Auto-navigate back if no fileUri (e.g. restored nav state after restart).
  //   But if a pre-flight initialError was provided by the caller, surface
  //   that error in the player instead of silently bouncing back.
  useEffect(() => {
    if (!fileUri && !initialError) {
      const t = setTimeout(() => {
        // 57.1: prefer going back to the originating screen; MainTabs only as cold-start fallback
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          (navigation.navigate as unknown as (name: string) => void)('MainTabs');
        }
      }, 100);
      return () => clearTimeout(t);
    }
    if (initialError) {
      setError({
        title: initialError.title,
        message: initialError.message,
      });
    }
  }, [fileUri, initialError, navigation]);

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
            source: routeSourceRef.current ?? sourceFromUri(curUri),
          }),
        );
      }
      // 57.1: return to the originating screen instead of dumping the stack at MainTabs
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        (navigation.navigate as unknown as (name: string) => void)('MainTabs');
      }
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
      // 31.9 mixed-queue handoff: next item is audio → seamless player swap.
      // P34.4: mediaType wins for extensionless remote URLs.
      if ((entry.mediaType ?? getMediaType(entry.uri)) === 'audio') {
        navigation.replace('AudioPlayer', {
          fileUri: entry.uri,
          fileTitle: entry.title,
          source: entry.source,
        });
        return;
      }
      MpvPlayer.loadFile(entry.uri);
    } else {
      MpvPlayer.seekTo(MpvPlayer.getDuration?.() ?? 0);
    }
  }, [playlist, currentIndex, dispatch, navigation]);

  // ── 31.2: Resume / Start Over choice on load ──
  const handleResumeChoice = useCallback(
    (shouldResume: boolean) => {
      if (!resumePrompt) return;
      const pos = resumePrompt.position;
      setResumePrompt(null);
      if (shouldResume && pos > 1) {
        resumeTargetRef.current = pos;
        MpvPlayer.seekTo(pos);
      }
      MpvPlayer.resume();
    },
    [resumePrompt],
  );

  // ── 31.3: "Up Next in 5s" auto-advance countdown ──
  const startAutoAdvance = useCallback(
    (entry: PlaylistEntry) => {
      if (autoAdvanceTimerRef.current) {
        clearInterval(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      autoAdvanceCountdownRef.current = 5;
      setAutoAdvanceCountdown(5);
      setAutoAdvance({uri: entry.uri, title: entry.title});
      autoAdvanceTimerRef.current = setInterval(() => {
        autoAdvanceCountdownRef.current -= 1;
        setAutoAdvanceCountdown(autoAdvanceCountdownRef.current);
        if (autoAdvanceCountdownRef.current <= 0) {
          if (autoAdvanceTimerRef.current) {
            clearInterval(autoAdvanceTimerRef.current);
            autoAdvanceTimerRef.current = null;
          }
          setAutoAdvance(null);
          handleNext();
        }
      }, 1000);
    },
    [handleNext],
  );

  const handleAutoAdvanceNow = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setAutoAdvance(null);
    handleNext();
  }, [handleNext]);

  const handleCancelAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setAutoAdvance(null);
    setShowReplay(true);
  }, []);

  const handleSeek = useCallback(
    (pct: number) => {
      // V6 3.2.1: clamp + guard against divide-by-zero / live-stream seek.
      // The previous implementation did `pct * (getDuration() ?? 1)` which
      // produces 0 for live streams (duration=0, nullish coalescing does NOT
      // fire on 0) and silently sent the user back to the start.
      const duration = MpvPlayer.getDuration?.() ?? 0;
      if (duration <= 0) {
        // Live or not-yet-loaded — block arbitrary seek.
        // The toast is best-effort: if toast is unavailable (e.g. during
        // a hook teardown) we just bail silently.
        try {
          toast.show('Live stream — seeking not available', 'info', 1800);
        } catch {
          // ignored
        }
        return;
      }
      const clampedPct = Math.max(0, Math.min(1, pct));
      const target = clampedPct * duration;
      isSeeking.current = true;
      MpvPlayer.seekTo(target);
      setTimeout(() => {
        isSeeking.current = false;
      }, 200);
    },
    [toast],
  );

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

  // ── Tolerance window for "is the playhead currently sitting on a
  //    bookmark?". The save handler rounds the position to the nearest
  //    integer, and playhead seeks can land a few ms off, so 2 seconds of
  //    slack keeps the filled/unfilled state from flickering when the
  //    user is right at a saved frame.
  const BOOKMARK_MATCH_TOLERANCE_S = 2;

  // Find the bookmark for the current position (if any). Used both for
  // the toggle action and the icon state.
  const findBookmarkAtPosition = useCallback(
    (position: number) => {
      if (!bookmarksForFile || bookmarksForFile.length === 0) return null;
      return (
        bookmarksForFile.find(
          b => Math.abs(b.position - position) <= BOOKMARK_MATCH_TOLERANCE_S,
        ) ?? null
      );
    },
    [bookmarksForFile],
  );

  // Quick-toggle: tap the bookmark icon to add at the current position,
  // tap again to remove the existing bookmark at the current position.
  // Long-press still opens the full BookmarkSheet via the TopBar.
  const handleToggleBookmark = useCallback(() => {
    // Use the ref so the toggle always reflects the *latest* playhead
    // position even if React hasn't flushed the position-tick state yet.
    const uri = fileUriRef.current;
    if (!uri) {
      try {
        toast.show('No video loaded — cannot bookmark', 'error', 2000);
      } catch {}
      return;
    }
    const position = currentPositionRef.current;
    const duration = MpvPlayer.getDuration?.() ?? 0;
    if (position < 1) {
      try {
        toast.show('Cannot bookmark at the start of the video', 'info', 2000);
      } catch {}
      return;
    }

    const existing = findBookmarkAtPosition(position);
    if (existing) {
      // ── Remove ──
      removeBookmarkEntry(existing.id);
      try {
        toast.show('Bookmark removed', 'info', 1500);
      } catch {}
      try {
        haptics.light();
      } catch {}
      return;
    }

    // ── Add ──
    addBookmarkEntry({
      fileUri: uri,
      title: titleRef.current,
      position,
      duration,
      label: '',
      mediaType: getMediaType(uri),
      source: routeSourceRef.current,
      thumbnailPath: (() => {
        try {
          const thumb = MpvPlayer.captureThumbnail(uri);
          return thumb ? `file://${thumb}?t=${Date.now()}` : undefined;
        } catch {
          return undefined;
        }
      })(),
    });
    try {
      const minutes = Math.floor(position / 60);
      const seconds = Math.floor(position % 60)
        .toString()
        .padStart(2, '0');
      toast.show(`Bookmark saved at ${minutes}:${seconds}`, 'success', 1800);
    } catch {}
    try {
      haptics.medium();
    } catch {}
  }, [addBookmarkEntry, removeBookmarkEntry, findBookmarkAtPosition, toast, haptics]);

  // Derived flag: is the playhead currently sitting on a bookmark?
  const isBookmarkedAtCurrentPosition = useMemo(
    () => findBookmarkAtPosition(currentPosition) !== null,
    [findBookmarkAtPosition, currentPosition],
  );

  // ── Gesture handlers ──
  const handleDoubleTapLeft = useCallback(() => {
    if (controlsLocked) return;
    // V6 3.2.2: also block ±10s gestures on live streams — they'd clamp
    // to 0 (because getDuration() is 0) and the user sees a confusing
    // no-op seek.
    const duration = MpvPlayer.getDuration?.() ?? 0;
    if (duration <= 0) return;
    const target = Math.max(0, (MpvPlayer.getPosition?.() ?? 0) - 10);
    MpvPlayer.seekTo(target);
    setSeekSide('left');
    setSeekFeedbackVisible(true);
    // V6 9.1.2: light haptic on ±10s seek
    try {
      haptics.light();
    } catch {}
    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
    overlayHideTimer.current = setTimeout(() => setSeekFeedbackVisible(false), 1000);
  }, [controlsLocked, haptics]);

  const handleDoubleTapRight = useCallback(() => {
    if (controlsLocked) return;
    // V6 3.2.2: see note in handleDoubleTapLeft
    const duration = MpvPlayer.getDuration?.() ?? 0;
    if (duration <= 0) return;
    const target = Math.min(duration, (MpvPlayer.getPosition?.() ?? 0) + 10);
    MpvPlayer.seekTo(target);
    setSeekSide('right');
    setSeekFeedbackVisible(true);
    // V6 9.1.2: light haptic on ±10s seek
    try {
      haptics.light();
    } catch {}
    if (overlayHideTimer.current) clearTimeout(overlayHideTimer.current);
    overlayHideTimer.current = setTimeout(() => setSeekFeedbackVisible(false), 1000);
  }, [controlsLocked, haptics]);

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

  // ── Share (56.4): deep link + https fallback for the current video ──
  const handleShare = useCallback(() => {
    const uri = fileUriRef.current;
    shareContent({
      route: 'VideoPlayer',
      params: uri ? {fileUri: uri, fileTitle: titleRef.current ?? ''} : undefined,
      title: titleRef.current ?? 'Video',
    });
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
  }, [controlsLocked]);

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
  }, [controlsLocked]);

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
    const px = size === 'small' ? 22 : size === 'large' ? 38 : 30;
    MpvPlayer.setProperty('sub-font-size', px);
    dispatch(setSliceSubtitleFontSize(px));
    saveSubtitleSettings({fontSize: size});
  }, [dispatch]);

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
    dispatch(setSliceSubtitleTextColor(color));
    saveSubtitleSettings({textColor: color});
  }, [dispatch]);

  const handleBgOpacityChange = useCallback((opacity: number) => {
    setSubtitleBgOpacity(opacity);
    MpvPlayer.setProperty('sub-bg-opacity', opacity);
    dispatch(setSliceSubtitleBgOpacity(opacity));
    saveSubtitleSettings({bgOpacity: opacity});
  }, [dispatch]);

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
    const next = [...eqGains];
    next[index] = value;
    dispatch(setEqGains(next));
    if (eqEnabled) {
      MpvPlayer.setProperty('af', buildAfFilter(next, dialogueBoost));
    }
  }, [eqGains, eqEnabled, dialogueBoost, dispatch]);

  const handleApplyPreset = useCallback((name: string) => {
    const preset = EQ_PRESETS[name];
    if (!preset) return;
    dispatch(setEqPreset(name));
    dispatch(setEqGains([...preset]));
    if (eqEnabled) {
      MpvPlayer.setProperty('af', buildAfFilter(preset, dialogueBoost));
    }
  }, [eqEnabled, dialogueBoost, dispatch]);

  const handleResetEq = useCallback(() => {
    dispatch(setEqGains([...FLAT]));
    dispatch(setEqPreset('Flat'));
    MpvPlayer.setProperty('af', '');
    dispatch(setEqEnabled(false));
  }, [dispatch]);

  const handleToggleEq = useCallback(() => {
    const next = !eqEnabled;
    dispatch(setEqEnabled(next));
    MpvPlayer.setProperty('af', next ? buildAfFilter(eqGains, dialogueBoost) : '');
  }, [eqEnabled, eqGains, dialogueBoost, dispatch]);

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
      // 31.6: friendly non-blocking toast instead of a raw Alert
      toast.show('Could not add this file to the playlist.', 'error');
    }
  }, [dispatch, playlist.length, toast]);

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
            // 150ms ready-delay: matches the initial-mount behaviour and
            // lets MPV settle before we hit setProperty/loadfile.
            setTimeout(() => {
              try {
                MpvPlayer.setProperty(
                  'slang',
                  subtitleSliceRef.current.languages,
                );
                MpvPlayer.setProperty(
                  'sub-bg-opacity',
                  subtitleSliceRef.current.bgOpacity,
                );
                if (highContrastRef.current) {
                  MpvPlayer.setProperty('sub-color', DEFAULT_SUBTITLE_COLOR);
                  MpvPlayer.setProperty('sub-bg-opacity', '0.9');
                }
              } catch (e) {
                // setProperty may fail if MPV is still warming up; ignore.
              }
              MpvPlayer.loadFile(playableUri);
              // V6 2.3.2: same auto-play fix as the initial-mount path.
              // Without this, Retry just loaded the file and waited for
              // the user to tap play again.
              MpvPlayer.resume();
            }, 150);
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

  // ── Toggle rotate (Netflix-grade: actually rotates the device) ──
  const handleToggleRotate = useCallback(() => {
    setIsLandscape(p => {
      const next = !p;
      if (next) {
        lockToLandscape();
      } else {
        lockToPortrait();
      }
      StatusBar.setHidden(next, 'fade');
      return next;
    });
  }, []);

  // V6 2.3.1: Removed the nativePtr reset trick. The previous
  // `setNativePtr(0) → setTimeout → setNativePtr(ptr)` re-attached the
  // surface by force, but it caused a visible ~50ms black flash on every
  // rotate (the TextureView briefly unmounts and remounts).
  //
  // The native MpvRenderView now handles resize itself: its
  // onSurfaceTextureSizeChanged callback fires whenever React Native
  // re-lays-out the view (which happens automatically when the orientation
  // changes and the parent dimensions update). The callback forwards the
  // new width/height to mpv via MPVLib.nativeSurfaceChanged, which is
  // all MPV needs to redraw into the new viewport.
  //
  // No effect needed here — just let the natural layout pass propagate.

  // ── On unmount: always restore portrait so we don't strand the user in landscape ──
  useEffect(() => {
    return () => {
      try {
        lockToPortrait();
        StatusBar.setHidden(false, 'fade');
      } catch {}
    };
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
    // P33: snapshot the route source so the cleanup dispatch stays stable
    const routeSourceSnapshot = routeSourceRef.current;

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
        if (!isRemoteUri(playableUri)) {
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
          // Brief ready-delay: gives MPV time to fully spin up its event
          // loop and internal state before we issue loadfile/setProperty.
          // Without this the very first load often races MPV and surfaces
          // as "File Not Found" even when the URL is valid.
          setTimeout(() => {
            // V6 1.2.3: bail if component unmounted before timer fires
            if (cancelled || !isMountedRef.current) return;
            try {
              MpvPlayer.setProperty(
                'slang',
                subtitleSliceRef.current.languages,
              );
              MpvPlayer.setProperty(
                'sub-bg-opacity',
                subtitleSliceRef.current.bgOpacity,
              );
              if (highContrastRef.current) {
                MpvPlayer.setProperty('sub-color', DEFAULT_SUBTITLE_COLOR);
                MpvPlayer.setProperty('sub-bg-opacity', '0.9');
              }
            } catch (e) {
              // setProperty may fail if MPV is still warming up; ignore.
            }
            MpvPlayer.loadFile(playableUri);
            // V6 2.3.2: auto-play as soon as the file is loaded. mpv's
            // loadfile command leaves the player paused by default, which
            // caused the player to sit at 0:00 with the yellow play button
            // visible until the user manually tapped play. Calling resume()
            // right after loadfile starts playback so the video begins
            // rolling immediately, matching the obvious user expectation
            // for a "tap movie → watch" flow.
            MpvPlayer.resume();

            // Capture thumbnail after the file has had a moment to load
            setTimeout(() => {
              // V6 1.2.3: bail if component unmounted before timer fires
              if (cancelled || !isMountedRef.current) return;
              try {
                const thumb = MpvPlayer.captureThumbnail(playableUri);
                if (thumb) {
                  dispatch(
                    savePlaybackPosition({
                      fileUri: playableUri,
                      title: titleRef.current,
                      position: 0,
                      duration: MpvPlayer.getDuration() || 0,
                      thumbnailPath: 'file://' + thumb,
                      mediaType: getMediaType(playableUri),
                      source:
                        routeSourceRef.current ?? sourceFromUri(playableUri),
                    }),
                  );
                }
              } catch (e) {
                logger.warn('Thumbnail capture failed', e);
              }
            }, 2000);
          }, 150);
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
              source: routeSourceSnapshot ?? sourceFromUri(curUri),
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
            source: routeSourceRef.current ?? sourceFromUri(fileUri ?? ''),
          }),
        );
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fileUri, rememberPosition, dispatch]);

  // ── 51.3: keep the media notification in sync with playback ──
  useEffect(() => {
    if (!isReady || !fileUri) return;
    const interval = setInterval(() => {
      if (!notificationsEnabledRef.current) return;
      NotificationService.update(
        {
          title: titleRef.current ?? 'Untitled',
          artist: trackMetaRef.current.artist,
          album: trackMetaRef.current.album,
          fileUri,
          artworkPath: trackMetaRef.current.albumArtUri || fileUri,
          mediaType: 'video',
        },
        {
          position: MpvPlayer.getPosition?.() ?? 0,
          duration: MpvPlayer.getDuration?.() ?? 1,
          isPlaying: MpvPlayer.getPlaybackState() === 'playing',
        },
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [isReady, fileUri]);

  // ── Android back button ──
  const backPressCountRef = useRef(0);
  const backPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onBackPress = () => {
      if (controlsLocked) {
        toast.show('Lock to unlock controls', 'info', 1500);
        return true;
      }

      if (navigation.canGoBack()) {
        handleGoBack();
        return true;
      }

      // V5: player opened as initial route — prompt before exit instead of
      // silently killing the app
      backPressCountRef.current += 1;

      if (backPressCountRef.current === 1) {
        toast.show('Press back again to exit', 'info', 2000);

        if (backPressTimerRef.current) {
          clearTimeout(backPressTimerRef.current);
        }
        backPressTimerRef.current = setTimeout(() => {
          backPressCountRef.current = 0;
        }, 2000);

        return true; // consume — don't exit yet
      }

      // Second press within 2s — exit
      if (backPressTimerRef.current) {
        clearTimeout(backPressTimerRef.current);
      }
      BackHandler.exitApp();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
      if (backPressTimerRef.current) {
        clearTimeout(backPressTimerRef.current);
      }
    };
  }, [handleGoBack, controlsLocked, navigation, toast]);

  // ── Mpv event subscriptions ──
  useEffect(() => {
    if (!isReady) return;

    const unsubPos = MpvPlayer.on('onPositionChanged', ({position: pos}) => {
      if (!isSeeking.current) {
        pushPositionRef.current(pos);
      }
      // Mirror position locally so the bookmark icon can reflect the
      // bookmarked state at the current playback position.
      currentPositionRef.current = pos;
      setCurrentPositionState(pos);

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

    // 52.4: "video truly loaded" signal. MPV_VIDEO_RECONFIG fires when the
    // decoder produces a frame pipeline — i.e. the surface is about to present
    // the first frame. Hiding the loader any earlier reveals the white
    // TextureView before the first frame is drawn.
    const unsubVideoReconfig = MpvPlayer.on('videoReconfig', () => {
      if (
        loadingPhaseRef.current !== 'ready' &&
        resumeTargetRef.current == null &&
        !resumeSeekDone.current
      ) {
        setLoadingPhase('ready');
      }
    });

    const unsubVol = MpvPlayer.on('onVolumeChanged', ({volume: vol}) => {
      setVolume(vol);
      setMuted(MpvPlayer.isMuted?.() ?? vol <= 0);
    });
    const unsubSpeed = MpvPlayer.on('onSpeedChanged', ({speed: nextSpeed}) => {
      setSpeed(nextSpeed);
    });

    const unsubFile = MpvPlayer.on('onFileLoaded', () => {
      // Clear any transient error from a previous failed attempt — if
      // MPV just loaded a file, we're past the failure state.
      setError(null);
      setErrorIsPermission(false);
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
          source: routeSourceRef.current ?? sourceFromUri(fileUriRef.current ?? ''),
        }),
      );

      const explicitPosition = requestedStartPosition ?? 0;
      const savedPosition = savedEntry?.position ?? 0;
      if (explicitPosition > 0) {
        // Explicit navigation intent (e.g. Continue Watching) — silent seek
        setLoadingPhase('seeking');
        MpvPlayer.pause();
        setTimeout(() => {
          MpvPlayer.seekTo(explicitPosition);
          resumeTargetRef.current = explicitPosition;
        }, 300);

        loadingFallbackTimer.current = setTimeout(() => {
          if (resumeTargetRef.current != null) {
            resumeTargetRef.current = null;
            resumeSeekDone.current = true;
            setLoadingPhase('ready');
            MpvPlayer.resume();
          }
        }, 2500);
      } else if (savedPosition > 0) {
        // 31.2: implicit resume — ask the user instead of silent auto-seek
        setLoadingPhase('ready');
        MpvPlayer.pause();
        setResumePrompt({position: savedPosition});
      } else {
        // Safety net only — normally `videoReconfig` flips the phase to
        // 'ready' the moment the first frame pipeline exists. This 1.5s
        // timer guards streams that never emit video-reconfig (e.g. audio-only)
        // without ever masking the white TextureView behind a premature reveal.
        loadingFallbackTimer.current = setTimeout(() => {
          if (loadingPhaseRef.current !== 'ready') {
            setLoadingPhase('ready');
          }
        }, 1500);
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
            // V6 1.2.3: bail if component unmounted during async load
            if (!isMountedRef.current) return;
            if (meta) {
              setCurrentTrackMetadata(meta);
              trackMetaRef.current = {
                artist: meta.artist || '',
                album: meta.album || '',
                albumArtUri: meta.albumArtUri || '',
              };
            }
            // Start foreground notification with available metadata
            // 51.3: gated by the user preference
            if (notificationsEnabledRef.current) {
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
            }
          })
          .catch(() => {
            // Start notification with fallback metadata anyway
            // 51.3: also gated by the user preference
            if (notificationsEnabledRef.current) {
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
            }
          });
      }
    });

    const unsubEnd = MpvPlayer.on('onEndReached', () => {
      // 31.9: at video end, hand off straight into the audio player when the
      // next queue item is audio (playback continues without a replay stop).
      const nextIdx = currentIndex + 1;
      const nextEntry = playlist[nextIdx];
      // P34.4: mediaType wins for extensionless remote URLs
      if (
        nextEntry &&
        (nextEntry.mediaType ?? getMediaType(nextEntry.uri)) === 'audio'
      ) {
        dispatch(nextTrack());
        navigation.replace('AudioPlayer', {
          fileUri: nextEntry.uri,
          fileTitle: nextEntry.title,
          source: nextEntry.source,
        });
        return;
      }
      if (nextEntry) {
        // 31.3: show "Up Next in 5s" countdown card before auto-advancing
        startAutoAdvance(nextEntry);
        return;
      }
      setShowReplay(true);
    });

    const unsubBuffering = MpvPlayer.on('onBuffering', ({percent}) => {
      const pct = Math.min(Math.max(percent, 0), 100);
      setIsBuffering(pct > 0 && pct < 100);
      setBufferedPercent(pct / 100);
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
      unsubVideoReconfig();
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
  }, [isReady, savedEntry, requestedStartPosition, dispatch, handlePlayPause, handleNext, handlePrev, handleGoBack, controlsLocked, playlist, currentIndex, navigation, startAutoAdvance]);

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

    // P36.5: live playback (IPTV) — LIVE badge + channel up/down
    // V6 3.1.2: also treat HLS streams (m3u8) as potentially live until
    // MPV reports a real duration. Without this, a live HLS broadcast shows
    // 0 duration for several seconds and the user sees a seek bar pointing
    // nowhere.
    isLive:
      isReady &&
      (playerDuration <= 0 || classifyStreamType(fileUri) === 'hls'),
    channelUp: liveChannels ? () => handleChannelSwitch(1) : undefined,
    channelDown: liveChannels ? () => handleChannelSwitch(-1) : undefined,

    // Core playback state
    secondaryVisible,
    setSecondaryVisible,
    controlsLocked,
    resumePrompt,
    autoAdvance,
    autoAdvanceCountdown,
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
    bookmarksForFile,
    bookmarkCountForFile,
    isBuffering,
    /** V5: buffered fraction for SeekBar visualization */
    bufferedPercent,
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
    // V6 9.3.5: expose thumbnail for SeekBar scrub preview.
    currentThumbnailPath,

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
    handleToggleLock: () => {},
    handleResumeChoice,
    handleAutoAdvanceNow,
    handleCancelAutoAdvance,
    handlePrev,
    handleNext,
    handleSeek,
    handleChapterSeek,

    // Volume handlers
    handleVolumeChange,
    handleToggleMute,
    handleVolumeValueChange,
    handleSpeedSelect,
    triggerShrinkAndEnterPip,
    handleToggleBookmark,
    isBookmarkedAtCurrentPosition,
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
    handleShare,
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

    // 46.1: accessibility
    controlScale,
  };
}