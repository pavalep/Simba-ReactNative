import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  getMpvPlayerModule,
  subscribePlayerEvent,
  type MpvPlaybackState,
} from '@simba-dev/react-native-media-player';
import {logger} from '../lib/logger';
import {normalizeBufferedRanges} from '../utils/bufferedRanges';
import {useAppDispatch, useAppSelector} from '../store';
import {setPlaybackState, setSleepTimer} from '../store/slices/playerSlice';

// ─── Types ──────────────────────────────────────────────────

export interface TransportState {
  position: number;
  duration: number;
  isPlaying: boolean;
  /** True only after a natural end-of-file event for the current item. */
  isEnded: boolean;
  /** P33.4: mpv cache fill in progress (stream stalls) */
  isBuffering: boolean;
  /**
   * Buffered ranges — list of `{start, end}` seconds describing the
   * portion of the stream currently resident in the demuxer cache.
   * Empty when no cache is active (e.g. very short local files).
   * This is what backs the grey "downloaded" overlay on the seek bar.
   */
  bufferedRanges: Array<{start: number; end: number}>;
  /** Cache fill ratio 0..1 — used by the loading spinner / progress UI. */
  cacheFill: number;
  /** Whether the stream is seekable. False for live streams. */
  isSeekable: boolean;
  /** Whether mpv is resolving a seek, including a remote range fetch. */
  isSeeking: boolean;
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
  // A5: the JSDoc on line 71 says "(default 250)"; the previous default
  // was 1000 (1s granularity was too coarse for the position rail and
  // sleep-timer fade window). 250ms matches the 4 Hz refresh rate the
  // audio side wants.
  pollInterval = 250,
  enabled = true,
  chapters = [],
}) => {
  // V13 Phase 53b: resolve the module bridge once. The bridge is a
  // module-scope singleton inside the module; the no-op fallback kicks
  // in when the native module is absent (jest, web previews).
  const bridge = useMemo(() => getMpvPlayerModule(), []);

  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  // Buffered ranges (from `demuxer-cache-state`) — used by the seek bar
  // to paint the grey "downloaded" overlay like YouTube. Empty when no
  // cache is active.
  const [bufferedRanges, setBufferedRanges] = useState<
    Array<{start: number; end: number}>
  >([]);
  // Cache fill ratio 0..1 — used by the loading spinner / progress UI.
  const [cacheFill, setCacheFill] = useState(0);
  // Whether seeking is permitted. False for live streams and unknown
  // length sources. Used to dim the seek bar / disable scrubbing.
  const [isSeekable, setIsSeekable] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
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
  const lastCacheRangesSignatureRef = useRef('');

  // 50.7: volume fade-out state (captured once, restored on expiry)
  const baseVolumeRef = useRef<number | null>(null);
  const fadeStartedRef = useRef(false);

  const disarmTimer = useCallback(() => {
    dispatch(setSleepTimer(null));
    // Restore the volume that was faded out during the final 10s
    if (fadeStartedRef.current && baseVolumeRef.current !== null) {
      try {
        bridge.setProperty('volume', baseVolumeRef.current);
      } catch {}
    }
    fadeStartedRef.current = false;
    baseVolumeRef.current = null;
  }, [dispatch, bridge]);

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
            const cur = Number(bridge.getProperty('volume') ?? 100);
            baseVolumeRef.current = Number.isFinite(cur) ? cur : 100;
          } catch {
            baseVolumeRef.current = 100;
          }
        }

        if (fadeStartedRef.current && baseVolumeRef.current !== null) {
          const factor = Math.max(0, remaining / FADE_WINDOW_MS);
          try {
            bridge.setProperty('volume', Math.max(1, baseVolumeRef.current * factor));
          } catch {}
        }

        if (remaining <= 0) {
          try {
            bridge.pause();
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
          bridge.pause();
        } catch {}
        dispatch(setPlaybackState('paused'));
        disarmTimer();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [sleepTimerEndTime, sleepTimerMode, enabled, pollInterval, dispatch, disarmTimer, bridge]);

  // The native bridge may not emit dedicated position/state events on every
  // build. Keep the event subscriptions for low-latency updates, but also poll
  // the synchronous mpv properties so the UI cannot remain frozen at 0:00 or
  // show PAUSED while the native player is actually advancing.
  useEffect(() => {
    if (!isReady || !enabled) return;

    // V13 Phase 53b: `MpvPlayer.on(event, handler)` becomes
    // `subscribePlayerEvent(event, handler)`. The event names and
    // payload shapes are the same — only the call site moved into the
    // module. The unsubscribe function returned by `subscribePlayerEvent`
    // is structurally identical to the V11 one (both `() => void`),
    // so the cleanup logic is unchanged.
    const unsubPosition = subscribePlayerEvent('onPositionChanged', ({position: nextPosition}) => {
      if (!isNaN(nextPosition)) setPosition(nextPosition);
      if (!hasPlaybackStateEventsRef.current) {
        const prev = lastPositionRef.current;
        const timestamp = Date.now();
        const moved = nextPosition > prev + 0.12;
        if (moved) {
          moveStreakRef.current = timestamp - lastMoveAtRef.current < 1200 ? moveStreakRef.current + 1 : 1;
          lastMoveAtRef.current = timestamp;
          if (moveStreakRef.current >= 2 && !isPlayingRef.current) {
            setIsPlaying(true);
          }
        }
        lastPositionRef.current = nextPosition;
      }
    });
    const unsubState = subscribePlayerEvent('onPlaybackStateChanged', ({state}) => {
      hasPlaybackStateEventsRef.current = true;
      setIsPlaying(state === 'playing');
      if (state === 'playing') setIsEnded(false);
    });
    const unsubEndFile = subscribePlayerEvent('onEndFile', ({reason}) => {
      if (reason !== 0) return;
      setIsPlaying(false);
      setIsEnded(true);
      dispatch(setPlaybackState('stopped'));
      logger.info('[PlaybackTrace][Transport][ended]', {position: positionRef.current, duration: durationRef.current});
    });
    const unsubFileLoaded = subscribePlayerEvent('onFileLoaded', () => {
      lastCacheRangesSignatureRef.current = '';
      setBufferedRanges([]);
      setCacheFill(0);
      setIsBuffering(false);
      setIsSeeking(false);
      setIsEnded(false);
      setIsSeekable(true);
      logger.info('[PlaybackTrace][Transport][file-loaded] reset cache-range state');
    });
    // ── Buffering / cache-state observation ──────────────────────
    // We watch FOUR complementary MPV properties to drive buffering UX.
    //
    //   1. `cache-buffering-state`  (NODE → {percent})
    //      Granular fill percentage. Only fires for network streams.
    //
    //   2. `paused-for-cache`       (FLAG → bool)
    //      Universal "MP3 auto-paused because the cache can't keep up"
    //      signal. Fires for any stream type — HLS, DASH, progressive
    //      HTTP, even local files when you seek backwards past the
    //      cached region. Reliable.
    //
    //   3. `demuxer-cache-state`    (NODE → {ranges:[{start,end}], ...})
    //      The buffered ranges — what backs the grey "downloaded"
    //      overlay on the seek bar. Multiple ranges are possible
    //      (e.g. a network stream that's been seeked around).
    //
    //   4. `seekable`               (FLAG → bool)
    //      Whether seeking is supported at all (false for live and
    //      unknown-length sources). Used to dim the seek bar.
    //
    // The native bridge merges `cache-buffering-state` and
    // `paused-for-cache` into a single `onBuffering` event with a
    // `percent` payload so the consumer has one boolean to watch.
    const unsubBuffering = subscribePlayerEvent('onBuffering', ({percent, isBuffering: buffering}) => {
      const normalized = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 100;
      if (normalized > 0 || buffering === false) setCacheFill(normalized / 100);
      setIsBuffering(buffering ?? (normalized > 0 && normalized < 100));
    });
    const unsubCacheState = subscribePlayerEvent(
      'onCacheState',
      ({ranges}) => {
        const rawRanges = ranges.map(range => ({start: range.start, end: range.end}));
        const normalizedRanges = normalizeBufferedRanges(
          rawRanges,
          durationRef.current > 1 ? durationRef.current : undefined,
        );
        const signature = JSON.stringify(normalizedRanges);
        if (signature === lastCacheRangesSignatureRef.current) return;
        lastCacheRangesSignatureRef.current = signature;
        logger.info('[PlaybackTrace][Transport][cache-ranges]', {
          rawRanges,
          normalizedRanges,
          duration: durationRef.current,
        });
        setBufferedRanges(normalizedRanges);
      },
    );
    const unsubSeekable = subscribePlayerEvent('onSeekable', ({seekable}) => {
      setIsSeekable(seekable);
    });
    const unsubSeeking = subscribePlayerEvent('onSeeking', ({seeking}) => {
      setIsSeeking(seeking);
      if (seeking) setIsEnded(false);
      logger.info('[PlaybackTrace][Transport][seeking]', {
        seeking,
        position: positionRef.current,
        duration: durationRef.current,
      });
    });

    // Begin receiving the four property streams from MPV.
    // observeProperty() is idempotent for the same property — calling it
    // twice is safe and only registers one observer.
    try {
      bridge.observeProperty('cache-buffering-state');
    } catch {}
    try {
      bridge.observeProperty('paused-for-cache');
    } catch {}
    try {
      bridge.observeProperty('demuxer-cache-state');
    } catch {}
    try {
      bridge.observeProperty('seekable');
    } catch {}
    try {
      bridge.observeProperty('seeking');
    } catch {}

    const interval = setInterval(() => {
      if (!isReadyRef.current) return;
      try {
        const nextPosition = bridge.getPosition();
        const dur = bridge.getDuration();
        const nativeState = bridge.getPlaybackState();

        if (Number.isFinite(nextPosition) && nextPosition >= 0) {
          if (nextPosition > lastPositionRef.current + 0.12) {
            lastMoveAtRef.current = Date.now();
            moveStreakRef.current += 1;
          }
          lastPositionRef.current = nextPosition;
          setPosition(nextPosition);
        }
        if (Number.isFinite(dur) && dur > 0) setDuration(dur);

        const nativeIsPlaying: boolean = nativeState === 'playing';
        if (nativeIsPlaying !== isPlayingRef.current) {
          setIsPlaying(nativeIsPlaying);
        }
      } catch {
        // silently ignore if player was destroyed mid-poll
      }
    }, pollInterval);

    return () => {
      clearInterval(interval);
      unsubPosition();
      unsubState();
      unsubEndFile();
      unsubFileLoaded();
      unsubBuffering();
      unsubCacheState();
      unsubSeekable();
      unsubSeeking();
      // Stop receiving buffer-state updates so this provider doesn't
      // leak listeners when the screen unmounts.
      try {
        bridge.unobserveProperty('cache-buffering-state');
      } catch {}
      try {
        bridge.unobserveProperty('paused-for-cache');
      } catch {}
      try {
        bridge.unobserveProperty('demuxer-cache-state');
      } catch {}
      try {
        bridge.unobserveProperty('seekable');
      } catch {}
      try {
        bridge.unobserveProperty('seeking');
      } catch {}
    };
  }, [dispatch, isReady, enabled, pollInterval, bridge]);

  // ── Actions ──
  const seekTo = useCallback((fraction: number) => {
    try {
      const dur = bridge.getDuration();
      if (!isNaN(dur)) {
        // V13: the module's seekAbsolute takes seconds (same as V11's
        // seekTo). The two are semantically identical.
        bridge.seekAbsolute(fraction * dur);
      }
    } catch {}
  }, [bridge]);

  const play = useCallback(() => {
    // V13: the module exposes `play()` as the canonical "resume / start"
    // command. V11 had a separate `resume()` alias; the module
    // consolidates them.
    try { bridge.play(); } catch {}
  }, [bridge]);

  const pause = useCallback(() => {
    try { bridge.pause(); } catch {}
  }, [bridge]);

  const togglePlayPause = useCallback(() => {
    try {
      if (bridge.getPlaybackState() === 'playing') {
        bridge.pause();
      } else {
        bridge.play();
      }
    } catch {}
  }, [bridge]);

  const pushPosition = useCallback((pos: number) => {
    if (!isNaN(pos)) setPosition(pos);
  }, []);

  return (
    <TransportContext.Provider
      value={{
        position,
        duration,
        isPlaying,
        isEnded,
        isBuffering,
        bufferedRanges,
        cacheFill,
        isSeekable,
        isSeeking,
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

// Suppress unused-import warning for the type-only re-export below.
// `MpvPlaybackState` is re-exported from this module for downstream
// consumers (e.g. audio screens) that need the bridge's playback-state
// union when dispatching Redux actions. Keeping the import in the type
// position so the re-export survives any future refactor.
export type {MpvPlaybackState};
