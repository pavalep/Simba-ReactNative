/**
 * V19 W0 Phase 0.4 — `SimbaPlayer` public types.
 *
 * W0 stub: types only. The component is in `SimbaPlayer.tsx`. Wave 4
 * fills in the chrome composition.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §5.3 + audit doc §4.
 */

import type {MediaKind, MediaLane} from '../../../../types/media';
import type {Result, StreamError} from '../../../../infrastructure/player';

/**
 * The declarative source for `<SimbaPlayer source={...} />`.
 *
 * V19 introduces this; the V16 lib uses an ad-hoc `{uri, title,
 * type}` shape. V19 normalizes to a stable union.
 */
export type VideoSource = {
  uri: string;
  title: string;
  kind: Extract<MediaKind, 'video' | 'movie' | 'archive-video' | 'live-tv'>;
  artwork?: string;
};

/**
 * The imperative ref API exposed by `<SimbaPlayer ref={ref} />`.
 *
 * Sourced from the lib's `usePlayer().commands` + facade wrappers.
 * V19 names them canonically so consumers never reach into the lib.
 */
export interface SimbaPlayerRef {
  // ── Transport
  play(): Promise<void>;
  pause(): Promise<void>;
  togglePlayPause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  seekRelative(deltaMs: number): Promise<void>;
  skip(direction: 'forward' | 'backward'): Promise<void>;

  // ── Output
  setVolume(volume: number): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  setVideoQuality(quality: string): Promise<void>;
  setLoopMode(mode: 'none' | 'file' | 'playlist'): Promise<void>;
  setShuffle(enabled: boolean): Promise<void>;
  selectCaptionTrack(trackId: string | null): Promise<void>;
  selectAudioDescriptionTrack(trackId: string | null): Promise<void>;
  setSkipSilence(enabled: boolean): Promise<void>;

  // ── Launch (re-exposed from the lib)
  open(input: {uri: string; title: string; mediaType: MediaKind}): Promise<Result<string, StreamError>>;
  openWithResume(input: {uri: string; title: string; mediaType: MediaKind; positionSec: number}): Promise<Result<string, StreamError>>;
  openPlaylist(input: {
    entries: Array<{uri: string; title: string; mediaType: MediaKind}>;
    title?: string;
    mediaType: MediaLane;
    startIndex?: number;
    startPositionSec?: number;
    shuffle?: boolean;
  }): Promise<Result<string, StreamError>>;
  close(): Promise<void>;

  // ── Presentation (app-side Zustand, NOT lib)
  setPresentation(mode: 'mini' | 'expanded' | 'pip'): void;

  // ── PiP
  enterPip(): Promise<void>;
  exitPip(): Promise<void>;

  // ── Read-only for the dock
  getCurrentUri(): string | null;
  getCurrentTitle(): string | null;
  getCurrentArtwork(): string | null;
}

/**
 * The declarative props for `<SimbaPlayer source={...} ref={ref} />`.
 *
 * V19 SPEC §5.2 — this is what consumers write.
 */
export interface SimbaPlayerProps {
  /** Required. The media source. `null` = unload + reset to idle. */
  source: VideoSource | null;

  /** Deep-link / scrub-to-time only. Mini-expand NEVER sets this. */
  initialPositionMs?: number;

  /** Default `false`. The consumer decides when to play. */
  autoPlay?: boolean;

  /** Default `'contain'`. Letterbox/pillarbox, never crop. */
  aspectRatio?: 'contain' | 'cover';

  /** Optional. Fires on every state transition. */
  onStateChange?: (state: 'idle' | 'preparing' | 'playing' | 'paused' | 'buffering' | 'finished' | 'error') => void;

  /** Optional. Fires on terminal error. Recover via ref. */
  onError?: (error: StreamError) => void;

  /** Optional. Fires on natural EOF (not user-close). */
  onEnded?: () => void;

  /** Optional. Override style. The chrome still owns its layout. */
  style?: object;
}
