import {Platform} from 'react-native';
import MpvPlayer from '../../../../native/player.api';
import type {VideoSessionSnapshot} from '../domain/VideoTypes';

export type VideoPipMode = 'inline' | 'entering' | 'pip' | 'exiting';
export type VideoPipAction = 'play-pause' | 'expand' | 'close';

export interface VideoPipState {
  readonly supported: boolean;
  readonly mode: VideoPipMode;
}

export type VideoPipListener = (state: VideoPipState) => void;
export type VideoPipActionListener = (action: VideoPipAction) => void;

export interface VideoPipPort {
  getState(): VideoPipState;
  subscribe(listener: VideoPipListener): () => void;
  subscribeToActions(listener: VideoPipActionListener): () => void;
  enter(session: VideoSessionSnapshot): Promise<boolean>;
  exit(): Promise<boolean>;
  close(): Promise<boolean>;
  dispose(): void;
}

const initialState: VideoPipState = {
  supported: Platform.OS === 'android',
  mode: 'inline',
};
const PIP_TRANSITION_TIMEOUT_MS = 5_000;

/**
 * Typed bridge around the existing Android activity PiP contract. It owns only
 * platform lifecycle and remote actions; playback commands remain in V3’s
 * intent controller and the host decides how to project the UI.
 */
export class VideoPipAdapter implements VideoPipPort {
  private state: VideoPipState = initialState;
  private readonly listeners = new Set<VideoPipListener>();
  private readonly actionListeners = new Set<VideoPipActionListener>();
  private readonly unsubscribeEvents: Array<() => void> = [];
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor() {
    if (!this.state.supported) return;
    this.unsubscribeEvents.push(
      MpvPlayer.on('onPipModeChanged', payload => {
        this.clearTransitionTimer();
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

  getState(): VideoPipState {
    return this.state;
  }

  subscribe(listener: VideoPipListener): () => void {
    if (this.disposed) return () => undefined;
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  subscribeToActions(listener: VideoPipActionListener): () => void {
    if (this.disposed) return () => undefined;
    this.actionListeners.add(listener);
    return () => this.actionListeners.delete(listener);
  }

  async enter(session: VideoSessionSnapshot): Promise<boolean> {
    if (this.disposed || !this.state.supported || !session.source || !session.hasFirstFrame) return false;
    if (this.state.mode === 'pip' || this.state.mode === 'entering') return true;
    this.update({...this.state, mode: 'entering'});
    this.armTransitionRecovery('entering');
    const progressPct = session.duration && session.duration > 0
      ? `${Math.round((session.position / session.duration) * 100)} %`
      : undefined;
    try {
      MpvPlayer.enterPip(session.source.title, progressPct);
      return true;
    } catch {
      this.clearTransitionTimer();
      this.update({...this.state, mode: 'inline'});
      return false;
    }
  }

  async exit(): Promise<boolean> {
    if (this.disposed || !this.state.supported || this.state.mode !== 'pip') return false;
    this.update({...this.state, mode: 'exiting'});
    this.armTransitionRecovery('exiting');
    try {
      MpvPlayer.exitPip();
      return true;
    } catch {
      this.clearTransitionTimer();
      this.update({...this.state, mode: 'pip'});
      return false;
    }
  }

  async close(): Promise<boolean> {
    if (this.disposed || !this.state.supported) return false;
    this.update({...this.state, mode: 'exiting'});
    this.armTransitionRecovery('exiting');
    try {
      MpvPlayer.exitPipAndFinish();
      return true;
    } catch {
      this.clearTransitionTimer();
      this.update({...this.state, mode: 'inline'});
      return false;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.clearTransitionTimer();
    this.disposed = true;
    this.unsubscribeEvents.splice(0).forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.actionListeners.clear();
  }

  private armTransitionRecovery(expectedMode: 'entering' | 'exiting'): void {
    this.clearTransitionTimer();
    this.transitionTimer = setTimeout(() => {
      this.transitionTimer = null;
      if (this.disposed || this.state.mode !== expectedMode) return;
      this.update({...this.state, mode: 'inline'});
    }, PIP_TRANSITION_TIMEOUT_MS);
  }

  private clearTransitionTimer(): void {
    if (this.transitionTimer === null) return;
    clearTimeout(this.transitionTimer);
    this.transitionTimer = null;
  }

  private emitAction(action: VideoPipAction): void {
    if (this.disposed) return;
    this.actionListeners.forEach(listener => listener(action));
  }

  private update(state: VideoPipState): void {
    if (this.disposed || (state.mode === this.state.mode && state.supported === this.state.supported)) return;
    this.state = state;
    this.listeners.forEach(listener => listener(state));
  }
}
