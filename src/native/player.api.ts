import {NativeModules, Platform, NativeEventEmitter} from 'react-native';
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

function noopModule(): Partial<Spec> {
  if (Platform.OS === 'web') {
    return {};
  }
  throw new Error(
    'MpvPlayerModule not initialized. Did you forget to call initPlayer()?',
  );
}

export const MpvPlayer = {
  // ── Lifecycle ──
  initPlayer(): boolean {
    try {
      return ensureModule().initPlayer();
    } catch {
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
    ensureModule().play();
  },

  pause(): void {
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
    ensureModule().loadFile(path);
  },

  loadPlaylist(paths: string[], startIndex?: number): void {
    ensureModule().loadPlaylist(paths, startIndex ?? 0);
  },

  getFileInfo(): MpvFileInfo {
    return ensureModule().getFileInfo();
  },

  getVideoParams(): MpvVideoParams {
    return ensureModule().getVideoParams();
  },

  // ── Tracks ──
  getTracks(): MpvTrack[] {
    return ensureModule().getTracks();
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
    return ensureModule().getChapters();
  },

  seekNextChapter(): void {
    ensureModule().seekChapter(1);
  },

  seekPreviousChapter(): void {
    ensureModule().seekChapter(-1);
  },

  getCurrentChapter(): MpvChapter | null {
    return ensureModule().getCurrentChapter();
  },

  // ── Volume / Audio ──
  setVolume(volume: number): void {
    ensureModule().setVolume(Math.max(0, Math.min(100, volume)));
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
    return ensureModule().getAudioDevices();
  },

  setAudioDevice(deviceName: string): void {
    ensureModule().setAudioDevice(deviceName);
  },

  toggleMute(): void {
    ensureModule().setMuted(!ensureModule().isMuted());
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
    ensureModule().setProperty(name, value);
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
    return ensureModule().getPlaylist();
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
      console.warn(`[MpvPlayer] EventEmitter not available for "${event}"`);
      return () => {};
    }
    const subscription = eventEmitter.addListener(event, handler);
    return () => subscription.remove();
  },

  once<E extends MpvEventName>(
    event: E,
    handler: (payload: MpvEvents[E]) => void,
  ): void {
    if (!eventEmitter) {
      console.warn(`[MpvPlayer] EventEmitter not available for "${event}"`);
      return;
    }
    (eventEmitter as any).once(event, handler);
  },

  removeAllListeners(event?: MpvEventName): void {
    eventEmitter?.removeAllListeners(event as string);
  },

  onSurfaceAttached(callback: () => void) {
    return eventEmitter?.addListener('onSurfaceAttached', callback);
  },
};

export default MpvPlayer;
