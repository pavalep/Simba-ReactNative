import {NativeModules, NativeEventEmitter} from 'react-native';
import type {
  Spec,
  MpvFileInfo,
  MpvTrack,
  MpvChapter,
  MpvPlaybackState,
  MpvLoopMode,
  MpvAudioDevice,
  MpvVideoParams,
  MpvEventName,
  MpvEvents,
} from './NativeMpvPlayer';
import {logger} from '../lib/logger';
import {getLocalPath} from '../services/downloadService';

// Try to load the Turbo Module; fall back to legacy NativeModules bridge
let NativeModule: Spec | null = null;

try {
  NativeModule = require('./NativeMpvPlayer').default as Spec;
} catch {
  // Turbo Module not available — try legacy bridge
  const legacy = NativeModules.MpvPlayerModule as Spec | undefined;
  if (legacy) {
    NativeModule = legacy;
  }
}

// ── Event Emitter ──
const eventEmitter = NativeModule
  ? new NativeEventEmitter(NativeModule as any)
  : null;

// ── Player API ──

function ensureModule(): Spec {
  if (!NativeModule) {
    throw new Error(
      'MpvPlayerModule is not available. Ensure the native module is linked.',
    );
  }
  return NativeModule;
}

function tracePlayback(scope: string, ...args: unknown[]): void {
  logger.info(`[PlaybackTrace][JS][${scope}]`, ...args);
}

function parseNativeJson<T>(raw: string | T, fallback: T): T {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn('[PlaybackTrace][JS][native-json-parse]', {error});
    return fallback;
  }
}

