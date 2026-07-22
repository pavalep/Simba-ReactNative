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

export interface MpvEvents {
  onFileLoaded: {file: MpvFileInfo};
  onPlaybackStateChanged: {state: MpvPlaybackState};
  onPositionChanged: {position: Double};
  onDurationChanged: {duration: Double};
  onPropertyChanged: {property: string; value: unknown};
  onTracksChanged: {tracks: MpvTrack[]};
  onChapterChanged: {chapter: MpvChapter | null};
  onVideoParamsChanged: {params: MpvVideoParams};
  onError: {code: Double; message: string};
  onBuffering: {percent: Double};
  onEndReached: {};
  onAudioDeviceChanged: {device: string};
  onVolumeChanged: {volume: Double};
  onSpeedChanged: {speed: Double};
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
  readonly loadPlaylist: (paths: string[], startIndex?: Double) => void;
  readonly getFileInfo: () => string; // Returns JSON string
  readonly getVideoParams: () => string; // Returns JSON string
  readonly grantPersistablePermission: (uri: string) => void;
  readonly verifyContentUri: (uri: string) => boolean;
  readonly captureThumbnail: (uri: string) => string;

  // ── Tracks ──
  readonly getTracks: () => MpvTrack[];
  readonly selectTrack: (trackId: Double) => void;
  readonly cycleTrack: (type: 'video' | 'audio' | 'sub') => void;
  readonly setTrackVisibility: (trackType: string, visible: boolean) => void;

  // ── Chapters ──
  readonly getChapters: () => MpvChapter[];
  readonly seekChapter: (direction: Double) => void; // 1 = next, -1 = prev
  readonly getCurrentChapter: () => MpvChapter | null;

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
}

export default TurboModuleRegistry.getEnforcing<Spec>('MpvPlayerModule');
