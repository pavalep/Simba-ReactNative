import type {
  VideoV3SurfaceGeometry,
  VideoV3SurfacePort,
  VideoV3SurfacePresentation,
} from '../ports/VideoV3SurfacePort';

export interface VideoV3SurfaceState {
  readonly attached: boolean;
  readonly presentation: VideoV3SurfacePresentation;
  readonly geometry: VideoV3SurfaceGeometry | null;
}

export type VideoV3SurfaceStateListener = (state: VideoV3SurfaceState) => void;

const initialState: VideoV3SurfaceState = {
  attached: false,
  presentation: 'full',
  geometry: null,
};

/**
 * Owns the JS-side lease for the one V3 native render surface. It never
 * creates a second native view for compact or system presentations.
 */
export class VideoV3SurfaceController implements VideoV3SurfacePort {
  private state: VideoV3SurfaceState = initialState;
  private readonly listeners = new Set<VideoV3SurfaceStateListener>();
  private releasePromise: Promise<void> | null = null;

  getState(): VideoV3SurfaceState {
    return this.state;
  }

  subscribe(listener: VideoV3SurfaceStateListener): () => void {
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
    presentation: VideoV3SurfacePresentation,
    geometry?: VideoV3SurfaceGeometry,
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

  private update(next: VideoV3SurfaceState): void {
    if (this.state === next) return;
    this.state = next;
    this.listeners.forEach(listener => listener(this.state));
  }
}