function parseNativeArray<T>(raw: string | readonly unknown[], label: string): T[] {
  const parsed = parseNativeJson<unknown>(raw, []);
  if (!Array.isArray(parsed)) {
    logger.warn(`[PlaybackTrace][JS][${label}] expected array`);
    return [];
  }
  return parsed as T[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseTracks(raw: string | MpvTrack[]): MpvTrack[] {
  return parseNativeArray<Record<string, unknown>>(raw, 'tracks')
    .map(track => {
      const type = track.type === 'video' || track.type === 'audio' || track.type === 'sub'
        ? track.type
        : null;
      if (!type) return null;
      return {
        id: finiteNumber(track.id, -1),
        type,
        ...(typeof track.title === 'string' ? {title: track.title} : {}),
        ...(typeof track.lang === 'string' ? {lang: track.lang} : {}),
        default: track.default === true,
        selected: track.selected === true,
        ...(typeof track.codec === 'string' ? {codec: track.codec} : {}),
      } satisfies MpvTrack;
    })
    .filter((track): track is MpvTrack => track !== null && track.id >= 0);
}

function parseChapters(raw: string | readonly unknown[]): MpvChapter[] {
  return parseNativeArray<Record<string, unknown>>(raw, 'chapters')
    .map((chapter, index, chapters) => {
      const startTime = finiteNumber(chapter.startTime ?? chapter.time, NaN);
      const nextStart = chapters[index + 1]
        ? finiteNumber(chapters[index + 1].startTime ?? chapters[index + 1].time, NaN)
        : NaN;
      const endTime = finiteNumber(chapter.endTime ?? chapter.end, Number.isFinite(nextStart) ? nextStart : startTime);
      if (!Number.isFinite(startTime)) return null;
      return {
        id: finiteNumber(chapter.id, index),
        title: typeof chapter.title === 'string' ? chapter.title : `Chapter ${index + 1}`,
        startTime: Math.max(0, startTime),
        endTime: Math.max(startTime, endTime),
      } satisfies MpvChapter;
    })
    .filter((chapter): chapter is MpvChapter => chapter !== null);
}

function parseCurrentChapter(raw: string | MpvChapter | null): MpvChapter | null {
  const parsed = parseNativeJson<unknown>(raw, null);
  if (!isRecord(parsed)) return null;
  const chapters = parseChapters([parsed]);
  return chapters[0] ?? null;
}

export const MpvPlayer = {
  // ── Lifecycle ──
  initPlayer(): boolean {
    tracePlayback('initPlayer:call');
    try {
      const result = ensureModule().initPlayer();
      tracePlayback('initPlayer:return', result);
      return result;
    } catch (error) {
      logger.error('[PlaybackTrace][JS][initPlayer:error]', error);
      return false;
    }
  },

  destroy(): void {
    try {
      ensureModule().destroy();
    } catch {
      // ignore
    }
  },

  // ── Playback Control ──
  play(): void {
    tracePlayback('play:call');
    ensureModule().play();
  },

  pause(): void {
    tracePlayback('pause:call');
    ensureModule().pause();
  },

  stop(): void {
    ensureModule().stop();
  },

  togglePlayPause(): void {
    ensureModule().togglePlayPause();
  },

  seekForward(seconds: number = 5): void {
    ensureModule().seekForward(seconds);
  },

  seekBackward(seconds: number = 5): void {
    ensureModule().seekBackward(seconds);
  },

  seekTo(position: number): void {
    tracePlayback('seekTo:call', position);
    ensureModule().seekAbsolute(position);
  },

  stepFrame(direction: 1 | -1 = 1): void {
    ensureModule().stepFrame(direction);
  },

  screenshot(): string {
    return ensureModule().screenshot();
  },

  // ── File Loading ──
  loadFile(path: string): void {
    // 49.4: offline remap — prefer the downloaded copy when one exists.
    const resolvedPath = getLocalPath(path) ?? path;
    tracePlayback('loadFile:call', {requestedPath: path, resolvedPath});
    try {
      ensureModule().loadFile(resolvedPath);
      tracePlayback('loadFile:return', {resolvedPath});
    } catch (error) {
      logger.error('[PlaybackTrace][JS][loadFile:error]', {resolvedPath, error});
      throw error;
    }
  },

  loadFileWithRequestId(path: string, requestId: string): void {
    const resolvedPath = getLocalPath(path) ?? path;
    ensureModule().loadFileWithRequestId(resolvedPath, requestId);
  },

  loadPlaylist(paths: string[], startIndex?: number): void {
    // 49.4: remap each entry so offline playlists play from disk.
    ensureModule().loadPlaylist(
      paths.map(p => getLocalPath(p) ?? p),
      startIndex ?? 0,
    );
  },

  getFileInfo(): MpvFileInfo {
    return JSON.parse(ensureModule().getFileInfo());
  },

  getVideoParams(): MpvVideoParams {
    return JSON.parse(ensureModule().getVideoParams());
  },

  grantPersistablePermission(uri: string): void {
    try {
      ensureModule().grantPersistablePermission(uri);
    } catch {
      // not critical — file may still work for this session
    }
  },

  verifyContentUri(uri: string): boolean {
    try {
      return ensureModule().verifyContentUri(uri);
    } catch {
      return false;
    }
  },

  captureThumbnail(uri: string): string {
    try {
      return ensureModule().captureThumbnail(uri);
    } catch {
      return '';
    }
  },

  // ── Tracks ──
  getTracks(): MpvTrack[] {
    return parseTracks(ensureModule().getTracks());
  },

  selectTrack(trackId: number): void {
    ensureModule().selectTrack(trackId);
  },

  cycleTrack(type: 'video' | 'audio' | 'sub'): void {
    ensureModule().cycleTrack(type);
  },

  setTrackVisibility(type: string, visible: boolean): void {
    ensureModule().setTrackVisibility(type, visible);
  },

  // ── Chapters ──
  getChapters(): MpvChapter[] {
    return parseChapters(ensureModule().getChapters());
  },

  seekNextChapter(): void {
    ensureModule().seekChapter(1);
  },

  seekPreviousChapter(): void {
    ensureModule().seekChapter(-1);
  },

  getCurrentChapter(): MpvChapter | null {
    return parseCurrentChapter(ensureModule().getCurrentChapter());
  },

  // ── Volume / Audio ──
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    tracePlayback('setVolume:call', clampedVolume);
    ensureModule().setVolume(clampedVolume);
  },

  getVolume(): number {
    return ensureModule().getVolume();
  },

  setMuted(muted: boolean): void {
    ensureModule().setMuted(muted);
  },

  isMuted(): boolean {
    return ensureModule().isMuted();
  },

  getAudioDevices(): MpvAudioDevice[] {
    return JSON.parse(ensureModule().getAudioDevices());
  },

  setAudioDevice(deviceName: string): void {
    ensureModule().setAudioDevice(deviceName);
  },

  toggleMute(): void {
    ensureModule().setMuted(!ensureModule().isMuted());
  },

  resume(): void {
    tracePlayback('resume:call');
    ensureModule().play();
  },

  setTrack(type: string, trackId: number | 'no'): void {
    const id = trackId === 'no' ? -1 : trackId;
    ensureModule().setTrack(type, id);
  },

  loadExternalSubtitle(uri: string): void {
    ensureModule().setProperty('sub-add', uri);
  },

  // ── Playback Speed ──
  setSpeed(speed: number): void {
    ensureModule().setSpeed(speed);
  },

  getSpeed(): number {
    return ensureModule().getSpeed();
  },

  // ── Loop / Repeat ──
  setLoopMode(mode: MpvLoopMode): void {
    ensureModule().setLoopMode(mode);
  },

  getLoopMode(): MpvLoopMode {
    return ensureModule().getLoopMode();
  },

  // ── Properties ──
  getProperty(name: string): unknown {
    return ensureModule().getProperty(name);
  },

  setProperty(name: string, value: unknown): void {
    // Native MpvBridgeModule.setProperty(name, value) requires both
    // arguments as strings (value is sent over the JNI bridge as a
    // String). Stringify numbers/booleans/etc. so the host function
    // doesn't throw "Expected argument 1 of method setProperty to be
    // a string, but got a number".
    const stringValue =
      typeof value === 'string' ? value : String(value);
    ensureModule().setProperty(name, stringValue);
  },

  observeProperty(name: string): void {
    ensureModule().observeProperty(name);
  },

  unobserveProperty(name: string): void {
    ensureModule().unobserveProperty(name);
  },

  // ── Video / Audio Filters ──
  setVideoFilter(filter: string, enabled: boolean): void {
    ensureModule().setVideoFilter(filter, enabled);
  },

  setAudioFilter(filter: string, enabled: boolean): void {
    ensureModule().setAudioFilter(filter, enabled);
  },

  // ── Playlist ──
  getPlaylist(): string[] {
    return JSON.parse(ensureModule().getPlaylist());
  },

  next(): void {
    ensureModule().playlistNext();
  },

  previous(): void {
    ensureModule().playlistPrev();
  },

  removeFromPlaylist(index: number): void {
    ensureModule().playlistRemove(index);
  },

  shufflePlaylist(): void {
    ensureModule().playlistShuffle();
  },

  clearPlaylist(): void {
    ensureModule().playlistClear();
  },

  // ── Native Pointer (for MpvRenderView) ──
  getNativePtr(): number {
    return ensureModule().getNativePtr();
  },

  // ── Picture in Picture ──
  enterPip(chapterTitle?: string, progressPct?: string): void {
    ensureModule().enterPip(chapterTitle, progressPct);
  },

  exitPip(): void {
    ensureModule().exitPip();
  },

  exitPipAndFinish(): void {
    ensureModule().exitPipAndFinish();
  },

  // ── State ──
  getPosition(): number {
    return ensureModule().getPosition();
  },

  getDuration(): number {
    return ensureModule().getDuration();
  },

  getPlaybackState(): MpvPlaybackState {
    return ensureModule().getPlaybackState();
  },

  // ── Events ──
  on<E extends MpvEventName>(
    event: E,
    handler: (payload: MpvEvents[E]) => void,
  ): () => void {
    if (!eventEmitter) {
      logger.warn(`[MpvPlayer] EventEmitter not available for "${event}"`);
      return () => {};
    }
    const subscription = eventEmitter.addListener(event, handler);
    return () => subscription.remove();
  },

  once<E extends MpvEventName>(
    event: E,
    handler: (payload: MpvEvents[E]) => void,
  ): () => void {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    unsubscribe = MpvPlayer.on(event, payload => {
      if (!active) return;
      active = false;
      unsubscribe();
      handler(payload);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  },

  removeAllListeners(event?: MpvEventName): void {
    eventEmitter?.removeAllListeners(event as string);
  },

  onSurfaceAttached(callback: () => void) {
    return eventEmitter?.addListener('onSurfaceAttached', callback);
  },
};

// ── Screen Brightness ──
// Controls Android Window screen brightness via MpvBridgeModule.
export const ScreenBrightness = {
  setBrightness(value: number): void {
    if (!NativeModules.MpvPlayerModule) return;
    try {
      NativeModules.MpvPlayerModule.setScreenBrightness(value);
    } catch {
      // not supported
    }
  },
  getBrightness(): number {
    if (!NativeModules.MpvPlayerModule) return 1.0;
    try {
      return NativeModules.MpvPlayerModule.getScreenBrightness();
    } catch {
      return 1.0;
    }
  },
};

export default MpvPlayer;
