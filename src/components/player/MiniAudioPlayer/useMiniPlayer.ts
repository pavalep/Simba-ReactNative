import {useCallback} from 'react';
import {useAppSelector, useAppDispatch} from '../../../store';
import {
  setPlaybackState,
  nextTrack,
  previousTrack,
} from '../../../store/slices/playerSlice';
import {MpvPlayer} from '../../../native';

export function useMiniPlayer() {
  const dispatch = useAppDispatch();
  const {currentFile, playbackState, currentPosition, duration} =
    useAppSelector(state => state.player);

  const isActive: boolean =
    playbackState === 'playing' || playbackState === 'paused';
  const isPlaying: boolean = playbackState === 'playing';

  const progress: number =
    duration > 0 ? Math.min(currentPosition / duration, 1) : 0;

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

  return {
    isVisible: isActive,
    isPlaying,
    currentTrack: currentFile,
    progress,
    handlePlayPause,
    handleNext,
    handlePrevious,
  };
}
