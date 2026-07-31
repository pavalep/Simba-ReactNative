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
  /** Milliseconds remaining on the active countdown timer (0 when none) */
  sleepRemainingMs: number;
  /** Whether a sleep timer is armed (countdown or end-of-track/chapter) */
  sleepTimerActive: boolean;
  /** 50.1: how the armed sleep timer will trigger */
  sleepTimerMode: 'time' | 'track' | 'chapter';
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

interface ChapterRange {
  startTime: number;
  endTime: number;
}

interface TransportProviderProps {
  children: ReactNode;
  /** Whether the player is ready (player initialized and file loaded) */
  isReady?: boolean;
  /** Polling interval in ms (default 250) */
  pollInterval?: number;
  /** Whether to enable mpv polling (default true) */
  enabled?: boolean;
  /** 50.2: chapter ranges for end-of-chapter sleep timer mode */
  chapters?: ChapterRange[];
}

// ─── Constants ───────────────────────────────────────────────

/** 50.7: fade volume over the final 10s of a countdown timer */
const FADE_WINDOW_MS = 10_000;
/** Tolerance for "track / chapter has ended" detection (seconds) */
const END_TOLERANCE_S = 0.75;

// ─── Provider ────────────────────────────────────────────────

export const TransportProvider: React.FC<TransportProviderProps> = ({
  children,
  isReady = true,
  pollInterval = 1000,
  enabled = true,
  chapters = [],
}) => {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const dispatch = useAppDispatch();
  const sleepTimerEndTime = useAppSelector(state => state.player.sleepTimerEndTime);
  const sleepTimerMode = useAppSelector(state => state.player.sleepTimerMode);

  // Refs to avoid stale closures in the interval callback
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;
  const sleepTimerEndTimeRef = useRef(sleepTimerEndTime);
  sleepTimerEndTimeRef.current = sleepTimerEndTime;
  const sleepTimerModeRef = useRef(sleepTimerMode);
  sleepTimerModeRef.current = sleepTimerMode;
  const hasPlaybackStateEventsRef = useRef(false);
  const lastPositionRef = useRef(0);
  const lastMoveAtRef = useRef(0);
  const moveStreakRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  const positionRef = useRef(position);
  positionRef.current = position;
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;

  // 50.7: volume fade-out state (captured once, restored on expiry)
  const baseVolumeRef = useRef<number | null>(null);
  const fadeStartedRef = useRef(false);

  const disarmTimer = useCallback(() => {
    dispatch(setSleepTimer(null));
    // Restore the volume that was faded out during the final 10s
    if (fadeStartedRef.current && baseVolumeRef.current !== null) {
      try {
        MpvPlayer.setProperty('volume', baseVolumeRef.current);
      } catch {}
    }
    fadeStartedRef.current = false;
    baseVolumeRef.current = null;
  }, [dispatch]);

  // ── Sleep timer countdown ───────────────────────────────
  // Ticks with the polling interval; pauses playback when the timer expires.
  const [now, setNow] = useState(() => Date.now());
  const sleepRemainingMs =
    sleepTimerEndTime !== null ? Math.max(0, sleepTimerEndTime - now) : 0;

  useEffect(() => {
    if (!enabled) return;
    const armed = sleepTimerEndTimeRef.current !== null || sleepTimerModeRef.current !== 'time';
    if (!armed) return;

    // A fresh timer starts a fresh fade cycle
    fadeStartedRef.current = false;
    baseVolumeRef.current = null;

    const interval = setInterval(() => {
      const endTime = sleepTimerEndTimeRef.current;
      const mode = sleepTimerModeRef.current;

      // ── Time mode: countdown with fade-out in the final 10s (50.7) ──
      if (endTime !== null) {
        const remaining = endTime - Date.now();
        setNow(Date.now());

        if (remaining <= FADE_WINDOW_MS && remaining > 0 && !fadeStartedRef.current) {
          fadeStartedRef.current = true;
          try {
            const cur = Number(MpvPlayer.getProperty?.('volume') ?? 100);
            baseVolumeRef.current = Number.isFinite(cur) ? cur : 100;
          } catch {
            baseVolumeRef.current = 100;
          }
        }

        if (fadeStartedRef.current && baseVolumeRef.current !== null) {
          const factor = Math.max(0, remaining / FADE_WINDOW_MS);
          try {
            MpvPlayer.setProperty('volume', Math.max(1, baseVolumeRef.current * factor));
          } catch {}
        }

        if (remaining <= 0) {
          try {
            MpvPlayer.pause();
          } catch {}
          dispatch(setPlaybackState('paused'));
          disarmTimer();
        }
        return;
      }

      // ── Track / chapter mode: fire when the current segment ends (50.2) ──
      const curPos = positionRef.current;
      const curDur = durationRef.current;
      let segmentEnd: number | null = null;
      if (mode === 'track') {
        segmentEnd = curDur;
      } else if (mode === 'chapter') {
        const ranges = chaptersRef.current;
        if (ranges.length > 0) {
          const current = ranges.find(
            r => curPos >= r.startTime && r.endTime > r.startTime && curPos < r.endTime,
          );
          // Clamp to the media duration so a sentinel endTime never overshoots
          segmentEnd = current ? Math.min(current.endTime, curDur) : curDur;
        } else {
          segmentEnd = curDur;
        }
      }

      if (
        segmentEnd !== null &&
        isPlayingRef.current &&
        segmentEnd - curPos <= END_TOLERANCE_S
      ) {
        try {
          MpvPlayer.pause();
        } catch {}
        dispatch(setPlaybackState('paused'));
        disarmTimer();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [sleepTimerEndTime, sleepTimerMode, enabled, pollInterval, dispatch, disarmTimer]);

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
        sleepTimerActive: sleepTimerEndTime !== null || sleepTimerMode !== 'time',
        sleepTimerMode,
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
