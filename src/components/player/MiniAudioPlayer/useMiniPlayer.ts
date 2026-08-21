import {useCallback, useEffect, useState} from 'react';
import {useAppSelector, useAppDispatch} from '../../../store';
import {
  setPlaybackState,
  playFromPlaylist,
  playFromQueue,
  clearPlayer,
} from '../../../store/slices/playerSlice';
import {MpvPlayer} from '../../../native';
import {usePlaybackCommands} from '../../../modules/playback';
import {
  resolveNextTransition,
  resolvePreviousTransition,
} from '../../../services/playbackTransitionService';

export function useMiniPlayer() {
  const dispatch = useAppDispatch();
  const {closePlayer} = usePlaybackCommands();
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

  useEffect(() => {
    const unsubscribe = MpvPlayer.on('onPlaybackStateChanged', ({state}) => {
      dispatch(setPlaybackState(state));
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

  // Explicit close always removes the mini surface. Playback is paused first;
  // the player state is cleared immediately so a missed native event cannot
  // leave an unclosable stale mini-player mounted.
  const handleDismiss = useCallback(() => {
    try {
      if (currentFile && MpvPlayer.getPlaybackState() === 'playing') {
        MpvPlayer.pause();
      }
    } catch {
      dispatch(setPlaybackState('error'));
    } finally {
      dispatch(clearPlayer());
      closePlayer();
    }
  }, [closePlayer, currentFile, dispatch]);

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
