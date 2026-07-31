import {useCallback, useEffect, useState} from 'react';
import {useAppSelector, useAppDispatch} from '../../../store';
import {
  setPlaybackState,
  nextTrack,
  previousTrack,
  clearPlayer,
} from '../../../store/slices/playerSlice';
import {MpvPlayer} from '../../../native';

export function useMiniPlayer() {
  const dispatch = useAppDispatch();
  const {currentFile, playbackState, currentPosition, duration, sleepTimerEndTime} =
    useAppSelector(state => state.player);

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
      if (isPlaying) {
        MpvPlayer.pause();
        dispatch(setPlaybackState('paused'));
      } else {
        MpvPlayer.play();
        dispatch(setPlaybackState('playing'));
      }
    } catch {
      // native module not available
    }
  }, [isPlaying, dispatch]);

  const handleNext = useCallback(() => {
    dispatch(nextTrack());
    try {
      MpvPlayer.next();
    } catch {
      // native module not available
    }
  }, [dispatch]);

  const handlePrevious = useCallback(() => {
    dispatch(previousTrack());
    try {
      MpvPlayer.previous();
    } catch {
      // native module not available
    }
  }, [dispatch]);

  // Swipe-down dismiss: pause playback and clear the player (32.4)
  const handleDismiss = useCallback(() => {
    try {
      MpvPlayer.pause();
    } catch {}
    dispatch(clearPlayer());
  }, [dispatch]);

  return {
    // Idle state: never surface the mini player without an active track
    isVisible: isActive && !!currentFile,
    isPlaying,
    currentTrack: currentFile,
    progress,
    sleepRemainingMs,
    sleepTimerActive: sleepTimerEndTime !== null,
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleDismiss,
  };
}
