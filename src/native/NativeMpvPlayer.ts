import {TurboModule, TurboModuleRegistry} from 'react-native';
import type {Double} from 'react-native/Libraries/Types/CodegenTypes';

// ──────────────────────────────────────────────
// Data Types
// ──────────────────────────────────────────────

export interface MpvFileInfo {
  readonly path: string;
  readonly title: string;
  readonly duration: Double;
  readonly fileSize?: Double;
  readonly metadata?: {readonly [key: string]: string};
}

export interface MpvTrack {
  readonly id: Double;
  readonly type: 'video' | 'audio' | 'sub';
  readonly title?: string;
  readonly lang?: string;
  readonly default: boolean;
  readonly selected: boolean;
  readonly codec?: string;
}

export interface MpvChapter {
  readonly id: Double;
  readonly title: string;
  readonly startTime: Double;
  readonly endTime: Double;
}

export type MpvPlaybackState =
  | 'idle'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'error';

export type MpvLoopMode = 'none' | 'file' | 'playlist';

export interface MpvAudioDevice {
  readonly name: string;
  readonly description: string;
  readonly isDefault: boolean;
}

export interface MpvVideoParams {
  readonly videoWidth: Double;
  readonly videoHeight: Double;
  readonly aspectRatio: Double;
  readonly fps: Double;
  readonly codec: string;
}

export interface MpvPropertyChange {
  readonly property: string;
  readonly value: unknown;
}

// ──────────────────────────────────────────────
// Event payloads
// ──────────────────────────────────────────────

export interface MpvFileLoadedEvent {
  readonly requestId?: string;
  readonly resolvedPath?: string;
  readonly file?: MpvFileInfo;
}

export interface MpvEvents {
  onFileLoaded: MpvFileLoadedEvent;
  onPlaybackStateChanged: {state: MpvPlaybackState};
  onPositionChanged: {position: Double};
  onDurationChanged: {duration: Double};
  onPropertyChanged: {property: string; value: unknown};
  onTracksChanged: {tracks: MpvTrack[]};
  onChapterChanged: {chapter: MpvChapter | null};
  onVideoParamsChanged: {params: MpvVideoParams};
  onError: {code: Double; recoverable: boolean; message: string; requestId?: string};
  onBuffering: {percent: Double; isBuffering?: boolean};
  /**
   * Buffered ranges emitted from MPV's `demuxer-cache-state` property.
   * Each range is `[startSec, endSec]`. This is the data backing the
   * grey "how much has been downloaded" overlay on the seek bar — the
   * same primitive YouTube uses. Multiple ranges are possible (e.g. a
   * network stream that's been seeked around).
   */
  onCacheState: {
    ranges: Array<{start: Double; end: Double}>;
    /** Cache fill ratio (0..1) for the active range, or 0 if no cache. */
    fill: Double;
  };
  /**
   * Emitted from `seekable`. False for live streams and unknown-length
   * sources. Use this to grey out the seek bar / disable scrubbing UI
   * instead of silently failing on scrub.
   */
  onSeekable: {seekable: boolean};
  /** True while mpv is resolving a seek request, including a remote range fetch. */
  onSeeking: {seeking: boolean};
  /** Native MPV end-file notification. `reason=0` is natural EOF; other reasons include stop/reload. */
  onEndFile: {reason: Double; error: Double; requestId?: string};
  /**
   * Fires when mpv resumes after a stall (e.g. a cache refill from
   * `paused-for-cache`). Use this to clear `isBuffering` on the JS
   * side, since `onBuffering(percent:100)` may race with the resume
   * and never reach the layer that owns the phase reducer.
   */
  onPlaybackRestart: {};
  /** @deprecated Use onEndFile; retained for compatibility with older consumers. */
  onEndReached: {};
  onAudioDeviceChanged: {device: string};
  onVolumeChanged: {volume: Double};
  onSpeedChanged: {speed: Double};
  /** Fires when mpv reconfigures the video output — the decoder has produced
   *  a frame pipeline and the surface is about to present the first frame.
   *  The earliest reliable "video is truly rendering" signal. */
  videoReconfig: {};
  onPipModeChanged: {isInPip: boolean};
  onPipPlayPause: {};
  onPipExpand: {};
  onPipClose: {};
}

