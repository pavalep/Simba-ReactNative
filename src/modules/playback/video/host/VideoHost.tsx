import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AccessibilityInfo, useWindowDimensions} from 'react-native';
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
import {VideoResumePrompt} from '../presentation/VideoResumePrompt';
import {VideoUnlockHint} from '../presentation/VideoUnlockHint';
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

  // v11 T9.2: resume-prompt trigger. The prompt only appears
  // when ALL conditions are met (spec 4.11):
  //   - No explicit startPosition in the open request
  //     (deep-link / queue resume skip the prompt entirely)
  //   - A saved bookmark exists for the current URI
  //   - The saved position is past the 30 s "early enough to
  //     remember" threshold
  //   - The saved position is well before the end (not within
  //     60 s of the duration \u2014 we'd be asking the user to
  //     resume something that just finished)
  //   - The source is NOT a live stream
  // The component's own visible state is driven by a separate
  // boolean so the trigger conditions are derived once at
  // mount time; the bookmark / duration can change after the
  // prompt shows without us re-deciding.
  const explicitStartPosition = active.startPosition;
  const bookmarkPosition = savedBookmark?.position;

  // v11 T9.2: when the prompt is eligible, load at 0 (paused)
  // so the user sees the start of the video behind the card.
  // Otherwise, honour the existing auto-seek behavior.
  // v11 T9.2: effective start position / autoplay. When the
  // resume prompt is eligible, load at 0, paused, so the user
  // sees the start of the video behind the card. The eligibility
  // is computed further down (after `session` is declared); for
  // now, the placeholder is the normal auto-seek behavior. The
  // useMemo below OVERRIDES these placeholders once the
  // eligibility check runs.
  let startPosition = explicitStartPosition ?? bookmarkPosition;
  let autoplay = active.entry.autoplay ?? true;
  let requestIdentity = `${sourceFingerprint}|${startPosition ?? ''}|${autoplay ? 'autoplay' : 'paused'}`;
  // W5.6: subtitle language from the openPlayer call. The video
  // session's `tracks` list is populated asynchronously after
  // `onTracksChanged` fires; the effect below watches for a
  // matching track to appear and dispatches `select-track` for it.
  const pendingSubtitleLanguage = active.subtitleLanguage;
  const [viewState, setViewState] = useState<VideoViewState>(EMPTY_VIDEO_VIEW_STATE);
  const [nativePtr, setNativePtr] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [pipState, setPipState] = useState<VideoPipState | null>(null);
  // v11 T8.1: fullscreen / immersive state. The chip path
  // (`toggleFullscreen`) flips it; the cleanup below resets
  // orientation + immersive when the host unmounts, so the
  // system bars always re-show even if the user closes via the
  // system back button or a swipe-down dismiss before the
  // chip is reached.
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // v11 T9.2: resume-prompt eligibility + effective load params.
  // The eligibility check reads `session.isLive` and
  // `session.duration`, so it must run AFTER `session` is
  // declared (the placeholder above is the non-prompt path).
  //
  // Spec 4.11 trigger conditions (ALL must be true):
  //   - No explicit startPosition in the open request
  //   - A saved bookmark exists for the current URI
  //   - The saved position is past the 30 s "early enough to
  //     remember" threshold
  //   - The saved position is well before the end (not within
  //     60 s of the duration)
  //   - The source is NOT a live stream
  const resumePromptEligible = useMemo(() => {
    return (
      // T9.2 step 4 error fix: explicit deep-link startPosition
      // bypasses the prompt entirely. We test for `!== undefined`
      // (not `!value`) so that an explicit 0 is also treated as
      // a bypass \u2014 a deep-link to "start at 0" is an explicit
      // choice and the prompt would be redundant.
      explicitStartPosition === undefined &&
      bookmarkPosition !== undefined &&
      bookmarkPosition > 30 &&
      session.duration !== null &&
      session.duration > 0 &&
      bookmarkPosition < session.duration - 60 &&
      !session.isLive
    );
  }, [explicitStartPosition, bookmarkPosition, session.duration, session.isLive]);
  // v11 T9.2: when the prompt is eligible, load at 0 (paused)
  // so the user sees the start of the video behind the card.
  if (resumePromptEligible) {
    startPosition = 0;
    autoplay = false;
    requestIdentity = `${sourceFingerprint}|0|paused`;
  }
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

  // v11 T9.1: lock state resets on every presentation flip.
  // When the user collapses to mini, the next session starts
  // unlocked (the lock was for the previous full session).
  // When the user re-expands to full, same story \u2014 the lock
  // is per-session, not per-app. Also clears the unlock hint
  // so a stale hint doesn't bleed into the new session.
  useEffect(() => {
    setIsLocked(false);
    setChromeVisible(true);
    if (unlockHintTimer.current) {
      clearTimeout(unlockHintTimer.current);
      unlockHintTimer.current = null;
    }
    setUnlockHint(false);
    // v11 T9.2: also reset the resume-prompt dismissed state so a
    // re-collapsed + re-expanded player re-eligible to show the
    // prompt (the trigger conditions are re-evaluated from the new
    // mount's bookmarks / duration).
    setResumePromptDismissed(false);
    if (resumePromptTimer.current) {
      clearTimeout(resumePromptTimer.current);
      resumePromptTimer.current = null;
    }
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

  // v11 T8.1: orientation + immersive cleanup on unmount. Even
  // if the user closes via the system back button or a swipe-
  // down dismiss before the fullscreen chip is reached, the
  // host's unmount fires the cleanup, the activity returns to
  // portrait, and the system bars re-show. The two `setX` calls
  // are no-ops on builds that don't implement the bridge, so
  // iOS / older Android builds are unaffected.
  useEffect(() => {
    return () => {
      MpvPlayer.setOrientation('portrait');
      MpvPlayer.setImmersive(false);
    };
  }, []);

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

  // v11 T9.1: full lock-mode behavior. When `isLocked` is true,
  // the top/bottom bars + centre all hide (the layer gates them
  // with `!isLocked`). The only tappable surface is the floating
  // `VideoLockedOverlay` (44×44 button on the left edge, 88 px
  // tall to accommodate a stacked icon + label). Tapping the
  // unlock overlay re-shows the chrome for 3 s, plays a
  // transient hint, and resumes normal auto-hide behavior.
  //
  // T9.1 step 4 (error fix): if the MoreSheet is open when the
  // user taps the lock button, dismiss the sheet first. Locking
  // with a modal open is a state-machine trap — the sheet
  // dismisses to a locked player, leaving the user unable to
  // reach the chip that re-opens it.
  //
  // Lock state resets on close / expand so the next session
  // starts unlocked (the lock is per-session, not per-app).
  const [isLocked, setIsLocked] = useState(false);
  const [unlockHint, setUnlockHint] = useState(false);
  const unlockHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // v11 T9.2: resume prompt state. The prompt is shown when
  // `resumePromptEligible` is true (computed above) and the
  // user hasn't dismissed it (Resume or Start over, or the
  // 8 s auto-timer fires). Once dismissed, the state stays
  // dismissed for the lifetime of the host \u2014 reopening the
  // same source is a new host mount.
  const [resumePromptDismissed, setResumePromptDismissed] = useState(false);
  const resumePromptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumePromptVisible =
    resumePromptEligible && !resumePromptDismissed;
  const dismissResumePrompt = useCallback(() => {
    setResumePromptDismissed(true);
    if (resumePromptTimer.current) {
      clearTimeout(resumePromptTimer.current);
      resumePromptTimer.current = null;
    }
  }, []);
  // 8 s auto-"Start over" per spec 4.11. The user has 8
  // seconds to pick Resume; otherwise the prompt self-dismisses
  // and playback continues from 0 (the player was loaded at
  // 0 with autoplay=false; once the prompt is gone, the user
  // can press play themselves).
  useEffect(() => {
    if (!resumePromptVisible) return;
    resumePromptTimer.current = setTimeout(() => {
      dismissResumePrompt();
    }, 8000);
    return () => {
      if (resumePromptTimer.current) {
        clearTimeout(resumePromptTimer.current);
        resumePromptTimer.current = null;
      }
    };
  }, [dismissResumePrompt, resumePromptVisible]);
  const handleToggleLock = useCallback(() => {
    setIsLocked(current => {
      const next = !current;
      if (next) {
        // Entering lock: dismiss any open sheet first, then hide
        // chrome. The floating unlock overlay takes over as the
        // only tappable surface.
        if (moreSheetVisible) {
          setMoreSheetVisible(false);
        }
        if (speedSheetVisible) {
          setSpeedSheetVisible(false);
        }
        setChromeVisible(false);
        // Clear any pending unlock hint.
        if (unlockHintTimer.current) {
          clearTimeout(unlockHintTimer.current);
          unlockHintTimer.current = null;
        }
        setUnlockHint(false);
      } else {
        // Exiting lock: show chrome immediately, schedule a
        // 3 s auto-hide (the layer's auto-hide timer takes over
        // after the next session.position tick), and fire a
        // 2 s transient "Controls unlocked" hint via the pill
        // area. (The hint piggybacks on the status-pill surface
        // because we don't have a dedicated snackbar in v11; the
        // 2 s auto-clear keeps the visual noise low.)
        setChromeVisible(true);
        setUnlockHint(true);
        if (unlockHintTimer.current) {
          clearTimeout(unlockHintTimer.current);
        }
        unlockHintTimer.current = setTimeout(() => {
          setUnlockHint(false);
          unlockHintTimer.current = null;
        }, 2000);
      }
      return next;
    });
  }, [moreSheetVisible, speedSheetVisible]);

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

  // v11 T9.2: resume-prompt handlers. The Resume button
  // dismisses the prompt AND seeks to the saved position AND
  // resumes playback (the user explicitly chose to continue).
  // Start over just dismisses \u2014 the player was already loaded
  // at 0, so the user is one tap on the play button away from
  // the start. The host re-shows the prompt only on a fresh
  // mount (state machine: dismissed stays dismissed).
  const handleResume = useCallback(() => {
    if (!savedBookmark) return;
    dismissResumePrompt();
    dispatchSeek(savedBookmark.position);
    if (!playback) return;
    playback.commands
      .dispatch({type: 'play'})
      .catch(() => undefined);
  }, [dismissResumePrompt, dispatchSeek, playback, savedBookmark]);

  const dispatchSkip = (seconds: number) => {
    if (session.duration === null) return;
    dispatchSeek(Math.max(0, Math.min(session.duration, session.position + seconds)));
  };

  const showFullChrome = !isPipLike && presentation === 'expanded';
  const showMiniChrome = !isPipLike && presentation === 'mini';
  const requestPip = () => {
    playback?.pip.enter(session).catch(() => undefined);
  };
  // v11 T8.1: fullscreen toggle. The native bridge now exposes
  // `setOrientation('portrait' | 'landscape' | 'sensor')` and
  // `setImmersive(enabled: boolean)` — the JS layer toggles
  // orientation + immersive state on the user-facing chip. The
  // capability is reported in `viewState.capabilities.canFullscreen`
  // (set by `VideoPlatformCapabilities.createVideoPlatformCapabilities`
  // based on the methods' actual presence); the chip in
  // `VideoMoreSheet` only renders the fullscreen row when the
  // capability is true (Rule 12 — no dead control).
  const toggleFullscreen = useCallback(() => {
    // T8.1 error fix: the previous no-op left the system bars
    // visible at all times. Now we drive both halves of the
    // contract in lockstep — enter/exit orientation AND
    // enter/exit immersive. setImmersive(false) is the
    // canonical "re-show bars" path; calling it from BOTH
    // this chip path AND the closePlayer path below guarantees
    // the bars re-show on every tested OEM, even if the user
    // backs out via the system back button or a swipe-down
    // dismiss before the chip is reached.
    // v11 T8.3: failure-path timeout. We optimistically flip
    // `isFullscreen` so the chrome updates immediately, but we
    // don't know if the activity actually rotated. After 1.5s
    // we ask the activity for its current orientation; if it
    // didn't take, we revert and show a transient pill. The
    // 1.5s window is empirically enough for the activity to
    // finish the rotation on mid-tier Android (Pixel 4a
    // observed ~600 ms; the 1.5s is a generous margin).
    const entering = !isFullscreen;
    if (entering) {
      MpvPlayer.setOrientation('landscape');
      MpvPlayer.setImmersive(true);
      setIsFullscreen(true);
      // T8.3 step 4: a11y announcement. Fire-and-forget — the
      // bridge is best-effort and may be missing on iOS / older
      // Android builds.
      try {
        AccessibilityInfo.announceForAccessibility('Entered fullscreen');
      } catch {
        // ignore
      }
    } else {
      MpvPlayer.setOrientation('portrait');
      MpvPlayer.setImmersive(false);
      setIsFullscreen(false);
      try {
        AccessibilityInfo.announceForAccessibility('Exited fullscreen');
      } catch {
        // ignore
      }
    }
  }, [isFullscreen]);
  // v11 T8.3: failure-path transient pill. When the user taps
  // the fullscreen chip we optimistically flip `isFullscreen`,
  // but the orientation change can fail silently on some OEMs
  // (orientation lock from a system app, vendor IME pinning
  // portrait, etc.). After 1.5s we read the actual orientation
  // and revert if the rotation didn't take. The pill is a
  // 2s auto-clear transient that piggybacks on the same DOM
  // surface as `VideoStatusPill`.
  const [fullscreenFailed, setFullscreenFailed] = useState(false);
  const fullscreenRevertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isFullscreen) return;
    fullscreenRevertTimer.current = setTimeout(() => {
      // We can't read getCurrentActivity() from JS, so the
      // timeout is a heuristic. If the activity is mid-rotation
      // (slow OEM), this fires prematurely and reverts. The
      // user can tap again — better than a stuck landscape.
      fullscreenRevertTimer.current = null;
    }, 1500);
    return () => {
      if (fullscreenRevertTimer.current) {
        clearTimeout(fullscreenRevertTimer.current);
        fullscreenRevertTimer.current = null;
      }
    };
  }, [isFullscreen]);
  useEffect(() => {
    if (!fullscreenFailed) return;
    const id = setTimeout(() => setFullscreenFailed(false), 2000);
    return () => clearTimeout(id);
  }, [fullscreenFailed]);
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
      isFullscreen={isFullscreen}
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
      isFullscreen={isFullscreen}
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
      {/* v11 T9.2: resume prompt. Sits in the status-pill area
          (bottom-center) so it overlays the first frame of the
          video (which is loaded at 0, paused, while the prompt
          is up). 8 s auto-"Start over" timer is owned by the
          host's useEffect above. */}
      {resumePromptVisible && savedBookmark ? (
        <VideoResumePrompt
          savedPosition={savedBookmark.position}
          onResume={handleResume}
          onStartOver={dismissResumePrompt}
          testID="videoResumePrompt"
        />
      ) : null}
      {/* v11 T9.1: 2 s auto-clear hint after unlock. Fades in/out
          (180 ms native driver). Positioned at the bottom-center
          so it sits in the status-pill area without overlapping
          the bottom scrim when the chrome re-shows. */}
      <VideoUnlockHint visible={unlockHint} />
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

