import {Platform} from 'react-native';
import MpvPlayer from '../../../../../native/player.api';
import type {VideoV3SessionSnapshot} from '../domain/VideoV3Types';

export type VideoV3PipMode = 'inline' | 'entering' | 'pip' | 'exiting';
export type VideoV3PipAction = 'play-pause' | 'expand' | 'close';

export interface VideoV3PipState {
  readonly supported: boolean;
  readonly mode: VideoV3PipMode;
}

export type VideoV3PipListener = (state: VideoV3PipState) => void;
export type VideoV3PipActionListener = (action: VideoV3PipAction) => void;

export interface VideoV3PipPort {
  getState(): VideoV3PipState;
  subscribe(listener: VideoV3PipListener): () => void;
  subscribeToActions(listener: VideoV3PipActionListener): () => void;
  enter(session: VideoV3SessionSnapshot): Promise<boolean>;
  exit(): Promise<boolean>;
  close(): Promise<boolean>;
  dispose(): void;
}

const initialState: VideoV3PipState = {
  supported: Platform.OS === 'android',
  mode: 'inline',
};

/**
 * Typed bridge around the existing Android activity PiP contract. It owns only
 * platform lifecycle and remote actions; playback commands remain in V3’s
 * intent controller and the host decides how to project the UI.
 */
export class VideoV3PipAdapter implements VideoV3PipPort {
  private state: VideoV3PipState = initialState;
  private readonly listeners = new Set<VideoV3PipListener>();
  private readonly actionListeners = new Set<VideoV3PipActionListener>();
  private readonly unsubscribeEvents: Array<() => void> = [];
  private disposed = false;

  constructor() {
    if (!this.state.supported) return;
    this.unsubscribeEvents.push(
      MpvPlayer.on('onPipModeChanged', payload => {
        this.update({
          supported: true,
          mode: payload.isInPip ? 'pip' : 'inline',
        });
      }),
      MpvPlayer.on('onPipPlayPause', () => this.emitAction('play-pause')),
      MpvPlayer.on('onPipExpand', () => this.emitAction('expand')),
      MpvPlayer.on('onPipClose', () => this.emitAction('close')),
    );
  }

  getState(): VideoV3PipState {
    return this.state;
  }

  subscribe(listener: VideoV3PipListener): () => void {
    if (this.disposed) return () => undefined;
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  subscribeToActions(listener: VideoV3PipActionListener): () => void {
    if (this.disposed) return () => undefined;
    this.actionListeners.add(listener);
    return () => this.actionListeners.delete(listener);
  }

  async enter(session: VideoV3SessionSnapshot): Promise<boolean> {
    if (this.disposed || !this.state.supported || !session.source || !session.hasFirstFrame) return false;
    if (this.state.mode === 'pip' || this.state.mode === 'entering') return true;
    this.update({...this.state, mode: 'entering'});
    const progressPct = session.duration && session.duration > 0
      ? `${Math.round((session.position / session.duration) * 100)} %`
      : undefined;
    try {
      MpvPlayer.enterPip(session.source.title, progressPct);
      return true;
    } catch {
      this.update({...this.state, mode: 'inline'});
      return false;
    }
  }

  async exit(): Promise<boolean> {
    if (this.disposed || !this.state.supported || this.state.mode !== 'pip') return false;
    this.update({...this.state, mode: 'exiting'});
    try {
      MpvPlayer.exitPip();
      return true;
    } catch {
      this.update({...this.state, mode: 'pip'});
      return false;
    }
  }

  async close(): Promise<boolean> {
    if (this.disposed || !this.state.supported) return false;
    try {
      MpvPlayer.exitPipAndFinish();
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeEvents.splice(0).forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.actionListeners.clear();
  }

  private emitAction(action: VideoV3PipAction): void {
    if (this.disposed) return;
    this.actionListeners.forEach(listener => listener(action));
  }

  private update(state: VideoV3PipState): void {
    if (this.disposed || (state.mode === this.state.mode && state.supported === this.state.supported)) return;
    this.state = state;
    this.listeners.forEach(listener => listener(state));
  }
}
