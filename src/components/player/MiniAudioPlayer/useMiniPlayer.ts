import {useCallback, useEffect, useRef, useState} from 'react';
import {useAppSelector, useAppDispatch} from '../../../store';
import {
  setPlaybackState,
  playFromPlaylist,
  playFromQueue,
  clearPlayer,
} from '../../../store/slices/playerSlice';
import {MpvPlayer} from '../../../native';
import {
  resolveNextTransition,
  resolvePreviousTransition,
} from '../../../services/playbackTransitionService';

export function useMiniPlayer() {
  const dispatch = useAppDispatch();
  const {
    currentFile,
    playbackState,
    currentPosition,
    duration,
    sleepTimerEndTime,
    playlist,
    queue,
    currentIndex,
    loopMode,
  } = useAppSelector(state => state.player);

  const dismissPendingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = MpvPlayer.on('onPlaybackStateChanged', ({state}) => {
      dispatch(setPlaybackState(state));
      if (dismissPendingRef.current && state !== 'playing') {
        dismissPendingRef.current = false;
        dispatch(clearPlayer());
      }
    });
    return unsubscribe;
  }, [dispatch]);

  const isActive: boolean =
    playbackState === 'playing' || playbackState === 'paused';
  const isPlaying: boolean = playbackState === 'playing';

  const progress: number =
    duration > 0 ? Math.min(currentPosition / duration, 1) : 0;

  // ── Sleep timer countdown for the badge (32.2) ──
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (sleepTimerEndTime === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sleepTimerEndTime]);
  const sleepRemainingMs =
    sleepTimerEndTime !== null ? Math.max(0, sleepTimerEndTime - now) : 0;

  const handlePlayPause = useCallback(() => {
    try {
      if (MpvPlayer.getPlaybackState() === 'playing') {
        MpvPlayer.pause();
      } else {
        MpvPlayer.play();
      }
    } catch {
      dispatch(setPlaybackState('error'));
    }
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (!currentFile) return;
    const transition = resolveNextTransition({
      lane: currentFile.mediaType,
      playlist,
      queue,
      currentIndex,
      loopMode,
    });
    if (transition.kind === 'ended') {
      dispatch(setPlaybackState('stopped'));
      return;
    }

    if (transition.kind === 'queue') {
      dispatch(playFromQueue(transition.queueIndex));
    } else {
      dispatch(playFromPlaylist(transition.playlistIndex));
    }
    try {
      MpvPlayer.loadFile(transition.entry.uri);
    } catch {
      dispatch(setPlaybackState('error'));
    }
  }, [currentFile, currentIndex, dispatch, loopMode, playlist, queue]);

  const handlePrevious = useCallback(() => {
    if (!currentFile) return;
    const position = MpvPlayer.getPosition?.() ?? currentPosition;
    if (position > 5) {
      try {
        MpvPlayer.seekTo(0);
      } catch {
        dispatch(setPlaybackState('error'));
      }
      return;
    }

    const transition = resolvePreviousTransition({
      lane: currentFile.mediaType,
      playlist,
      queue,
      currentIndex,
      loopMode,
    });
    if (transition.kind === 'restart') {
      try {
        MpvPlayer.seekTo(0);
      } catch {
        dispatch(setPlaybackState('error'));
      }
      return;
    }

    dispatch(playFromPlaylist(transition.playlistIndex));
    try {
      MpvPlayer.loadFile(transition.entry.uri);
    } catch {
      dispatch(setPlaybackState('error'));
    }
  }, [currentFile, currentIndex, currentPosition, dispatch, loopMode, playlist, queue]);

  // Swipe-down or explicit close: clear only after native pause is confirmed.
  const handleDismiss = useCallback(() => {
    if (!currentFile) return;
    try {
      if (MpvPlayer.getPlaybackState() !== 'playing') {
        dispatch(clearPlayer());
        return;
      }
      dismissPendingRef.current = true;
      MpvPlayer.pause();
    } catch {
      dismissPendingRef.current = false;
      dispatch(setPlaybackState('error'));
    }
  }, [currentFile, dispatch]);

  return {
    // Idle state: never surface the mini player without an active track
    isVisible: isActive && !!currentFile,
    isPlaying,
    currentTrack: currentFile,
    currentPosition,
    duration,
    progress,
    sleepRemainingMs,
    sleepTimerActive: sleepTimerEndTime !== null,
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleDismiss,
  };
}
