import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useWindowDimensions} from 'react-native';
import MpvPlayer from '../../../../native/player.api';
import {createVideoSourceFingerprint} from '../domain/VideoFingerprint';
import {
  emptyVideoSnapshot,
  type VideoSourceIdentity,
  type VideoViewState,
} from '../domain/VideoTypes';
import type {VideoPipState} from '../platform/VideoPipAdapter';
import {VideoPresentationShell} from '../presentation/VideoPresentationShell';
import {computeMiniSlot, TRANSITION_DURATION_MS} from '../presentation/videoShellConstants';
import {createSurfaceChangeCounter, VIDEO_UI_FLAGS} from '../presentation/videoUiFlags';
import {VideoStatusPill} from '../presentation/VideoStatusPill';
import {VideoSafeControlLayer} from '../presentation/VideoSafeControlLayer';
import {VideoSurfaceGestures} from '../presentation/VideoSurfaceGestures';
import {VideoMoreSheet, type VideoMoreSheetRow} from '../presentation/VideoMoreSheet';
import {useAppDispatch, useAppSelector} from '../../../../store';
import {
  clearQueue,
  playFromPlaylist,
  playFromQueue,
  type PlaylistEntry,
} from '../../../../store/slices/playerSlice';
import {createVideoPlayback} from '../session/createVideoPlayback';
import {VideoNativeSurface} from '../surface/VideoNativeSurface';
import {usePlaybackCommands} from '../../PlaybackContext';
import type {ActivePlayback, PlaybackPresentation} from '../../types';
import {FilterSheet} from '../../../../components/sheets/FilterSheet/FilterSheet';
import {useBookmarks} from '../../../../features/bookmarks';
import {KeepScreenOn} from '../../../../native/player.api';
import {useNavigation} from '../../../../navigation/useNavigation';

type VideoPlaybackUnit = Awaited<ReturnType<typeof createVideoPlayback>>;

const EMPTY_VIDEO_VIEW_STATE: VideoViewState = {
  session: emptyVideoSnapshot(),
  capabilities: {
    canPlay: false,
    canPause: false,
    canSeek: false,
    canAdjustVolume: false,
    canChangeSpeed: false,
    canSelectAudioTrack: false,
    canSelectCaptionTrack: false,
    canViewChapters: false,
    canPictureInPicture: false,
    canFullscreen: false,
    canChangeOrientation: false,
  },
};

export interface VideoHostProps {
  readonly active: ActivePlayback;
}

function toVideoSource(active: ActivePlayback): VideoSourceIdentity {
  const entry = active.entry;
  return {
    uri: entry.uri,
    title: entry.title,
    source: entry.source,
    type: entry.type,
    mediaLane: 'video',
    ...(entry.provider === undefined ? {} : {provider: entry.provider}),
    ...(entry.folderId === undefined ? {} : {folderId: entry.folderId}),
  };
}

