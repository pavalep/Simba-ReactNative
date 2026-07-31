import {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {BackHandler} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {useAppDispatch, useAppSelector} from '../../../store';
import {logError} from '../../../lib/errorLogger';
import {MpvPlayer} from '../../../native';
import {NotificationService} from '../../../services/notificationService';
import {RootStackScreenProps} from '../../../navigation/types';
import {useHaptics} from '../../../hooks/useHaptics';
import {savePlaybackPosition} from '../../../store/slices/sessionSlice';
import {useBookmarks} from '../../../hooks/useBookmarks';
import {
  addToPlaylist,
  removeFromPlaylist,
  playFromPlaylist,
  removeFromQueue,
  reorderQueue,
  prependToQueue,
  addToQueue,
  nextTrack,
  setLoopMode,
  toggleShuffle,
  setPlaybackState,
  playFile,
  setQueueSelection,
  clearQueueSelection,
  removeSelectedFromQueue,
  moveSelectedToTop,
  clearAll,
  PlaylistEntry,
} from '../../../store/slices/playerSlice';
import {
  pickMediaFile,
  getFileName,
  validateMediaFile,
} from '../../../services/fileService';
import {readTrackMetadata, EMPTY_METADATA, TrackMetadata} from '../../../services/metadataService';
import {loadLrc} from '../../../services/lrcService';
import type {LrcLine} from '../../../utils/lrcParser';
import {selectAllTracks} from '../../../store/slices/mediaSlice';
import type {ScannedTrack} from '../../../store/slices/mediaSlice';
import type {Chapter} from '../../../components/player/NowPlayingInfo/ChapterList';

type Props = RootStackScreenProps<'AudioPlayer'>;

export function useAudioPlayerScreen(
  navigation: Props['navigation'],
  route: Props['route'],
) {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const dispatch = useAppDispatch();

  // ── Route params ──
  const title = route.params?.fileTitle ?? 'Unknown Track';
  const fileUri = route.params?.fileUri ?? null;

  // ── Core playback state ──
  const [isLoading, setIsLoading] = useState(true);
  const [volume, setVolume] = useState(65);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorIsPermission, setErrorIsPermission] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Metadata & chapters state ──
  const [metadata, setMetadata] = useState<TrackMetadata>(EMPTY_METADATA);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lyrics, setLyrics] = useState<LrcLine[]>([]);

  // ── Modal state ──
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [playlistSheetVisible, setPlaylistSheetVisible] = useState(false);
  const [userPlaylistSheetVisible, setUserPlaylistSheetVisible] = useState(false);
  const [queueSheetVisible, setQueueSheetVisible] = useState(false);
  const [queueMultiSelect, setQueueMultiSelect] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Bookmark state ──
  const [bookmarkSheetVisible, setBookmarkSheetVisible] = useState(false);
  const {
    bookmarksForFile: audioBookmarksForFile,
    bookmarkCountForFile: audioBookmarkCount,
    add: addAudioBookmark,
    remove: removeAudioBookmark,
  } = useBookmarks(fileUri ?? undefined);

  const handleOpenBookmarkSheet = useCallback(() => {
    setBookmarkSheetVisible(true);
  }, []);

  const handleCloseBookmarkSheet = useCallback(() => {
    setBookmarkSheetVisible(false);
  }, []);

  const handleBookmarkAdd = useCallback(
    (label?: string) => {
      const uri = fileUriRef.current;
      if (!uri) return;
      const position = MpvPlayer.getPosition?.() ?? 0;
      const dur = MpvPlayer.getDuration?.() ?? 0;
      if (position < 1) return;
      addAudioBookmark({
        fileUri: uri,
        title,
        position,
        duration: dur,
        label: label ?? '',
        mediaType: 'audio',
      });
    },
    [addAudioBookmark, title],
  );

  const handleBookmarkDelete = useCallback(
    (id: string) => {
      removeAudioBookmark(id);
    },
    [removeAudioBookmark],
  );

  const handleBookmarkJumpTo = useCallback((position: number) => {
    try {
      MpvPlayer.seekTo(position);
    } catch {}
  }, []);

  // ── Playlist state from Redux ──
  const playlist = useAppSelector(state => state.player.playlist);
  const queue = useAppSelector(state => state.player.queue);
  const currentFile = useAppSelector(state => state.player.currentFile);
  const currentIndex = useAppSelector(state => state.player.currentIndex);
  const loopMode = useAppSelector(state => state.player.loopMode);
  const shuffle = useAppSelector(state => state.player.shuffle);
  const playbackHistory = useAppSelector(state => state.player.playbackHistory);
  const selectedQueueIndices = useAppSelector(state => state.player.selectedQueueIndices);
  const allTracks = useAppSelector(selectAllTracks);
  const sessionRecent = useAppSelector(state => state.session.recentFiles);
  const sessionRecentRef = useRef(sessionRecent);
  const duration = MpvPlayer.getDuration?.() ?? 1;

  // ── Refs ──
  const isSeeking = useRef(false);
  const fileUriRef = useRef<string | undefined>(fileUri);
  const playbackSpeedRef = useRef(1.0);

  // ── Sync refs ──
  useEffect(() => { fileUriRef.current = fileUri; }, [fileUri]);
  useEffect(() => { sessionRecentRef.current = sessionRecent; }, [sessionRecent]);

  // ── Playback speed (persisted in playerSlice) ──
  const playbackSpeed = useAppSelector(state => state.player.playbackSpeed);
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // ── Derive related tracks for InfoSheet ──
  const relatedTracks = useMemo(() => {
    if (allTracks.length === 0) return [];
    const {artist, album} = metadata;
    if (!artist && !album) return [];
    return allTracks.filter(
      t =>
        (artist && t.artist === artist) ||
        (album && t.album === album),
    );
  }, [metadata, allTracks]);

  // ══════════════════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════════════════

  // ── Init player on mount ──
  useEffect(() => {
    let cancelled = false;
    let unsubLoaded: (() => void) | null = null;

    (async () => {
      if (!fileUri) {
        setError('No file URI provided.');
        setIsLoading(false);
        logError({code: 'ERR_NO_FILE', message: 'No file URI provided.', source: 'AudioPlayerScreen'});
        return;
      }

      try {
        const validation = await validateMediaFile(fileUri);
        if (cancelled) return;
        if (!validation.valid) {
          setError(validation.title);
          setIsLoading(false);
          logError({
            code: 'ERR_FILE_INVALID',
            message: validation.message,
            detail: validation.detail || '',
            source: 'AudioPlayerScreen',
          });
          if (validation.title === 'Permission Denied') {
            setErrorIsPermission(true);
          }
          return;
        }
      } catch {
        logError({code: 'ERR_VALIDATE_FAIL', message: 'File validation threw unexpectedly', source: 'AudioPlayerScreen'});
      }

      try {
        const ok = MpvPlayer.initPlayer();
        if (cancelled) return;
        if (!ok) {
          setError('Failed to initialize audio player.');
          setIsLoading(false);
          logError({code: 'ERR_INIT_FAIL', message: 'Failed to initialize audio player.', source: 'AudioPlayerScreen'});
          return;
        }

        MpvPlayer.loadFile(fileUri);

        // Re-apply the persisted playback speed (mpv resets to 1.0 on load)
        try {
          MpvPlayer.setSpeed(playbackSpeedRef.current);
        } catch {}

        // Restore the saved playback position once the file loads.
        // Covers reopening from MiniAudioPlayer mid-track (resume, not restart).
        let initialLoadDone = false;
        unsubLoaded = MpvPlayer.on('onFileLoaded', () => {
          if (cancelled || initialLoadDone) return;
          initialLoadDone = true;
          const saved = sessionRecentRef.current.find(f => f.fileUri === fileUri);
          const resumePosition = saved?.position ?? 0;
          if (resumePosition > 0) {
            setTimeout(() => {
              try { MpvPlayer.seekTo(resumePosition); } catch {}
            }, 200);
          }
        });

        setIsReady(true);
        setIsLoading(false);

        // Track the file in Redux so MiniAudioPlayer persists after back
        dispatch(playFile({uri: fileUri, title, duration: 0}));
      } catch (e) {
        if (!cancelled) {
          setError('Player initialization failed.');
          setIsLoading(false);
          logError({code: 'ERR_INIT_EXCEPTION', message: String(e), source: 'AudioPlayerScreen'});
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubLoaded?.();
    };
  }, [fileUri, title, dispatch]);

  // ── Load metadata, chapters, and lyrics when file loads ──
  useEffect(() => {
    if (!isReady || !fileUri) return;

    let cancelled = false;

    (async () => {
      try {
        const meta = await readTrackMetadata(fileUri);
        if (!cancelled) setMetadata(meta);

        NotificationService.start(
          {
            title: meta.title || title || 'Unknown Track',
            artist: meta.artist || '',
            album: meta.album || '',
            fileUri,
            artworkPath: meta.albumArtUri || '',
            mediaType: 'audio',
          },
          {
            position: MpvPlayer.getPosition?.() ?? 0,
            duration: MpvPlayer.getDuration?.() ?? 1,
            isPlaying: MpvPlayer.getPlaybackState() === 'playing',
          },
        );

        try {
          const chaptersJson = MpvPlayer.getProperty('chapter-list');
          if (chaptersJson && !cancelled) {
            const rawChapters: Array<{title?: string; time: number}> = JSON.parse(String(chaptersJson));
            if (Array.isArray(rawChapters) && rawChapters.length > 0) {
              const dur = MpvPlayer.getDuration?.() ?? 1;
              const parsed: Chapter[] = rawChapters.map((ch, i, arr) => ({
                title: ch.title || `Chapter ${i + 1}`,
                startTime: ch.time,
                endTime: i < arr.length - 1 ? arr[i + 1].time : dur,
              }));
              if (!cancelled) setChapters(parsed);
            }
          }
        } catch {}

        try {
          const lrcResult = await loadLrc(fileUri);
          if (lrcResult && !cancelled) {
            setLyrics(lrcResult.lines);
          }
        } catch {}
      } catch {
        NotificationService.start(
          {
            title: title || 'Unknown Track',
            artist: '',
            album: '',
            fileUri,
            artworkPath: '',
            mediaType: 'audio',
          },
          {position: 0, duration: MpvPlayer.getDuration?.() ?? 1, isPlaying: false},
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, fileUri, title]);

  // ── Retry chapter loading after duration is known ──
  useEffect(() => {
    if (!isReady || duration <= 1 || chapters.length > 0) return;
    setChapters(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.endTime === duration && last.endTime !== 0) return prev;
      return prev.map((ch, i, arr) => ({
        ...ch,
        endTime: i < arr.length - 1 ? arr[i + 1].startTime : duration,
      }));
    });
  }, [isReady, duration, chapters.length]);

  // ── Hardware back ──
  useEffect(() => {
    const handler = () => {
      handleGoBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ══════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
    } catch {
      setError('Failed to refresh player.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleGoBack = useCallback(() => {
    const curUri = fileUriRef.current;
    const curPos = MpvPlayer.getPosition?.() ?? 0;
    const curDur = MpvPlayer.getDuration?.() ?? 0;

    if (curUri) {
      dispatch(
        savePlaybackPosition({
          fileUri: curUri,
          title,
          position: curPos,
          duration: curDur,
          thumbnailPath: '',
          mediaType: 'audio',
        }),
      );
    }

    // Keep the file loaded so MiniAudioPlayer can control it after back;
    // pause (not stop) so the mini player's state matches the native player.
    try { MpvPlayer.pause(); } catch {}
    dispatch(setPlaybackState('paused'));
    NotificationService.stop();

    navigation.goBack();
  }, [dispatch, navigation, title]);

  const handlePlayPause = useCallback(() => {
    try {
      if (MpvPlayer.getPlaybackState() === 'playing') {
        MpvPlayer.pause();
      } else {
        MpvPlayer.resume();
      }
    } catch {}
    haptics.medium();
  }, [haptics]);

  const handlePrev = useCallback(() => {
    MpvPlayer.seekTo(0);
  }, []);

  const handleNext = useCallback(() => {
    if (playlist.length > 0 && currentIndex < playlist.length - 1) {
      const nextIdx = currentIndex + 1;
      dispatch(nextTrack());
      const entry = playlist[nextIdx];
      if (entry) MpvPlayer.loadFile(entry.uri);
    } else {
      const dur = MpvPlayer.getDuration?.() ?? 0;
      MpvPlayer.seekTo(dur);
    }
  }, [playlist, currentIndex, dispatch]);

  const handleSeek = useCallback((pct: number) => {
    isSeeking.current = true;
    const dur = MpvPlayer.getDuration?.() ?? 1;
    const target = pct * dur;
    MpvPlayer.seekTo(target);
    setTimeout(() => { isSeeking.current = false; }, 200);
  }, []);

  const handleVolumeChange = useCallback((delta: number) => {
    setVolume(prev => {
      const next = Math.max(0, Math.min(100, prev + delta));
      try { MpvPlayer.setProperty('volume', next); } catch {}
      return next;
    });
  }, []);

  const handleSeekToLyric = useCallback((time: number) => {
    try {
      MpvPlayer.seekTo(time);
    } catch {}
  }, []);

  // ── Apply playback speed live from the store (sleep/speed UI) ──
  useEffect(() => {
    if (!isReady) return;
    try {
      MpvPlayer.setSpeed(playbackSpeed);
    } catch {}
  }, [playbackSpeed, isReady]);

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
    } catch {}
  }, [dispatch, playlist.length]);

  const handleRemoveFromPlaylist = useCallback((index: number) => {
    dispatch(removeFromPlaylist(index));
  }, [dispatch]);

  const handlePlayFromPlaylist = useCallback((index: number) => {
    const entry = playlist[index];
    if (!entry) return;
    dispatch(playFromPlaylist(index));
    MpvPlayer.loadFile(entry.uri);
  }, [dispatch, playlist]);

  // ── Queue management ──
  const handleQueueMoveItem = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= queue.length) return;
    dispatch(reorderQueue({fromIndex, toIndex}));
  }, [dispatch, queue.length]);

  const handleQueueRemoveItem = useCallback((index: number) => {
    dispatch(removeFromQueue(index));
  }, [dispatch]);

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

  // ── InfoSheet callbacks ──
  const handleInfoAddToPlaylist = useCallback(() => {
    setInfoSheetVisible(false);
    setTimeout(() => setUserPlaylistSheetVisible(true), 350);
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

  // ── Notification action event subscriptions ──
  useEffect(() => {
    const unsubPlayPause = NotificationService.onPlayPause(() => {
      handlePlayPause();
    });
    const unsubNext = NotificationService.onNext(() => {
      handleNext();
    });
    const unsubPrev = NotificationService.onPrevious(() => {
      handlePrev();
    });
    const unsubStop = NotificationService.onStop(() => {
      handleGoBack();
    });
    const unsubSeek = NotificationService.onSeekTo((pos: number) => {
      MpvPlayer.seekTo(pos);
    });

    return () => {
      unsubPlayPause();
      unsubNext();
      unsubPrev();
      unsubStop();
      unsubSeek();
    };
  }, [handlePlayPause, handleNext, handlePrev, handleGoBack]);

  const handleRetry = useCallback(() => {
    setError(null);
    setErrorIsPermission(false);
    setIsReady(false);
    setIsLoading(true);
  }, []);

  return {
    // Theme
    colors,
    isDark,
    insets,
    dispatch,

    // Route
    title,
    fileUri,

    // State
    isLoading,
    isReady,
    error,
    errorIsPermission,
    refreshing,
    volume,
    metadata,
    chapters,
    lyrics,
    infoSheetVisible,
    playlistSheetVisible,
    userPlaylistSheetVisible,
    queueSheetVisible,
    queueMultiSelect,
    isPlaying,
    relatedTracks,

    // Bookmark state
    bookmarkSheetVisible,
    audioBookmarksForFile,
    audioBookmarkCount,

    // Redux
    playlist,
    queue,
    currentFile: currentFile?.uri ?? null,
    currentIndex,
    loopMode,
    shuffle,
    playbackHistory,
    selectedQueueIndices,

    // Setters
    setInfoSheetVisible,
    setPlaylistSheetVisible,
    setUserPlaylistSheetVisible,
    setQueueSheetVisible,
    setQueueMultiSelect,
    setChapters,
    setError,
    setIsLoading,
    setRefreshing,
    setIsPlaying,

    // Handlers
    onRefresh,
    handleGoBack,
    handlePlayPause,
    handlePrev,
    handleNext,
    handleSeek,
    handleVolumeChange,
    handleSeekToLyric,
    handleToggleShuffle,
    handleToggleLoop,
    handleAddToPlaylist,
    handleRemoveFromPlaylist,
    handlePlayFromPlaylist,
    handleQueueMoveItem,
    handleQueueRemoveItem,
    handleQueueSelectItem,
    handleSelectQueueItem,
    handleSelectHistoryItem,
    handlePlayNext,
    handleAddToQueue,
    handleEnterMultiSelect,
    handleExitMultiSelect,
    handleToggleSelection,
    handleRemoveSelected,
    handleMoveSelectedToTop,
    handleClearAll,
    handleInfoAddToPlaylist,
    handlePlayRelatedTrack,
    handleRetry,

    // Bookmark handlers
    handleOpenBookmarkSheet,
    handleCloseBookmarkSheet,
    handleBookmarkAdd,
    handleBookmarkDelete,
    handleBookmarkJumpTo,
  };
}