export type MpvEventName = keyof MpvEvents;

// ──────────────────────────────────────────────
// Turbo Module Spec
// ──────────────────────────────────────────────

export interface Spec extends TurboModule {
  // ── Playback Control ──
  readonly play: () => void;
  readonly pause: () => void;
  readonly stop: () => void;
  readonly togglePlayPause: () => void;
  readonly seekForward: (seconds: Double) => void;
  readonly seekBackward: (seconds: Double) => void;
  readonly seekAbsolute: (position: Double) => void;
  readonly stepFrame: (direction: Double) => void; // 1 = forward, -1 = backward
  readonly screenshot: () => string; // returns file path

  // ── File Loading ──
  readonly loadFile: (path: string) => void;
  readonly loadFileWithRequestId: (path: string, requestId: string) => void;
  readonly loadPlaylist: (paths: string[], startIndex?: Double) => void;
  readonly getFileInfo: () => string; // Returns JSON string
  readonly getVideoParams: () => string; // Returns JSON string
  readonly grantPersistablePermission: (uri: string) => void;
  readonly verifyContentUri: (uri: string) => boolean;
  readonly captureThumbnail: (uri: string) => string;

  // ── Tracks ──
  /** Native returns the mpv `track-list` as a JSON string. Parse in player.api. */
  readonly getTracks: () => string;
  readonly selectTrack: (trackId: Double) => void;
  readonly cycleTrack: (type: 'video' | 'audio' | 'sub') => void;
  readonly setTrackVisibility: (trackType: string, visible: boolean) => void;
  readonly setTrack: (type: string, trackId: Double) => void;

  // ── Chapters ──
  /** Native returns the mpv `chapter-list` as a JSON string. Parse in player.api. */
  readonly getChapters: () => string;
  readonly seekChapter: (direction: Double) => void; // 1 = next, -1 = prev
  /** Native returns `chapter-metadata` as a JSON object string. */
  readonly getCurrentChapter: () => string;

  // ── Volume / Audio ──
  readonly setVolume: (volume: Double) => void;
  readonly getVolume: () => Double;
  readonly setMuted: (muted: boolean) => void;
  readonly getMuted: () => boolean;
  readonly getAudioDevices: () => string; // Returns JSON string
  readonly setAudioDevice: (deviceName: string) => void;

  // ── Playback Speed ──
  readonly setSpeed: (speed: Double) => void;
  readonly getSpeed: () => Double;

  // ── Loop / Repeat ──
  readonly setLoopMode: (mode: MpvLoopMode) => void;
  readonly getLoopMode: () => MpvLoopMode;
  readonly setPlaylistLoop: (loop: boolean) => void;

  // ── Properties (generic get/set for any mpv property) ──
  readonly getProperty: (name: string) => string;
  readonly setProperty: (name: string, value: unknown) => void;
  readonly observeProperty: (name: string) => void;
  readonly unobserveProperty: (name: string) => void;

  // ── Video Filters / Equalizer ──
  readonly setVideoFilter: (filter: string, enabled: boolean) => void;
  readonly setAudioFilter: (filter: string, enabled: boolean) => void;

  // ── Playlist ──
  readonly getPlaylist: () => string; // Returns JSON string
  readonly playlistNext: () => void;
  readonly playlistPrev: () => void;
  readonly playlistRemove: (index: Double) => void;
  readonly playlistShuffle: () => void;
  readonly playlistClear: () => void;

  // ── State Queries ──
  readonly getPosition: () => Double;
  readonly getDuration: () => Double;
  readonly getPlaybackState: () => MpvPlaybackState;
  readonly isMuted: () => boolean;

  // ── Lifecycle ──
  readonly initPlayer: () => boolean;
  readonly destroy: () => void;
  readonly getNativePtr: () => Double;

  // ── Keep Screen On (W2.12) ──
  readonly setKeepScreenOn?: (enabled: boolean) => void;

  // ── Picture in Picture ──
  readonly enterPip: (chapterTitle?: string, progressPct?: string) => void;
  readonly exitPip: () => void;
  readonly exitPipAndFinish: () => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('MpvPlayerModule');
