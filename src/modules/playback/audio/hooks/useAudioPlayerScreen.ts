import {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {Alert, BackHandler} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../../theme';
import {useAppDispatch, useAppSelector} from '../../../../store';
import {logError} from '../../../../lib/errorLogger';
import {logger} from '../../../../lib/logger';
import {MpvPlayer} from '../../../../native';
import {NotificationService} from '../../../../services/notificationService';
import {
  applyAudioSettingsToMpv,
  applyPlaybackSettingsToMpv,
} from '../../../../services/audioSettingsService';
import type {AudioPlaybackParams, PlaybackNavigation} from '../../types';

import {useHaptics} from '../../../../hooks/useHaptics';
import {useRecentHistory} from '../../../../features/recentHistory';
import {useBookmarks} from '../../../../features/bookmarks';
import {
  addToPlaylist,
  removeFromPlaylist,
  playFromPlaylist,
  removeFromQueue,
  reorderQueue,
  prependToQueue,
  addToQueue,
  playFromQueue,
  setLoopMode,
  toggleShuffle,
  setPlaybackState,
  setPlaybackSpeed,
  playFile,
  updateCurrentFileMetadata,
  setQueueSelection,
  clearQueueSelection,
  removeSelectedFromQueue,
  moveSelectedToTop,
  clearAll,
  PlaylistEntry,
} from '../../../../store/slices/playerSlice';

import {
  pickMediaFile,
  getFileName,
  validateMediaFile,
  getMediaType,
} from '../../../../services/fileService';
import {isRemoteUri, sourceFromUri} from '../../../../utils/mediaUri';
import type {MediaKind, MediaLane, MediaSource} from '../../../../types/media';
import {normalizePlaybackEntry} from '../../../../types/playback';

import {readTrackMetadata, EMPTY_METADATA, TrackMetadata} from '../../../../services/metadataService';
import {loadLrc} from '../../../../services/lrcService';
import {cacheArt} from '../../../../services/artCacheService';
import type {LrcLine} from '../../../../utils/lrcParser';
import {selectAllTracks} from '../../../../store/slices/mediaSlice';
import type {ScannedTrack} from '../../../../store/slices/mediaSlice';
import type {Chapter} from '../../../../components/player/NowPlayingInfo/ChapterList';
import {
  resolveNextTransition,
  resolvePreviousTransition,
} from '../../../../services/playbackTransitionService';

type Props = {
  navigation: PlaybackNavigation;
  route: {params?: AudioPlaybackParams};
};

export function useAudioPlayerScreen(
  navigation: Props['navigation'],
  route: Props['route'],
) {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const dispatch = useAppDispatch();

  // ── Route params ──
    const title = route.params?.fileTitle || (route.params?.fileUri ? getFileName(route.params.fileUri) : 'Unknown Track');

  const fileUri = route.params?.fileUri ?? null;
  // P33.6: remote stream metadata — artwork URL to disk-cache, source label
  const artworkUri = route.params?.artworkUri;
  const routeSource = route.params?.source;
  const routeType = route.params?.type;
  const routeMediaType = route.params?.mediaType;
  const routeProvider = route.params?.provider;
  const routeFolderId = route.params?.folderId;
  const sourceLabel: MediaSource = routeSource ?? (isRemoteUri(fileUri) ? 'api' : 'local');
  const mediaKind: MediaKind = routeType ?? 'music';
  const mediaLane: MediaLane = routeMediaType ?? 'audio';
  const provider = routeProvider ?? (isRemoteUri(fileUri) ? sourceFromUri(fileUri) : undefined);

  // 58.2: explicit resume intent (e.g. Continue Listening on Home) — silent
  // seek; implicit saved positions ask via the resume overlay instead.
  const startPosition = route.params?.startPosition;

  // ── P37.3: audiobook chapter list — drives EOF auto-advance ──
  const chapterList = route.params?.chapterList;
  const chapterIndexParam = route.params?.chapterIndex ?? 0;
  // activeUri/activeTitle track the *currently loaded* file (route params
  // only describe the first file; chapters advance beyond them).
  const [activeUri, setActiveUri] = useState<string | null>(fileUri);
  const [activeTitle, setActiveTitle] = useState<string>(title);

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
  // 58.2: saved-position resume choice (mirrors 31.2 video overlay)
  const [resumePrompt, setResumePrompt] = useState<{position: number} | null>(null);

  // ── Bookmark state ──
  const [bookmarkSheetVisible, setBookmarkSheetVisible] = useState(false);
  const {
    bookmarksForFile: audioBookmarksForFile,
    bookmarkCountForFile: audioBookmarkCount,
    add: addAudioBookmark,
    remove: removeAudioBookmark,
    updateBookmarkPosition,
  } = useBookmarks(activeUri ?? undefined);

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
      const input = {
        fileUri: uri,
        title,
        position,
        duration: dur,
        label: label ?? '',
        // P34.2: keep art + origin so bookmarks restore the stream context
        thumbnailPath: remoteArtPathRef.current || undefined,
        mediaType: mediaLane,
        type: mediaKind,
        source: sourceLabel,
        provider,
        folderId: routeFolderId,
      };
      const result = addAudioBookmark(input);
      if (result.status === 'requires-confirmation') {
        Alert.alert(
          'Bookmark limit reached',
          `Adding “${title}” will remove the oldest bookmark “${result.candidate.title}”. Continue?`,
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Remove & Add',
              style: 'destructive',
              onPress: () => {
                addAudioBookmark(result.requested, {evictId: result.candidate.id});
              },
            },
          ],
        );
      }
    },
    [
      addAudioBookmark,
      title,
      sourceLabel,
      mediaLane,
      mediaKind,
      provider,
      routeFolderId,
    ],
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
const {list: sessionRecent, addRecent} = useRecentHistory();
  const sessionRecentRef = useRef(sessionRecent);

  // 46.1: accessibility — larger controls scale
  const largerControls = useAppSelector(state => state.settings.largerControls);
  const controlScale = largerControls ? 1.18 : 1;
  const duration = MpvPlayer.getDuration?.() ?? 1;

  // 51.3: media notification is gated by the user preference
  const notificationsEnabled = useAppSelector(state => state.settings.notificationsEnabled);
  const settings = useAppSelector(state => state.settings);

  const notificationsEnabledRef = useRef(notificationsEnabled);
  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  // ── Refs ──
  const isSeeking = useRef(false);
  const fileUriRef = useRef<string | null>(activeUri);
  const playbackSpeedRef = useRef(1.0);
  // P37.3: fresh values for the EOF auto-advance listener without
  // re-subscribing on every chapter / playlist change.
  const activeTitleRef = useRef(activeTitle);
  const chapterListRef = useRef(chapterList);
  const chapterIndexRef = useRef(chapterIndexParam);
  const endHandledRef = useRef(false);
  const playlistRef = useRef(playlist);

  const currentIndexRef = useRef(currentIndex);
  const loopModeRef = useRef(loopMode);

  // A retry nonce is reserved for an explicit user retry. Every load also
  // receives a generation so delayed callbacks from an older stream can never
  // resume or seek a newer stream.
  const [retryNonce, setRetryNonce] = useState(0);
  const loadGenerationRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // P33.6: cached local path for remote artwork — feeds recents/bookmarks
  const remoteArtPathRef = useRef('');

  // ── Sync refs ──
  useEffect(() => { fileUriRef.current = activeUri; }, [activeUri]);
  useEffect(() => { sessionRecentRef.current = sessionRecent; }, [sessionRecent]);
  useEffect(() => { activeTitleRef.current = activeTitle; }, [activeTitle]);
  useEffect(() => { chapterListRef.current = chapterList; }, [chapterList]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);

  // ── Playback speed (persisted in playerSlice) ──
  const playbackSpeed = useAppSelector(state => state.player.playbackSpeed);
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Settings is the runtime source of truth. Re-apply guarded mpv properties
  // when the user changes preferences while an audio item is playing.
  useEffect(() => {
    if (!isReady) return;
    applyPlaybackSettingsToMpv();
    applyAudioSettingsToMpv();
    try {
      MpvPlayer.setSpeed(playbackSpeed);
    } catch {}
  }, [isReady, playbackSpeed, settings]);

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
    const loadGeneration = ++loadGenerationRef.current;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    let cancelled = false;
    let unsubLoaded: (() => void) | null = null;
    logger.info('[PlaybackTrace][Controller][effect:start]', {
      fileUri,
      title,
      startPosition,
      source: sourceLabel,
      mediaKind,
      mediaLane,
    });
    let unsubState: (() => void) | null = null;
    let unsubVolume: (() => void) | null = null;
    let unsubSpeed: (() => void) | null = null;

    (async () => {
      if (!fileUri) {
        logger.error('[PlaybackTrace][Controller][no-file-uri]');
        setError('No file URI provided.');
        setIsLoading(false);
        logError({code: 'ERR_NO_FILE', message: 'No file URI provided.', source: 'AudioPlayerScreen'});
        return;
      }

      // P33: remote streams skip local-file validation (network-loaded by mpv)
      if (!isRemoteUri(fileUri)) {
        logger.info('[PlaybackTrace][Controller][validate-local]', fileUri);
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
      }

      try {
        logger.info('[PlaybackTrace][Controller][init:call]', fileUri);
        const ok = MpvPlayer.initPlayer();
        logger.info('[PlaybackTrace][Controller][init:return]', {ok, cancelled});
        if (cancelled) return;
        if (!ok) {
          setError('Failed to initialize audio player.');
          setIsLoading(false);
          logError({code: 'ERR_INIT_FAIL', message: 'Failed to initialize audio player.', source: 'AudioPlayerScreen'});
          return;
        }

        logger.info('[PlaybackTrace][Controller][listeners:register]');
        unsubState = MpvPlayer.on('onPlaybackStateChanged', ({state}) => {
          logger.info('[PlaybackTrace][Controller][event:onPlaybackStateChanged]', {state, cancelled});
          if (cancelled) return;
          setIsPlaying(state === 'playing');
          dispatch(setPlaybackState(state));
        });
        unsubVolume = MpvPlayer.on('onVolumeChanged', ({volume: nextVolume}) => {
          logger.info('[PlaybackTrace][Controller][event:onVolumeChanged]', {volume: nextVolume, cancelled});
          if (!cancelled) setVolume(nextVolume);
        });
        unsubSpeed = MpvPlayer.on('onSpeedChanged', ({speed: nextSpeed}) => {
          logger.info('[PlaybackTrace][Controller][event:onSpeedChanged]', {speed: nextSpeed, cancelled});
          if (!cancelled) dispatch(setPlaybackSpeed(nextSpeed));
        });

        // Subscribe before loadFile. Native mpv can complete a local or cached
        // load synchronously enough that registering afterwards loses the only
        // reliable first-load transition and leaves the stream paused.
        let initialLoadDone = false;
        unsubLoaded = MpvPlayer.on('onFileLoaded', () => {
          logger.info('[PlaybackTrace][Controller][event:onFileLoaded]', {fileUri, cancelled, initialLoadDone});
          if (cancelled || loadGenerationRef.current !== loadGeneration || initialLoadDone) return;
          initialLoadDone = true;
          endHandledRef.current = false;

          const saved = sessionRecentRef.current.find(f => f.fileUri === fileUri);
          const resumePosition = saved?.position ?? 0;
          const explicitPosition = startPosition ?? 0;
          if (explicitPosition > 0) {
            // 58.2: explicit navigation intent (Continue Listening) — silent seek
            setTimeout(() => {
              if (cancelled || loadGenerationRef.current !== loadGeneration) return;
              try {
                MpvPlayer.seekTo(explicitPosition);
                MpvPlayer.resume();
              } catch {}
            }, 200);
          } else if (resumePosition > 0) {
            // 58.2: implicit resume — ask the user instead of silent auto-seek
            try { MpvPlayer.pause(); } catch {}
            setResumePrompt({position: resumePosition});
          } else {
            // mpv loadFile() does not guarantee autoplay on every native build.
            // Explicitly resume once the file is ready so remote streams start.
            try {
              logger.info('[PlaybackTrace][Controller][onFileLoaded:resume]');
              MpvPlayer.resume();
            } catch (error) {
              logger.error('[PlaybackTrace][Controller][onFileLoaded:resume:error]', error);
            }
          }
        });

        logger.info('[PlaybackTrace][Controller][loadFile:before]', fileUri);
        MpvPlayer.loadFile(fileUri);
        logger.info('[PlaybackTrace][Controller][loadFile:after]', fileUri);

        // Push persisted playback and audio settings before playback starts.
        logger.info('[PlaybackTrace][Controller][settings:before]');
        applyPlaybackSettingsToMpv();
        applyAudioSettingsToMpv();
        logger.info('[PlaybackTrace][Controller][settings:after]');

        // Re-apply the persisted playback speed (mpv resets to 1.0 on load)
        try {
          logger.info('[PlaybackTrace][Controller][speed:before]', playbackSpeedRef.current);
          MpvPlayer.setSpeed(playbackSpeedRef.current);
          logger.info('[PlaybackTrace][Controller][speed:after]', playbackSpeedRef.current);
        } catch (error) {
          logger.error('[PlaybackTrace][Controller][speed:error]', error);
        }

        // Defensive fallback for native builds where the load event is delayed
        // or unavailable. Do not disturb the saved-position prompt; only resume
        // a genuinely fresh start.
        const hasSavedPosition = (startPosition ?? 0) > 0 ||
          (sessionRecentRef.current.find(f => f.fileUri === fileUri)?.position ?? 0) > 0;
        if (!hasSavedPosition) {
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            if (cancelled || loadGenerationRef.current !== loadGeneration) return;
            try {
              logger.info('[PlaybackTrace][Controller][fallback-resume]');
              MpvPlayer.resume();
            } catch (error) {
              logger.error('[PlaybackTrace][Controller][fallback-resume:error]', error);
            }
          }, 700);
        }

        setIsReady(true);
        setIsLoading(false);
        logger.info('[PlaybackTrace][Controller][ready]', {fileUri});

        // Track the complete entry in Redux so the mini audio overlay and reopen

        // flows retain artwork, provenance, and the correct audio lane.
        dispatch(playFile({
          uri: fileUri,
          title,
          duration: 0,
          source: sourceLabel,
          type: mediaKind,
          mediaType: mediaLane,
          provider,
          folderId: routeFolderId,
          artworkUri,
        }));
      } catch (e) {
        logger.error('[PlaybackTrace][Controller][effect:error]', e);
        if (!cancelled) {
          setError('Player initialization failed.');
          setIsLoading(false);
          logError({code: 'ERR_INIT_EXCEPTION', message: String(e), source: 'AudioPlayerScreen'});
        }
      }
    })();

    return () => {
      logger.info('[PlaybackTrace][Controller][effect:cleanup]', {fileUri, loadGeneration});
      cancelled = true;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      unsubLoaded?.();
      unsubState?.();
      unsubVolume?.();
      unsubSpeed?.();
    };

  }, [fileUri, title, dispatch, retryNonce, sourceLabel, startPosition]);

    // Load a new queue/chapter item and explicitly clear mpv's paused state.
  // Native loadFile() is intentionally separate from play(), so every
  // transition must resume after loading instead of assuming autoplay.
  const loadAndResume = useCallback((uri: string, resumePosition?: number) => {
    const loadGeneration = ++loadGenerationRef.current;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    logger.info('[PlaybackTrace][Controller][loadAndResume:before]', {uri, resumePosition, loadGeneration});
    try {
      MpvPlayer.loadFile(uri);
      logger.info('[PlaybackTrace][Controller][loadAndResume:loaded]', {uri, loadGeneration});
      MpvPlayer.resume();
      logger.info('[PlaybackTrace][Controller][loadAndResume:resumed]', {uri, loadGeneration});
      setTimeout(() => {
        if (loadGenerationRef.current !== loadGeneration) return;
        try {
          MpvPlayer.resume();
          if (resumePosition && resumePosition > 0) {
            MpvPlayer.seekTo(resumePosition);
          }
        } catch {}
      }, 250);
    } catch (error) {
      logger.error('[PlaybackTrace][Controller][loadAndResume:error]', {uri, loadGeneration, error});
    }
  }, []);

  // ── 58.2: Resume / Start Over choice on load (mirrors 31.2 video) ──

  const handleResumeChoice = useCallback(
    (shouldResume: boolean) => {
      if (!resumePrompt) return;
      const pos = resumePrompt.position;
      setResumePrompt(null);
      if (shouldResume && pos > 1) {
        setTimeout(() => {
          try { MpvPlayer.seekTo(pos); } catch {}
        }, 50);
      }
      MpvPlayer.resume();
    },
    [resumePrompt],
  );

  // ── P33.6: remote artwork → disk LRU cache; local path powers player art
  //     and the thumbnail saved to recents (works offline, no repeat fetches)
  useEffect(() => {
    if (!artworkUri) return;
    // P34.3: local artwork (file:// path from art cache / playlist thumbnails)
    // can be used directly — no download needed.
    if (!isRemoteUri(artworkUri)) {
      remoteArtPathRef.current = artworkUri;
      dispatch(updateCurrentFileMetadata({artworkUri}));
      setMetadata(prev =>
        prev.albumArtUri ? prev : {...prev, albumArtUri: artworkUri},
      );
      return;
    }
    let cancelled = false;
    (async () => {
      const cached = await cacheArt(artworkUri);
      if (cancelled || !cached) return;
      remoteArtPathRef.current = cached;
      dispatch(updateCurrentFileMetadata({artworkUri: cached}));
      setMetadata(prev => (prev.albumArtUri ? prev : {...prev, albumArtUri: cached}));
    })();
    return () => {
      cancelled = true;
    };
  }, [artworkUri]);

  // ── Load metadata, chapters, and lyrics when file loads ──
  useEffect(() => {
    if (!isReady || !fileUri) return;

    let cancelled = false;

    (async () => {
      try {
        const meta = await readTrackMetadata(fileUri);
        if (!cancelled) {
          setMetadata(prev => ({
            ...meta,
            title: meta.title || prev.title || title,
            artist: meta.artist || prev.artist,
            album: meta.album || prev.album,
            // Remote streams generally have no local cover file. Preserve
            // route/cache artwork instead of replacing it with an empty URI.
            albumArtUri: meta.albumArtUri || prev.albumArtUri || artworkUri || '',
          }));

          const metadataPatch: Partial<PlaylistEntry> = {
            title: meta.title || title,
          };
          if (meta.artist) metadataPatch.artist = meta.artist;
          if (meta.album) metadataPatch.album = meta.album;
          const resolvedArtworkUri = meta.albumArtUri || artworkUri;
          if (resolvedArtworkUri) metadataPatch.artworkUri = resolvedArtworkUri;
          dispatch(updateCurrentFileMetadata(metadataPatch));
        }

        // 51.3: start only when the user has media notifications enabled
        if (notificationsEnabledRef.current) {
          NotificationService.start(
            {
              title: meta.title || activeTitle || 'Unknown Track',
              artist: meta.artist || '',
              album: meta.album || '',
              fileUri: activeUri ?? '',
              artworkPath: meta.albumArtUri || '',
              mediaType: 'audio',
            },
            {
              position: MpvPlayer.getPosition?.() ?? 0,
              duration: MpvPlayer.getDuration?.() ?? 1,
              isPlaying: MpvPlayer.getPlaybackState() === 'playing',
            },
          );
        }

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
        // 51.3: fallback metadata — also gated by the user preference
        if (notificationsEnabledRef.current) {
          NotificationService.start(
            {
              title: activeTitle || 'Unknown Track',
              artist: '',
              album: '',
              fileUri: activeUri ?? '',
              artworkPath: '',
              mediaType: 'audio',
            },
            {position: 0, duration: MpvPlayer.getDuration?.() ?? 1, isPlaying: false},
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, fileUri, activeTitle, activeUri]);

  // ── 51.3: keep the media notification in sync with playback ──
  useEffect(() => {
    if (!isReady || !activeUri) return;
    const interval = setInterval(() => {
      const nativePosition = MpvPlayer.getPosition?.() ?? 0;
      const nativeDuration = MpvPlayer.getDuration?.() ?? 1;

      // Position updates never create bookmarks; they only move an item the
      // user explicitly created through the bookmark action.
      if (audioBookmarksForFile.length > 0) {
        updateBookmarkPosition({
          fileUri: activeUri,
          position: nativePosition,
          duration: nativeDuration,
        });
      }

      if (!notificationsEnabledRef.current) return;
      NotificationService.update(
        {
          title: metadata.title || activeTitle || 'Unknown Track',
          artist: metadata.artist || '',
          album: metadata.album || '',
          fileUri: activeUri,
          artworkPath: metadata.albumArtUri || '',
          mediaType: 'audio',
        },
        {
          position: nativePosition,
          duration: nativeDuration,
          isPlaying: MpvPlayer.getPlaybackState() === 'playing',
        },
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [
    isReady,
    activeUri,
    metadata,
    activeTitle,
    audioBookmarksForFile.length,
    updateBookmarkPosition,
  ]);

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
      const handoffTitle = activeTitleRef.current || title || getFileName(curUri);
      const handoffArtwork = remoteArtPathRef.current || artworkUri;

      // Keep Redux currentFile authoritative before collapsing the overlay.
      // The mini-player reads this entry directly and must never receive a
      // null title after returning from the full player.
      dispatch(updateCurrentFileMetadata({
        title: handoffTitle,
        ...(handoffArtwork ? {artworkUri: handoffArtwork} : {}),
      }));

      addRecent({
        fileUri: curUri,
        title: handoffTitle,
        position: curPos,
        duration: curDur,
        thumbnailPath: handoffArtwork || '',
        mediaType: mediaLane,
        type: mediaKind,
        source: sourceLabel,
        provider,
        folderId: routeFolderId,
      });
    }

    // Keep the file loaded so the audio overlay can control it after back;
    // pause (not stop) so the mini player's state matches the native player.
    try { MpvPlayer.pause(); } catch {}
    dispatch(setPlaybackState('paused'));
    NotificationService.stop();

    navigation.goBack();
  }, [artworkUri, dispatch, getFileName, navigation, sourceLabel, mediaLane, mediaKind, provider, routeFolderId, title, updateCurrentFileMetadata]);

  const handlePlayPause = useCallback(() => {
    try {
      const nativeState = MpvPlayer.getPlaybackState();
      logger.info('[PlaybackTrace][Controller][handlePlayPause]', {nativeState, fileUri: fileUriRef.current});
      if (nativeState === 'playing') {
        MpvPlayer.pause();
      } else {
        MpvPlayer.resume();
      }
    } catch (error) {
      logger.error('[PlaybackTrace][Controller][handlePlayPause:error]', error);
    }
    haptics.medium();
  }, [haptics]);

  const handlePrev = useCallback(() => {
    // P37.3: with a chapter list, back = previous chapter (or restart).
    const list = chapterListRef.current;
    if (list && list.length > 0) {
      const pos = MpvPlayer.getPosition?.() ?? 0;
      if (pos > 5) {
        MpvPlayer.seekTo(0);
        return;
      }
      const idx = chapterIndexRef.current;
      if (idx <= 0) {
        MpvPlayer.seekTo(0);
        return;
      }
      const prev = list[idx - 1];
      chapterIndexRef.current = idx - 1;
      setActiveUri(prev.uri);
      setActiveTitle(prev.title);
      dispatch(playFile({uri: prev.uri, title: prev.title, duration: prev.duration ?? 0, source: sourceLabel}));
      loadAndResume(prev.uri);
      return;
    }

    const pos = MpvPlayer.getPosition?.() ?? 0;
    if (pos > 5) {
      MpvPlayer.seekTo(0);
      return;
    }

    const transition = resolvePreviousTransition({
      lane: mediaLane,
      playlist,
      queue,
      currentIndex,
      loopMode,
    });
    if (transition.kind === 'restart') {
      MpvPlayer.seekTo(0);
      return;
    }

    dispatch(playFromPlaylist(transition.playlistIndex));
    loadAndResume(transition.entry.uri);
  }, [
    currentIndex,
    dispatch,
    loopMode,
    mediaLane,
    playlist,
    queue,
    sourceLabel,
    loadAndResume,
  ]);

  // ── P37.3: load the next chapter when a chapter list is active ──
  const playNextChapter = useCallback(() => {
    const list = chapterListRef.current;
    if (!list || list.length === 0) return false;
    const nextIdx = chapterIndexRef.current + 1;
    if (nextIdx >= list.length) return false; // end of the book
    const next = list[nextIdx];
    chapterIndexRef.current = nextIdx;
    setActiveUri(next.uri);
    setActiveTitle(next.title);
    dispatch(playFile({uri: next.uri, title: next.title, duration: next.duration ?? 0, source: sourceLabel}));
    // Cross-chapter resume: continue where this chapter was left off.
    const recent = sessionRecentRef.current.find(r => r.fileUri === next.uri);
    loadAndResume(next.uri, recent?.position);
    return true;
  }, [dispatch, sourceLabel, loadAndResume]);

  const transitionToNextAudio = useCallback(() => {
    const transition = resolveNextTransition({
      lane: mediaLane,
      playlist: playlistRef.current,
      queue,
      currentIndex: currentIndexRef.current,
      loopMode: loopModeRef.current,
    });

    if (transition.kind === 'ended') {
      dispatch(setPlaybackState('stopped'));
      return false;
    }

    if (transition.kind === 'queue') {
      dispatch(playFromQueue(transition.queueIndex));
    } else {
      dispatch(playFromPlaylist(transition.playlistIndex));
    }
    loadAndResume(transition.entry.uri);
    return true;
  }, [dispatch, mediaLane, queue, loadAndResume]);

  const handleNext = useCallback(() => {
    // P37.3: chapter list (audiobook) takes precedence over the lane queue.
    if (playNextChapter()) return;
    transitionToNextAudio();
  }, [playNextChapter, transitionToNextAudio]);

    const handleSeek = useCallback((pct: number) => {
    isSeeking.current = true;
    const dur = MpvPlayer.getDuration?.() ?? 1;
    const target = Math.max(0, Math.min(dur, pct * dur));
    try {
      MpvPlayer.seekTo(target);
    } catch {}
    setTimeout(() => { isSeeking.current = false; }, 200);
  }, []);

  const handleRewind = useCallback(() => {
    try {
      MpvPlayer.seekBackward(10);
    } catch {}
    haptics.light();
  }, [haptics]);

  const handleForward = useCallback(() => {
    try {
      MpvPlayer.seekForward(10);
    } catch {}
    haptics.light();
  }, [haptics]);

  const handleVolumeChange = useCallback((delta: number) => {
    const current = MpvPlayer.getVolume?.() ?? volume;
    const next = Math.max(0, Math.min(100, current + delta));
    try {
      MpvPlayer.setVolume(next);
    } catch {}
  }, [volume]);

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
      const mediaType = getMediaType(file.uri);
      const entry: PlaylistEntry = normalizePlaybackEntry({
        uri: file.uri,
        title: file.title || getFileName(file.uri),
        duration: 0,
        source: 'local',
        type: mediaType === 'video' ? 'video' : 'audio',
        mediaType,
      });
      dispatch(addToPlaylist(entry));
      if (playlist.length === 0) {
        loadAndResume(entry.uri);
      }
    } catch {}
    }, [dispatch, playlist.length, loadAndResume]);

  const handleRemoveFromPlaylist = useCallback((index: number) => {
    dispatch(removeFromPlaylist(index));
  }, [dispatch]);

  const handlePlayFromPlaylist = useCallback((index: number) => {
    const entry = playlist[index];
    if (!entry) return;
    dispatch(playFromPlaylist(index));
    loadAndResume(entry.uri);
  }, [dispatch, playlist, loadAndResume]);

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
        loadAndResume(entry.uri);
      }
    }
    setQueueSheetVisible(false);
    }, [dispatch, playlist, currentIndex, loadAndResume]);

  const handleSelectQueueItem = useCallback((idx: number) => {
    const item = queue[idx];
    if (!item) return;
    handleQueueSelectItem(item.uri);
  }, [queue, handleQueueSelectItem]);

  const handlePlayQueueIndex = useCallback((index: number) => {
    const item = queue[index];
    if (!item) return;
    dispatch(playFromQueue(index));
    loadAndResume(item.uri);
    setQueueSheetVisible(false);
  }, [dispatch, loadAndResume, queue]);

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
      loadAndResume(track.uri);
      setChapters([]);
    },
    [loadAndResume],
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
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    // Invalidate delayed callbacks from the failed generation before the
    // explicit user retry causes the initialization effect to run again.
    loadGenerationRef.current += 1;
    setError(null);
    setErrorIsPermission(false);
    setIsReady(false);
    setIsLoading(true);
    setRetryNonce(n => n + 1);
  }, []);

  // Native onError is reserved for fatal/terminal failures. Recoverable
  // network underruns must remain inside the same mpv load and be represented
  // by paused-for-cache; reloading here caused the observed same-URI storm.
  useEffect(() => {
    const unsubError = MpvPlayer.on('onError', ({message: errMsg}) => {
      const uri = fileUriRef.current;
      logger.error('[PlaybackTrace][Controller][event:onError:terminal]', {uri, message: errMsg});
      if (!uri) return;
      setError(errMsg || 'Stream playback failed.');
      setIsLoading(false);
      setIsReady(false);
      setIsPlaying(false);
      dispatch(setPlaybackState('stopped'));
      logError({
        code: 'ERR_STREAM_FAIL',
        message: errMsg || 'Stream playback failed.',
        source: 'AudioPlayerScreen',
      });
    });

    return () => {
      unsubError();
    };
  }, [dispatch]);

    // ── P37.3: auto-advance only on natural EOF ──
  useEffect(() => {
    const unsubEnd = MpvPlayer.on('onEndFile', ({reason, error}) => {
      logger.info('[PlaybackTrace][Controller][event:onEndFile]', {reason, error});

      // MPV emits end-file for stop/reload as well as natural EOF. A reload
      // reports reason=2 and must never advance or restart the queue. Only
      // reason=0 represents the current item reaching its natural end.
      if (reason !== 0) return;
      if (endHandledRef.current) return;
      endHandledRef.current = true;

      // 1. Loop-file mode replays the current track
      if (loopModeRef.current === 'file') {
        MpvPlayer.seekTo(0);
        try { MpvPlayer.resume(); } catch {}
        return;
      }
      // 2. Audiobook chapter list — advance to the next chapter
      if (playNextChapter()) return;
      // 3. Regular playback — consume the active-lane queue first, then the
      // remaining playlist. The shared resolver also handles playlist looping.
      transitionToNextAudio();
      // Otherwise the file simply ends (mpv stops) — expected.
    });

    return () => {
      unsubEnd();
    };
  }, [playNextChapter, transitionToNextAudio]);

  return {
    // Theme
    colors,
    isDark,
    insets,
    dispatch,

    // Route
    title: activeTitle,
    fileUri: activeUri,
    sourceLabel,

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
    // 58.2: saved-position resume choice
    resumePrompt,

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

    // 46.1: accessibility
    controlScale,

    // Handlers
    onRefresh,
    handleGoBack,
    handlePlayPause,
    handlePrev,
    handleNext,
    handleSeek,
    handleRewind,
    handleForward,
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
    handlePlayQueueIndex,
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
    // 58.2: resume overlay handlers
    handleResumeChoice,

    // Bookmark handlers
    handleOpenBookmarkSheet,
    handleCloseBookmarkSheet,
    handleBookmarkAdd,
    handleBookmarkDelete,
    handleBookmarkJumpTo,
  };
}
