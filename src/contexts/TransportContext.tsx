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

// ─── Types ──────────────────────────────────────────────────

export interface TransportState {
  position: number;
  duration: number;
  isPlaying: boolean;
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
  isReady: boolean;
  /** Polling interval in ms (default 250) */
  pollInterval?: number;
  /** Whether to enable mpv polling (default true) */
  enabled?: boolean;
}

// ─── Provider ────────────────────────────────────────────────

export const TransportProvider: React.FC<TransportProviderProps> = ({
  children,
  isReady,
  pollInterval = 250,
  enabled = true,
}) => {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs to avoid stale closures in the interval callback
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;

  // ── Polling loop ──
  useEffect(() => {
    if (!isReady || !enabled) return;

    const interval = setInterval(() => {
      if (!isReadyRef.current) return;
      try {
        const pos = MpvPlayer.getPosition();
        const dur = MpvPlayer.getDuration();
        const playing = MpvPlayer.getPlaybackState() === 'playing';

        if (!isNaN(pos)) setPosition(pos);
        if (!isNaN(dur)) setDuration(dur || 1);
        setIsPlaying(playing);
      } catch {
        // silently ignore if player was destroyed mid-poll
      }
    }, pollInterval);

    return () => clearInterval(interval);
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
      value={{position, duration, isPlaying, seekTo, play, pause, togglePlayPause, pushPosition}}>
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