export function VideoHost({active}: VideoHostProps) {
  const {expandPlayer, collapsePlayer, closePlayer} = usePlaybackCommands();
  const [playback, setPlayback] = useState<VideoPlaybackUnit | null>(null);
  const windowDimensions = useWindowDimensions();
  const source = useMemo(() => toVideoSource(active), [active]);
  const sourceFingerprint = useMemo(() => createVideoSourceFingerprint(source), [source]);
  // W2.5: pull the bookmark for the current file (if any). When the user
  // opens the player without an explicit startPosition (e.g. tapping a
  // tile in the library) and a saved bookmark exists, resume from that
  // position. When `active.startPosition` IS provided (deep-link, queue
  // resume), the explicit value wins.
  const {bookmarksForFile, add: addBookmark, remove: removeBookmarkById} = useBookmarks(source.uri);
  const savedBookmark = bookmarksForFile[0] ?? null;
  const startPosition = active.startPosition ?? savedBookmark?.position;
  const autoplay = active.entry.autoplay ?? true;
  const requestIdentity = `${sourceFingerprint}|${startPosition ?? ''}|${autoplay ? 'autoplay' : 'paused'}`;
  // W5.6: subtitle language from the openPlayer call. The video
  // session's `tracks` list is populated asynchronously after
  // `onTracksChanged` fires; the effect below watches for a
  // matching track to appear and dispatches `select-track` for it.
  const pendingSubtitleLanguage = active.subtitleLanguage;
  const [viewState, setViewState] = useState<VideoViewState>(EMPTY_VIDEO_VIEW_STATE);
  const [nativePtr, setNativePtr] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [pipState, setPipState] = useState<VideoPipState | null>(null);
  // W2.1: speed picker sheet visibility. The sheet is mounted at the end of
  // the host so it overlays the player regardless of full / mini / PiP.
  const [speedSheetVisible, setSpeedSheetVisible] = useState(false);
  // v11 T2.3: more-sheet (consolidated modal — queue / tracks / chapters /
  // fullscreen / EQ). The host owns the visibility; the sheet contents
  // are stubbed here and filled in by Theme 3.
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  // v11 T4.1: Redux state for the queue section. The same selectors
  // power the full-page Queue route (via useQueueScreen) — the sheet
  // and the route never diverge.
  const dispatch = useAppDispatch();
  const queueItems = useAppSelector(state => state.player.queue);
  const playerPlaylist = useAppSelector(state => state.player.playlist);
  const currentFile = useAppSelector(state => state.player.currentFile);
  const currentIndex = useAppSelector(state => state.player.currentIndex);
  // Error-fix (step 4): debounce the in-flight play dispatch so a
  // fast double-tap on a row can't double-dispatch the load. The
  // flag lives in a ref so re-renders don't reset it; cleared after
  // 250 ms (longer than a typical React double-tap window).
  const queuePlayInFlight = useRef(false);
  const session = viewState.session;
  const presentation: PlaybackPresentation = active.presentation;
  const isPipLike = pipState?.mode === 'entering' || pipState?.mode === 'pip' || pipState?.mode === 'exiting';
  const shellPresentation = isPipLike || presentation === 'expanded' ? 'full' : 'mini';
  const surfacePresentation = isPipLike ? 'pip' : shellPresentation;

  useEffect(() => {
    if (!playback) return;
    setViewState(playback.state.getState());
    return playback.state.subscribe(setViewState);
  }, [playback]);

  // W5.6: when the host opens a source with a specific subtitle
  // language, wait until the session's track list contains a
  // matching sub track, then dispatch the selection. The effect only
  // fires once per `pendingSubtitleLanguage` value (clearing the
  // local pointer after dispatch prevents re-applying on track
  // re-emits).
  const [subtitleAppliedFor, setSubtitleAppliedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!playback) return;
    if (pendingSubtitleLanguage === undefined) return;
    if (subtitleAppliedFor === pendingSubtitleLanguage) return;
    const track = viewState.session.tracks.find(
      t => t.type === 'sub' && (t.language === pendingSubtitleLanguage || t.title === pendingSubtitleLanguage),
    );
    if (!track) return;
    playback.commands
      .dispatch({type: 'select-track', trackId: track.id})
      .catch(() => undefined);
    playback.commands
      .dispatch({type: 'set-caption-visibility', visible: true})
      .catch(() => undefined);
    setSubtitleAppliedFor(pendingSubtitleLanguage);
  }, [playback, pendingSubtitleLanguage, subtitleAppliedFor, viewState.session.tracks]);

  useEffect(() => {
    if (!playback) return;
    setPipState(playback.pip.getState());
    return playback.pip.subscribe(setPipState);
  }, [playback]);

  useEffect(() => {
    let cancelled = false;
    let nextPlayback: VideoPlaybackUnit | null = null;
    (async () => {
      // L2: `createVideoPlayback` is now async — it awaits the previous
      // teardown's promise so a StrictMode second mount doesn't race
      // the first mount's `stop + destroy` on the shared native
      // handle. The cleanup here calls the same release that the
      // factory registered with the lease system.
      const built = await createVideoPlayback();
      if (cancelled) {
        // The effect was already cleaned up; release the unit and
        // return without setting state.
        built.release.catch(() => undefined);
        return;
      }
      nextPlayback = built;
      setPlayback(built);
    })();
    return () => {
      cancelled = true;
      if (nextPlayback) {
        nextPlayback.release.catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (!playback) return;
    const unsubscribe = playback.pip.subscribeToActions(action => {
      if (action === 'play-pause') {
        playback.commands.dispatch({type: session.isPlaying ? 'pause' : 'play'}).catch(() => undefined);
      } else if (action === 'expand') {
        playback.pip.exit().catch(() => undefined);
        expandPlayer();
      } else {
        closePlayer();
        playback.pip.close().catch(() => undefined);
      }
    });
    return unsubscribe;
  }, [closePlayer, expandPlayer, playback, session.isPlaying]);

  useEffect(() => {
    if (!playback) return;
    playback.surface.attach().catch(() => undefined);
  }, [playback]);

  useEffect(() => {
    if (!playback) return;
    let cancelled = false;
    const load = async () => {
      try {
        // R3: route the mount-time load through the intent queue so
        // the mount path and the recovery path (which already uses
        // commands.dispatch({type:'load'})) share the same serializer
        // and the same generation bookkeeping.
        await playback.commands.dispatch({type: 'load', request: {source, startPosition, autoplay}});
        if (cancelled) return;
        try {
          setNativePtr(MpvPlayer.getNativePtr());
        } catch {
          setNativePtr(0);
        }
      } catch {
        if (!cancelled) setNativePtr(0);
      }
    };
    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [autoplay, playback, requestIdentity, source, startPosition]);

  // v11 T7.3: surface-change counter. Resets at the start of
  // every new transition (surfacePresentation flips). Records
  // every setPresentation call. If the count exceeds the warn
  // threshold inside the transition window, log a one-shot
  // diagnostic recommending the user flip
  // `SIMBA_VIDEO_MINI_LIVE_SURFACE=false` (the auto-degrade
  // hook per spec T7.3 step 3). The flag is NEVER auto-toggled.
  const surfaceChangeCounter = useRef(
    createSurfaceChangeCounter(TRANSITION_DURATION_MS),
  );

  useEffect(() => {
    surfaceChangeCounter.current.reset();
  }, [surfacePresentation]);

  useEffect(() => {
    if (!playback) return;
    // P3: pass real screen geometry to the surface port so it can
    // forward the rectangle to the native side on future bridges.
    // The numbers match the shell: full = fullscreen, mini =
    // bottom-right with margins, pip = same as full (PiP geometry
    // is owned by the system overlay). v11 T7.1: the mini rectangle
    // is now sourced from `computeMiniSlot` (single source of
    // truth with the shell) so the native bridge and the shell
    // can't drift apart.
    const {width: viewportWidth, height: viewportHeight} = windowDimensions;
    const geometry =
      surfacePresentation === 'full'
        ? {x: 0, y: 0, width: viewportWidth, height: viewportHeight}
        : surfacePresentation === 'mini'
        ? computeMiniSlot(viewportWidth, viewportHeight)
        : {x: 0, y: 0, width: viewportWidth, height: viewportHeight};
    // v11 T7.3: count this re-lay against the auto-degrade hook.
    const count = surfaceChangeCounter.current.record();
    if (count > VIDEO_UI_FLAGS.surfaceChangeWarnThreshold) {
      // eslint-disable-next-line no-console
      console.warn(
        `[video-ui] ${count} surface size changes within one ` +
          `${TRANSITION_DURATION_MS} ms transition. If this device ` +
          'shows dropped frames during mini<->full, set ' +
          '`SIMBA_VIDEO_MINI_LIVE_SURFACE=false` to disable the ' +
          'mini live surface.',
      );
    }
    playback.surface.setPresentation(surfacePresentation, geometry).catch(() => undefined);
  }, [playback, surfacePresentation, windowDimensions.width, windowDimensions.height]);

  // W2.11: chrome auto-hide. After 3 s of inactivity while playing, the
  // chrome fades to controls-off. Any user activity (the chrome tap
  // handler below) re-shows it and resets the timer. Pausing / finishing
  // / entering PiP / erroring also keeps the chrome visible — the user
  // needs the controls at those moments. v11 T2.3: opening any modal
  // (the more-sheet for now; the speed / tracks / chapters sheets
  // already had this in W2.1) pauses the timer so the chrome stays
  // visible while the user is interacting with the sheet.
  useEffect(() => {
    if (!playback) return;
    if (!chromeVisible) return;
    if (session.phase !== 'playing') return;
    if (isPipLike) return;
    if (speedSheetVisible) return;
    if (moreSheetVisible) return;
    const timer = setTimeout(() => {
      setChromeVisible(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [
    chromeVisible,
    isPipLike,
    moreSheetVisible,
    playback,
    session.phase,
    session.position,
    speedSheetVisible,
  ]);

  // W2.12: keep-awake. While the player is actively playing, set the
  // window-level FLAG_KEEP_SCREEN_ON so the device does not dim or
  // sleep. Cleared on pause, finish, error, PiP, and unmount. Uses
  // the bridge method (no extra dep) — fails silently on iOS / non-
  // Android targets.
  useEffect(() => {
    const shouldKeep = session.phase === 'playing' && !isPipLike;
    KeepScreenOn.setEnabled(shouldKeep);
    return () => {
      // Best-effort cleanup on unmount. The next effect run will
      // re-evaluate the flag, so this is just a safety net.
      KeepScreenOn.setEnabled(false);
    };
  }, [isPipLike, session.phase]);

  const dispatchPlayPause = async () => {
    if (!playback) return;
    if (session.phase === 'finished') {
      await playback.commands.dispatch({
        type: 'load',
        request: {source, startPosition: 0, autoplay: true},
      });
      return;
    }
    if (session.phase === 'error') {
      await playback.commands.dispatch({
        type: 'load',
        request: {source, startPosition: session.position, autoplay: true},
      });
      return;
    }
    await playback.commands.dispatch({type: session.isPlaying ? 'pause' : 'play'});
  };

  const navigation = useNavigation();

  // W2.1: speed picker. Opens the FilterSheet; the host stays the single
  // owner of intent dispatch (commands.dispatch), so the speed value goes
  // through the same serializer as load / play / pause.
  const openSpeedSheet = useCallback(() => setSpeedSheetVisible(true), []);
  const closeSpeedSheet = useCallback(() => setSpeedSheetVisible(false), []);
  const handleSpeedChange = useCallback(
    (_groupId: string, keys: string[]) => {
      if (!playback) return;
      const raw = keys[0];
      const next = Number(raw);
      if (!Number.isFinite(next) || next <= 0) return;
      playback.commands
        .dispatch({type: 'set-speed', speed: next})
        .catch(() => undefined);
    },
    [playback],
  );
  const speedSheetGroups = useMemo(
    () => [
      {
        id: 'speed',
        title: 'Speed',
        multiSelect: false,
        rows: VIDEO_SPEED_PRESETS.map(value => ({
          key: String(value),
          label: `${VIDEO_SPEED_LABELS[value] ?? value}×`,
        })),
      },
    ],
    [],
  );
  const speedSheetValue = useMemo(
    () => ({speed: [String(session.speed)]}),
    [session.speed],
  );

  // v11 T2.3: more-sheet stub. The real MoreSheet sections
  // (queue / tracks / chapters / fullscreen / EQ) land in Theme 3.
  // For T2.3 the sheet just shows a "coming soon" placeholder so
  // the top-bar `more` button has a real tap target and the auto-hide
  // pause-on-sheet logic is exercised end-to-end.
  const moreSheetGroups = useMemo(
    () => [
      {
        id: 'placeholder',
        title: 'Coming soon',
        multiSelect: false,
        rows: [
          {key: 'tba', label: 'Queue · Tracks · Chapters · Fullscreen · EQ'},
        ],
      },
    ],
    [],
  );
  const moreSheetValue = useMemo(() => ({placeholder: []}), []);

  // W2.3: captions toggle. Flips the current subtitle visibility on /
  // off without changing the track id. The session's `setCaptionVisibility`
  // re-selects the previously selected or default sub track when
  // turning on, and sends `setTrack('sub', 'no')` when turning off.
  const handleToggleCaptions = useCallback(() => {
    if (!playback) return;
    const hasSubSelected = session.tracks.some(
      t => t.type === 'sub' && t.isSelected,
    );
    playback.commands
      .dispatch({type: 'set-caption-visibility', visible: !hasSubSelected})
      .catch(() => undefined);
  }, [playback, session.tracks]);

  // W2.4: prev/next playlist navigation. The mpv playlist is separate
  // from `session.tracks` (media tracks); `MpvPlayer.next/previous`
  // call into `playlistNext/playlistPrev` on the native side. We don't
  // guard with `hasNext` / `hasPrevious` — mpv no-ops at the boundaries
  // (start/end of playlist), so a tap on << at the start is harmless.
  const handleNext = useCallback(() => {
    playback?.commands
      .dispatch({type: 'next'})
      .catch(() => undefined);
  }, [playback]);
  const handlePrevious = useCallback(() => {
    playback?.commands
      .dispatch({type: 'previous'})
      .catch(() => undefined);
  }, [playback]);

  // W2.8: lock screen. When `isLocked` is true the chrome hides the
  // seek + transport + utility rows — only the center play/pause tap
  // target is still active (large button). Any tap on the surface also
  // re-shows the chrome for 3 s (auto-hide still applies). Tapping the
  // lock icon in the top row toggles the state. Useful for kids /
  // accidental touches; the play/pause is still reachable.
  const [isLocked, setIsLocked] = useState(false);
  const handleToggleLock = useCallback(() => {
    setIsLocked(current => !current);
    // Show chrome on unlock so the user can see the new state.
    setChromeVisible(true);
  }, []);

  // v11 T2.3: more-sheet open/close. The `more` button in the top bar
  // is only rendered when the host detects at least one MoreSheet
  // section is available (spec Rule 3). The stub sheet is a plain
  // `FilterSheet` placeholder; Theme 3 fills it with real sections.
  const openMoreSheet = useCallback(() => setMoreSheetVisible(true), []);
  const closeMoreSheet = useCallback(() => setMoreSheetVisible(false), []);

  // W2.5: bookmark toggle. The existing Redux model stores one bookmark
  // per file (file-scoped, not position-scoped — see A14 for the audio
  // side bug). For video we use the same model: tapping saves the
  // current position; tapping again removes. The button is shown
  // whenever the source URI is bookmarkable (always, for video).
  const isBookmarked = savedBookmark !== null;
  const handleToggleBookmark = useCallback(() => {
    if (savedBookmark) {
      removeBookmarkById(savedBookmark.id);
      return;
    }
    const position = session.position;
    if (!Number.isFinite(position) || position < 1) {
      // Refuse to save at sub-1-second positions — they read as
      // accidental taps and the user almost never wants to resume
      // from 0.4s.
      return;
    }
    const duration = session.duration ?? 0;
    addBookmark({
      fileUri: source.uri,
      title: source.title,
      position,
      duration,
      label: '',
      source: source.source,
      type: source.type,
      mediaType: 'video',
      ...(source.provider !== undefined ? {provider: source.provider} : {}),
      ...(source.folderId !== undefined ? {folderId: source.folderId} : {}),
    });
  }, [savedBookmark, removeBookmarkById, session.position, session.duration, source, addBookmark]);

  const dispatchSeek = (position: number) => {
    if (!playback) return;
    playback.commands.dispatch({
      type: 'seek',
      position,
      generation: session.generation,
    }).catch(() => undefined);
  };

  const dispatchSkip = (seconds: number) => {
    if (session.duration === null) return;
    dispatchSeek(Math.max(0, Math.min(session.duration, session.position + seconds)));
  };

  const showFullChrome = !isPipLike && presentation === 'expanded';
  const showMiniChrome = !isPipLike && presentation === 'mini';
  const requestPip = () => {
    playback?.pip.enter(session).catch(() => undefined);
  };
  // v11 T3.3: fullscreen toggle. The native `setOrientation` /
  // `setImmersive` bridge is added in T8.1. Until then, the row is
  // gated off via `canFullscreen: false`, so the chip renders as a
  // muted non-tappable text per Rule 12 — no dead control.
  const toggleFullscreen = () => {
    // Placeholder: T8.1 wires `MpvPlayer.setOrientation(landscape)`
    // + `MpvPlayer.setImmersive(true)`. Today this is a no-op.
  };
  // v11 T3.3: open the existing Equalizer route from the MoreSheet.
  // The video host doesn't own EQ state directly — the audio pipeline
  // (mpv) reads the per-band gains from `audioSettingsService`. Until a
  // dedicated video-EQ surface exists, navigating to the audio Equalizer
  // screen is the canonical "tweak audio for video" path. The Equalizer
  // route lives in `SettingsStack`, so we go through the root `Settings`
  // screen with a nested navigate.
  const openEqualizer = () => {
    navigation.navigate('Settings', {screen: 'Equalizer'});
  };
  // v11 T5.3: single retry affordance. The pill's `onRetry` and the
  // centre action's `onRetry` both call this handler (T1.3 + T5.3).
  // Error fix (step 3): the host guards against double-tap by
  // ignoring re-entrant calls inside a 1 s window. The FSM
  // naturally hides both affordances after the load dispatch
  // (phase becomes `preparing`, loadingState.kind becomes
  // `preparing`); this guard closes the small race between the
  // dispatch and the next render.
  const [retryInFlight, setRetryInFlight] = useState(false);
  const retryVideo = () => {
    if (!playback) return;
    if (retryInFlight) return;
    setRetryInFlight(true);
    playback.commands
      .dispatch({
        type: 'load',
        request: {source, startPosition: 0, autoplay: true},
      })
      .catch(() => undefined);
    setTimeout(() => {
      setRetryInFlight(false);
    }, 1000);
  };

  // v11 T3.2: real tracks + chapters sections for the MoreSheet.
  // Tracks groups are derived from `session.tracks` (live, so the
  // late-`onFileLoaded` metadata refresh is automatic — error fix
  // in step 4). Chapters rows are derived from `session.chapters`.
  // Both are declared here (after `dispatchSeek`) so the `onSeek`
  // closure can reference it without a temporal-dep error.
  const moreSheetTracks = useMemo<{
    groups: Array<{
      id: string;
      title: string;
      options: Array<{id: string; label: string; selected: boolean}>;
      allowOff?: boolean;
      offSelected?: boolean;
    }>;
    onSelect: (groupId: string, trackId: string | null) => void;
  }>(() => {
    const labelFor = (
      t: (typeof session.tracks)[number],
    ): string => {
      const parts: string[] = [];
      if (t.title) parts.push(t.title);
      else if (t.language) parts.push(t.language.toUpperCase());
      else parts.push(`Track ${t.id}`);
      if (t.codec) parts.push(t.codec);
      return parts.join(' · ');
    };
    const videoOpts = session.tracks
      .filter(t => t.type === 'video')
      .map(t => ({
        id: String(t.id),
        label: labelFor(t),
        selected: t.isSelected,
      }));
    const audioOpts = session.tracks
      .filter(t => t.type === 'audio')
      .map(t => ({
        id: String(t.id),
        label: labelFor(t),
        selected: t.isSelected,
      }));
    const subOpts = session.tracks
      .filter(t => t.type === 'sub')
      .map(t => ({
        id: String(t.id),
        label: labelFor(t),
        selected: t.isSelected,
      }));
    const hasSubSelected = subOpts.some(o => o.selected);
    const groups: Array<{
      id: string;
      title: string;
      options: Array<{id: string; label: string; selected: boolean}>;
      allowOff?: boolean;
      offSelected?: boolean;
    }> = [];
    if (videoOpts.length > 0) {
      groups.push({id: 'video', title: 'Video', options: videoOpts});
    }
    if (audioOpts.length > 0) {
      groups.push({id: 'audio', title: 'Audio', options: audioOpts});
    }
    if (subOpts.length > 0) {
      groups.push({
        id: 'subtitles',
        title: 'Subtitles',
        allowOff: true,
        offSelected: !hasSubSelected,
        options: subOpts,
      });
    }
    return {
      groups,
      onSelect: (groupId, trackId) => {
        if (!playback) return;
        if (trackId === null) {
          // Subtitles "Off" — only the subtitles group supports it.
          if (groupId === 'subtitles') {
            playback.commands
              .dispatch({type: 'set-caption-visibility', visible: false})
              .catch(() => undefined);
          }
          return;
        }
        const id = Number(trackId);
        if (!Number.isInteger(id) || id < 0) return;
        if (groupId === 'subtitles') {
          playback.commands
            .dispatch({type: 'set-caption-visibility', visible: true})
            .catch(() => undefined);
        }
        playback.commands
          .dispatch({type: 'select-track', trackId: id})
          .catch(() => undefined);
      },
    };
  }, [playback, session.tracks]);

  const moreSheetChapters = useMemo(() => {
    if (session.chapters.length === 0) return undefined;
    return {
      rows: session.chapters.map(chapter => ({
        id: String(chapter.id),
        title: chapter.title || `Chapter ${chapter.id + 1}`,
        time: formatChapterTime(chapter.startTime),
        current: chapter.id === session.currentChapterId,
      })),
      onSeek: (id: string) => {
        const numeric = Number(id);
        if (!Number.isInteger(numeric)) return;
        const target = session.chapters.find(c => c.id === numeric);
        if (!target) return;
        dispatchSeek(target.startTime);
        // Spec §4.7: chapter tap seeks + dismisses.
        setMoreSheetVisible(false);
      },
    };
  }, [session.chapters, session.currentChapterId, dispatchSeek]);

  // v11 T3.3: window section. Both rows are gated by capability
  // flags; `canFullscreen` is `false` until T8.1 lands, so the
  // fullscreen row renders as a muted non-tappable chip per Rule 12.
  const moreSheetWindow = useMemo(
    () => ({
      canFullscreen: viewState.capabilities.canFullscreen,
      onToggleFullscreen: toggleFullscreen,
      canPip: viewState.capabilities.canPictureInPicture,
      onPip: requestPip,
    }),
    [
      requestPip,
      toggleFullscreen,
      viewState.capabilities.canFullscreen,
      viewState.capabilities.canPictureInPicture,
    ],
  );

  // v11 T3.3: audio section. The Equalizer row opens the existing
  // audio-Equalizer route; the video pipeline reads the per-band
  // gains from `audioSettingsService`, so a separate video-EQ
  // surface is not required.
  const moreSheetAudio = useMemo(
    () => ({onOpenEqualizer: openEqualizer}),
    [openEqualizer],
  );

  // v11 T4.1: queue section. The data source is the same Redux
  // selector the full-page Queue route reads from (via
  // `useQueueScreen`). The sheet and the route never diverge.
  // Error fix (step 4): `onPlayRow` ignores re-entrant calls within
  // a 250 ms window so a fast double-tap on a row can't double-dispatch
  // the load. The sheet is closed after a successful tap in T4.2.
  const moreSheetQueue = useMemo(() => {
    const matchesVideo = (e: PlaylistEntry) => e.mediaType === 'video';
    const currentRow: VideoMoreSheetRow | null =
      currentFile && matchesVideo(currentFile)
        ? {
            id: currentFile.uri,
            title: currentFile.title,
            meta: 'Now playing',
            badge: 'VIDEO',
          }
        : null;
    const queueRows: VideoMoreSheetRow[] = queueItems
      .filter(matchesVideo)
      .map(e => ({
        id: e.uri,
        title: e.title,
        meta: 'From queue',
        badge: 'VIDEO',
      }));
    const playlistRows: VideoMoreSheetRow[] = playerPlaylist
      .map((e, rawIndex) => ({entry: e, rawIndex}))
      .filter(({entry, rawIndex}) => rawIndex > currentIndex && matchesVideo(entry))
      .map(({entry}) => ({
        id: entry.uri,
        title: entry.title,
        meta: 'From playlist',
        badge: 'VIDEO',
      }));
    return {
      currentRow,
      upNext: [...queueRows, ...playlistRows],
      onPlayRow: (row: VideoMoreSheetRow) => {
        if (queuePlayInFlight.current) return;
        queuePlayInFlight.current = true;
        setTimeout(() => {
          queuePlayInFlight.current = false;
        }, 250);
        const queueIdx = queueItems.findIndex(e => e.uri === row.id);
        if (queueIdx >= 0) {
          dispatch(playFromQueue(queueIdx));
        } else {
          const playlistIdx = playerPlaylist.findIndex(e => e.uri === row.id);
          if (playlistIdx >= 0) {
            dispatch(playFromPlaylist(playlistIdx));
          } else {
            return;
          }
        }
        try {
          MpvPlayer.loadFile(row.id);
        } catch {
          // Surface logged by the bridge; the dispatch is the source
          // of truth.
        }
        // v11 T4.2: dismiss the sheet — playback stays alive. The host
        // does NOT call `closePlayer()`; the surface simply transitions
        // to the new source while the player chrome stays mounted.
        setMoreSheetVisible(false);
      },
      onClear: () => {
        dispatch(clearQueue());
      },
      playing: false,
    };
  }, [
    currentFile,
    currentIndex,
    dispatch,
    playerPlaylist,
    queueItems,
  ]);
  // v11 T2.3: at least one MoreSheet section is source-driven
  // (tracks / chapters). The window + audio sections are always
  // available but their real wiring is in T3.x. For T2.3 we render
  // the `more` button when any source-driven section is present
  // (the stub sheet always has its "coming soon" placeholder).
  const hasMoreSections =
    session.tracks.length > 0 || session.chapters.length > 1;
  const fullChrome = showFullChrome ? (
    <VideoSafeControlLayer
      mode="full"
      session={session}
      capabilities={viewState.capabilities}
      chromeVisible={chromeVisible}
      title={source.title}
      onToggleChrome={() => setChromeVisible(current => !current)}
      onBack={collapsePlayer}
      onClose={closePlayer}
      onPlayPause={() => { dispatchPlayPause().catch(() => undefined); }}
      onSeek={dispatchSeek}
      onSkip={dispatchSkip}
      onEnterPictureInPicture={requestPip}
      onOpenSpeed={openSpeedSheet}
      onToggleCaptions={handleToggleCaptions}
      onToggleBookmark={handleToggleBookmark}
      isBookmarked={isBookmarked}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onToggleLock={handleToggleLock}
      isLocked={isLocked}
      onOpenQueue={openMoreSheet}
      onOpenMore={hasMoreSections ? openMoreSheet : undefined}
      onRetry={retryVideo}
      retryInFlight={retryInFlight}
      bookmarks={bookmarksForFile.map(b => ({id: b.id, position: b.position}))}
    />
  ) : null;
  const miniChrome = showMiniChrome ? (
    <VideoSafeControlLayer
      mode="mini"
      session={session}
      capabilities={viewState.capabilities}
      chromeVisible
      title={source.title}
      // v11 T7.2: pass the active native pointer and the entry's
      // artworkUri so the mini card's 96×54 frame slot can show
      // the live surface (when ready) or fall back to the entry
      // image / gold placeholder.
      nativePtr={nativePtr}
      fallbackUri={active.entry.artworkUri}
      onToggleChrome={expandPlayer}
      onBack={expandPlayer}
      onClose={closePlayer}
      onPlayPause={() => { dispatchPlayPause().catch(() => undefined); }}
      onSeek={dispatchSeek}
      onSkip={dispatchSkip}
      onOpenSpeed={openSpeedSheet}
      bookmarks={bookmarksForFile.map(b => ({id: b.id, position: b.position}))}
    />
  ) : null;

  return (
    <VideoPresentationShell
      presentation={shellPresentation}
      fullChrome={fullChrome}
      miniChrome={miniChrome}
    >
      {nativePtr > 0 ? (
        <VideoSurfaceGestures
          nativePtr={nativePtr}
          sessionDuration={session.duration}
          sessionPosition={session.position}
          isSeekable={session.isSeekable}
          onSeek={dispatchSeek}
          onSetVolume={(volume: number) => {
            playback?.commands
              .dispatch({type: 'set-volume', volume})
              .catch(() => undefined);
          }}
        />
      ) : null}
      <VideoStatusPill loadingState={session.loadingState} onRetry={retryVideo} />
      {/* W2.1: speed picker sheet. Mounted above the surface so it always
          appears on top, regardless of full / mini / PiP state. */}
      <FilterSheet
        visible={speedSheetVisible}
        onClose={closeSpeedSheet}
        title="Playback speed"
        groups={speedSheetGroups}
        value={speedSheetValue}
        onChange={handleSpeedChange}
      />
      {/* v11 T2.3 / T3.2 / T3.3: more-sheet — the player's single
          modal. T3.1 ships the scaffold; T3.2 fills Tracks + Chapters;
          T3.3 fills Window + Audio. The standalone tracks / chapters
          FilterSheets were dropped in T3.3 (parity is proven). */}
      <VideoMoreSheet
        visible={moreSheetVisible}
        onClose={closeMoreSheet}
        queue={moreSheetQueue}
        tracks={moreSheetTracks}
        chapters={moreSheetChapters}
        window={moreSheetWindow}
        audio={moreSheetAudio}
      />
    </VideoPresentationShell>
  );
}

function formatChapterTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

// W2.1: speed presets. The session clamps to [0.25, 4.0] so anything in
// this list is in-range. Order matters — the FilterSheet renders rows in
// declaration order.
const VIDEO_SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const VIDEO_SPEED_LABELS: Record<number, string> = {
  0.5: '0.5',
  0.75: '0.75',
  1: '1',
  1.25: '1.25',
  1.5: '1.5',
  1.75: '1.75',
  2: '2',
};

