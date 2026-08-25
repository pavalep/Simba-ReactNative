import type {
  VideoSurfaceGeometry,
  VideoSurfacePort,
  VideoSurfacePresentation,
} from '../ports/VideoSurfacePort';

export interface VideoSurfaceState {
  readonly attached: boolean;
  readonly presentation: VideoSurfacePresentation;
  readonly geometry: VideoSurfaceGeometry | null;
}

export type VideoSurfaceStateListener = (state: VideoSurfaceState) => void;

const initialState: VideoSurfaceState = {
  attached: false,
  presentation: 'full',
  geometry: null,
};

/**
 * Owns the JS-side lease for the one V3 native render surface. It never
 * creates a second native view for compact or system presentations.
 */
export class VideoSurfaceController implements VideoSurfacePort {
  private state: VideoSurfaceState = initialState;
  private readonly listeners = new Set<VideoSurfaceStateListener>();
  private releasePromise: Promise<void> | null = null;

  getState(): VideoSurfaceState {
    return this.state;
  }

  subscribe(listener: VideoSurfaceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async attach(): Promise<void> {
    if (this.releasePromise) return;
    if (this.state.attached) return;
    this.update({...this.state, attached: true});
  }

  async setPresentation(
    presentation: VideoSurfacePresentation,
    geometry?: VideoSurfaceGeometry,
  ): Promise<void> {
    if (this.releasePromise) return;
    if (!this.state.attached) await this.attach();
    this.update({
      ...this.state,
      presentation,
      ...(geometry === undefined ? {} : {geometry}),
    });
  }

  async detach(): Promise<void> {
    if (this.releasePromise) return this.releasePromise;
    this.releasePromise = Promise.resolve().then(() => {
      this.update({...this.state, attached: false, geometry: null});
      this.listeners.clear();
    });
    return this.releasePromise;
  }

  isAttached(): boolean {
    return this.state.attached;
  }

  private update(next: VideoSurfaceState): void {
    if (this.state === next) return;
    this.state = next;
    this.listeners.forEach(listener => listener(this.state));
  }
}
