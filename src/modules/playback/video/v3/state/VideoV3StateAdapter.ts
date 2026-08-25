import {
  emptyVideoV3Snapshot,
  type VideoV3Capabilities,
  type VideoV3PlatformCapabilities,
  type VideoV3SessionSnapshot,
  type VideoV3ViewState,
} from '../domain/VideoV3Types';
import type {
  VideoV3SessionEvent,
  VideoV3SessionPort,
  VideoV3Unsubscribe,
} from '../ports/VideoV3SessionPort';
import {reduceVideoV3SessionEvent} from './reduceVideoV3SessionEvent';

export type VideoV3ViewStateListener = (state: VideoV3ViewState) => void;

function deriveCapabilities(
  snapshot: VideoV3SessionSnapshot,
  platform: VideoV3PlatformCapabilities,
): VideoV3Capabilities {
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
export class VideoV3StateAdapter {
  private snapshot: VideoV3SessionSnapshot = emptyVideoV3Snapshot();
  private readonly listeners = new Set<VideoV3ViewStateListener>();
  private readonly unsubscribeSession: VideoV3Unsubscribe;

  constructor(
    private readonly session: VideoV3SessionPort,
    private readonly platformCapabilities: VideoV3PlatformCapabilities,
  ) {
    this.unsubscribeSession = session.subscribe(event => this.handleSessionEvent(event));
    this.snapshot = session.getSnapshot();
  }

  getState(): VideoV3ViewState {
    return {
      session: this.snapshot,
      capabilities: deriveCapabilities(this.snapshot, this.platformCapabilities),
    };
  }

  subscribe(listener: VideoV3ViewStateListener): VideoV3Unsubscribe {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.unsubscribeSession();
    this.listeners.clear();
  }

  private handleSessionEvent(event: VideoV3SessionEvent): void {
    const nextSnapshot = reduceVideoV3SessionEvent(this.snapshot, event);
    if (nextSnapshot === this.snapshot) return;
    this.snapshot = nextSnapshot;
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}
