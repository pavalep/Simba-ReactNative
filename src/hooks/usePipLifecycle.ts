import {useEffect, useCallback, useRef} from 'react';
import {Platform, DeviceEventEmitter} from 'react-native';
import {NativeModules} from 'react-native';
import {useAppDispatch, useAppSelector} from '../store';
import {
  enterPip,
  exitPip,
  resetPipState,
  selectIsInPipMode,
} from '../store/slices/pipSlice';
import {MpvPlayer, MpvChapter} from '../native';
import {clearAllRecent} from '../store/slices/sessionSlice';

const {MpvPlayerModule} = NativeModules;

/**
 * Options for usePipLifecycle hook.
 */
export interface UsePipLifecycleOptions {
  /** URI of the media file being played */
  fileUri: string | undefined;
  /** Display title of the media */
  fileTitle: string;
  /** Current playback chapters */
  chapters: MpvChapter[];
  /** Current playback position in seconds */
  position: number;
  /** Total duration in seconds */
  duration: number;
  /** Callback to hide all UI overlays before PiP entry */
  onHideUi: () => void;
  /** Callback to restore all UI overlays after PiP exit */
  onShowUi: () => void;
  /** Callback to navigate back to main screen on PiP close */
  onNavigateBack: () => void;
}

/**
 * Hook that manages PiP lifecycle transitions.
 *
 * Lifecycle rules:
 * - enter → pause playback, save state with chapter/progress info
 * - exit (tap/expand) → resume playback, restore full UI
 * - close → destroy player, clear state, navigate away
 */
export function usePipLifecycle(options: UsePipLifecycleOptions) {
  const {
    fileUri,
    fileTitle,
    chapters,
    position,
    duration,
    onHideUi,
    onShowUi,
    onNavigateBack,
  } = options;

  const dispatch = useAppDispatch();
  const isInPipMode = useAppSelector(selectIsInPipMode);

  // Refs for latest values (avoids stale closures in event handlers)
  const fileUriRef = useRef(fileUri);
  const fileTitleRef = useRef(fileTitle);
  const chaptersRef = useRef(chapters);
  const positionRef = useRef(position);
  const durationRef = useRef(duration);
  const onHideUiRef = useRef(onHideUi);
  const onShowUiRef = useRef(onShowUi);
  const onNavigateBackRef = useRef(onNavigateBack);

  useEffect(() => { fileUriRef.current = fileUri; }, [fileUri]);
  useEffect(() => { fileTitleRef.current = fileTitle; }, [fileTitle]);
  useEffect(() => { chaptersRef.current = chapters; }, [chapters]);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { onHideUiRef.current = onHideUi; }, [onHideUi]);
  useEffect(() => { onShowUiRef.current = onShowUi; }, [onShowUi]);
  useEffect(() => { onNavigateBackRef.current = onNavigateBack; }, [onNavigateBack]);

  /**
   * Compute current chapter info from position.
   */
  const getChapterInfo = useCallback(() => {
    const chs = chaptersRef.current;
    if (!chs || chs.length === 0) {
      return {chapterTitle: null, chapterIndex: -1};
    }
    const pos = positionRef.current;
    for (let i = chs.length - 1; i >= 0; i--) {
      if (pos >= chs[i].startTime) {
        return {chapterTitle: chs[i].title ?? null, chapterIndex: i};
      }
    }
    return {chapterTitle: null, chapterIndex: -1};
  }, []);

  /**
   * Format progress as a percentage string.
   */
  const getProgressPct = useCallback(() => {
    const dur = durationRef.current;
    if (dur <= 0) return '0 %';
    const pct = Math.round((positionRef.current / dur) * 100);
    return `${Math.min(pct, 100)} %`;
  }, []);

  // ── PiP mode change (enter / exit) ──
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = DeviceEventEmitter.addListener(
      'onPipModeChanged',
      (params: {isInPip: boolean}) => {
        if (params.isInPip) {
          // Entering PiP — save state with chapter/progress info
          const {chapterTitle, chapterIndex} = getChapterInfo();
          const progressPct = getProgressPct();
          dispatch(
            enterPip({
              surfaceUri: fileUriRef.current ?? '',
              fileTitle: fileTitleRef.current,
              chapterTitle,
              chapterIndex,
              progressPercentage: progressPct,
            }),
          );
          // Pause playback while in PiP
          try {
            MpvPlayer.pause();
          } catch {
            // player may already be idle
          }
        } else {
          // Exiting PiP — restore full UI and resume
          onShowUiRef.current();
          dispatch(exitPip());
          // Resume playback
          try {
            MpvPlayer.resume();
          } catch {
            // player may already be destroyed
          }
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [dispatch, getChapterInfo, getProgressPct]);

  // ── PiP RemoteAction events ──
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const playPauseSub = DeviceEventEmitter.addListener(
      'onPipPlayPause',
      () => {
        try {
          MpvPlayer.togglePlayPause();
        } catch {
          // player not available
        }
      },
    );

    const expandSub = DeviceEventEmitter.addListener('onPipExpand', () => {
      // Expand to fullscreen — exit PiP, motion to front restores activity
      try {
        MpvPlayerModule?.exitPip?.();
      } catch {
        // module not available
      }
    });

    const closeSub = DeviceEventEmitter.addListener('onPipClose', () => {
      // Close PiP: destroy player, clear state, navigate away
      try {
        MpvPlayer.stop();
        MpvPlayer.destroy();
      } catch {
        // player already destroyed
      }
      dispatch(clearAllRecent());
      dispatch(resetPipState());
      // Navigate back to main screen
      onNavigateBackRef.current();
    });

    return () => {
      playPauseSub.remove();
      expandSub.remove();
      closeSub.remove();
    };
  }, [dispatch]);

  /**
   * Prepare UI and enter PiP mode.
   * Called by VideoPlayerScreen when swipe-down gesture is detected.
   * Hides UI overlays first, then calls native enterPip.
   */
  const prepareAndEnterPip = useCallback(() => {
    if (Platform.OS !== 'android') return;

    // 1. Hide all UI overlays (only TextureView remains visible)
    onHideUiRef.current();

    // 2. Small delay to let UI hide before PiP captures the surface
    setTimeout(() => {
      try {
        const {chapterTitle} = getChapterInfo();
        const progressPct = getProgressPct();
        MpvPlayerModule?.enterPip?.(chapterTitle, progressPct);
      } catch {
        // PiP not supported
      }
    }, 150);
  }, [getChapterInfo, getProgressPct]);

  return {isInPipMode, prepareAndEnterPip};
}
