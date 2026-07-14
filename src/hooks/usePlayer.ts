import {useCallback} from 'react';
import {useAppDispatch, useAppSelector} from '../store';
import {
  playFile,
  setPlaybackState,
  setPosition,
  setDuration,
  nextTrack,
  previousTrack,
} from '../store/slices/playerSlice';
import {MediaFile, PlaybackState} from '../types';

export const usePlayer = () => {
  const dispatch = useAppDispatch();
  const player = useAppSelector(state => state.player);

  const play = useCallback(
    (file: MediaFile) => {
      dispatch(playFile(file));
    },
    [dispatch],
  );

  const pause = useCallback(() => {
    dispatch(setPlaybackState('paused'));
  }, [dispatch]);

  const resume = useCallback(() => {
    dispatch(setPlaybackState('playing'));
  }, [dispatch]);

  const seek = useCallback(
    (position: number) => {
      dispatch(setPosition(position));
    },
    [dispatch],
  );

  const updateDuration = useCallback(
    (duration: number) => {
      dispatch(setDuration(duration));
    },
    [dispatch],
  );

  const next = useCallback(() => {
    dispatch(nextTrack());
  }, [dispatch]);

  const prev = useCallback(() => {
    dispatch(previousTrack());
  }, [dispatch]);

  return {
    ...player,
    play,
    pause,
    resume,
    seek,
    updateDuration,
    next,
    prev,
  };
};
