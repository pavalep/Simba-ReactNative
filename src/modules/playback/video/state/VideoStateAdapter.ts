import {
  emptyVideoSnapshot,
  type VideoCapabilities,
  type VideoPlatformCapabilities,
  type VideoSessionSnapshot,
  type VideoViewState,
} from '../domain/VideoTypes';
import type {
  VideoSessionEvent,
  VideoSessionPort,
  VideoUnsubscribe,
} from '../ports/VideoSessionPort';
import {reduceVideoSessionEvent} from './reduceVideoSessionEvent';

export type VideoViewStateListener = (state: VideoViewState) => void;

function deriveCapabilities(
  snapshot: VideoSessionSnapshot,
  platform: VideoPlatformCapabilities,
): VideoCapabilities {
  const hasSession = snapshot.source !== null && snapshot.phase !== 'idle';
  const hasAudioTrack = snapshot.tracks.some(track => track.type === 'audio');
  const hasCaptionTrack = snapshot.tracks.some(track => track.type === 'sub');
  return {
    canPlay: hasSession && !snapshot.isPlaying && snapshot.phase !== 'error',
    canPause: hasSession && snapshot.isPlaying,
    canSeek: hasSession && snapshot.isSeekable && snapshot.duration !== null,
    canAdjustVolume: hasSession,
    canChangeSpeed: hasSession,
    canSelectAudioTrack: hasAudioTrack,
    canSelectCaptionTrack: hasCaptionTrack,
    canViewChapters: snapshot.chapters.length > 0,
    ...platform,
  };
}

/**
 * Converts session truth into a presentation-neutral V3 view state. It does
 * not know how full, mini, or PiP surfaces are rendered.
 */
export class VideoStateAdapter {
  private snapshot: VideoSessionSnapshot = emptyVideoSnapshot();
  private readonly listeners = new Set<VideoViewStateListener>();
  private readonly unsubscribeSession: VideoUnsubscribe;

  constructor(
    private readonly session: VideoSessionPort,
    private readonly platformCapabilities: VideoPlatformCapabilities,
  ) {
    this.unsubscribeSession = session.subscribe(event => this.handleSessionEvent(event));
    this.snapshot = session.getSnapshot();
  }

  getState(): VideoViewState {
    return {
      session: this.snapshot,
      capabilities: deriveCapabilities(this.snapshot, this.platformCapabilities),
    };
  }

  subscribe(listener: VideoViewStateListener): VideoUnsubscribe {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.unsubscribeSession();
    this.listeners.clear();
  }

  private handleSessionEvent(event: VideoSessionEvent): void {
    const nextSnapshot = reduceVideoSessionEvent(this.snapshot, event);
    if (nextSnapshot === this.snapshot) return;
    this.snapshot = nextSnapshot;
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}
