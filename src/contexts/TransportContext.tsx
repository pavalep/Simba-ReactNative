import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import {MpvPlayer} from '../native';
import {useAppDispatch, useAppSelector} from '../store';
import {setPlaybackState, setSleepTimer} from '../store/slices/playerSlice';

// ─── Types ──────────────────────────────────────────────────

export interface TransportState {
  position: number;
  duration: number;
  isPlaying: boolean;
  /** Milliseconds remaining on the active sleep timer (0 when none) */
  sleepRemainingMs: number;
  /** Whether a sleep timer is armed */
  sleepTimerActive: boolean;
}

interface TransportContextValue extends TransportState {
  seekTo: (fraction: number) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  /** Manually push a position update (used by event-driven sources) */
  pushPosition: (pos: number) => void;
}

// ─── Context ─────────────────────────────────────────────────

const TransportContext = createContext<TransportContextValue | null>(null);

// ─── Provider Props ──────────────────────────────────────────

interface TransportProviderProps {
  children: ReactNode;
  /** Whether the player is ready (player initialized and file loaded) */
  isReady?: boolean;
  /** Polling interval in ms (default 250) */
  pollInterval?: number;
  /** Whether to enable mpv polling (default true) */
  enabled?: boolean;
}

// ─── Provider ────────────────────────────────────────────────

export const TransportProvider: React.FC<TransportProviderProps> = ({
  children,
  isReady = true,
  pollInterval = 1000,
  enabled = true,
}) => {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const dispatch = useAppDispatch();
  const sleepTimerEndTime = useAppSelector(state => state.player.sleepTimerEndTime);

  // Refs to avoid stale closures in the interval callback
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;
  const sleepTimerEndTimeRef = useRef(sleepTimerEndTime);
  sleepTimerEndTimeRef.current = sleepTimerEndTime;
  const hasPlaybackStateEventsRef = useRef(false);
  const lastPositionRef = useRef(0);
  const lastMoveAtRef = useRef(0);
  const moveStreakRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // ── Sleep timer countdown ───────────────────────────────
  // Ticks with the polling interval; pauses playback when the timer expires.
  const [now, setNow] = useState(() => Date.now());
  const sleepRemainingMs =
    sleepTimerEndTime !== null ? Math.max(0, sleepTimerEndTime - now) : 0;

  useEffect(() => {
    if (!enabled) return;
    if (sleepTimerEndTime === null) return;

    const interval = setInterval(() => {
      const endTime = sleepTimerEndTimeRef.current;
      if (endTime === null) {
        setNow(Date.now());
        return;
      }
      const remaining = endTime - Date.now();
      setNow(Date.now());
      if (remaining <= 0) {
        // Timer expired — pause playback and disarm
        try {
          MpvPlayer.pause();
        } catch {}
        dispatch(setPlaybackState('paused'));
        dispatch(setSleepTimer(null));
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [sleepTimerEndTime, enabled, pollInterval, dispatch]);

  // Position and playback state are event-driven. Poll only duration as a
  // low-frequency fallback; querying mpv across the JS bridge every 250 ms
  // made controls and orientation transitions visibly stutter.
  useEffect(() => {
    if (!isReady || !enabled) return;

    const unsubPosition = MpvPlayer.on('onPositionChanged', ({position: nextPosition}) => {
      if (!isNaN(nextPosition)) setPosition(nextPosition);
      if (!hasPlaybackStateEventsRef.current) {
        const prev = lastPositionRef.current;
        const now = Date.now();
        const moved = nextPosition > prev + 0.12;
        if (moved) {
          moveStreakRef.current = now - lastMoveAtRef.current < 1200 ? moveStreakRef.current + 1 : 1;
          lastMoveAtRef.current = now;
          if (moveStreakRef.current >= 2 && !isPlayingRef.current) {
            setIsPlaying(true);
          }
        }
        lastPositionRef.current = nextPosition;
      }
    });
    const unsubState = MpvPlayer.on('onPlaybackStateChanged', ({state}: {state: string}) => {
      hasPlaybackStateEventsRef.current = true;
      setIsPlaying(state === 'playing');
    });

    const interval = setInterval(() => {
      if (!isReadyRef.current) return;
      try {
        const dur = MpvPlayer.getDuration();

        if (!isNaN(dur)) setDuration(dur || 1);
        if (!hasPlaybackStateEventsRef.current) {
          const now = Date.now();
          if (isPlayingRef.current && now - lastMoveAtRef.current > 1500) {
            moveStreakRef.current = 0;
            setIsPlaying(false);
          }
        }
      } catch {
        // silently ignore if player was destroyed mid-poll
      }
    }, pollInterval);

    return () => {
      clearInterval(interval);
      unsubPosition();
      unsubState();
    };
  }, [isReady, enabled, pollInterval]);

  // ── Actions ──
  const seekTo = useCallback((fraction: number) => {
    try {
      const dur = MpvPlayer.getDuration();
      if (!isNaN(dur)) {
        MpvPlayer.seekTo(fraction * dur);
      }
    } catch {}
  }, []);

  const play = useCallback(() => {
    try { MpvPlayer.resume(); } catch {}
  }, []);

  const pause = useCallback(() => {
    try { MpvPlayer.pause(); } catch {}
  }, []);

  const togglePlayPause = useCallback(() => {
    try {
      if (MpvPlayer.getPlaybackState() === 'playing') {
        MpvPlayer.pause();
      } else {
        MpvPlayer.resume();
      }
    } catch {}
  }, []);

  const pushPosition = useCallback((pos: number) => {
    if (!isNaN(pos)) setPosition(pos);
  }, []);

  return (
    <TransportContext.Provider
      value={{
        position,
        duration,
        isPlaying,
        sleepRemainingMs,
        sleepTimerActive: sleepTimerEndTime !== null,
        seekTo,
        play,
        pause,
        togglePlayPause,
        pushPosition,
      }}>
      {children}
    </TransportContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────

export function useTransport(): TransportContextValue {
  const ctx = useContext(TransportContext);
  if (!ctx) {
    throw new Error('useTransport must be used within a TransportProvider');
  }
  return ctx;
}
