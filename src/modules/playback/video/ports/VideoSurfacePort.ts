export type VideoSurfacePresentation = 'full' | 'mini' | 'pip';

export interface VideoSurfaceGeometry {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The native video surface is attached once per active session. Presentation
 * changes update geometry or system ownership; they never swap in a second
 * native render view while playback is active.
 */
export interface VideoSurfacePort {
  attach(): Promise<void>;
  setPresentation(
    presentation: VideoSurfacePresentation,
    geometry?: VideoSurfaceGeometry,
  ): Promise<void>;
  detach(): Promise<void>;
  isAttached(): boolean;
}
