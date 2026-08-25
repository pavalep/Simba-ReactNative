export type VideoV3SurfacePresentation = 'full' | 'mini' | 'pip';

export interface VideoV3SurfaceGeometry {
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
export interface VideoV3SurfacePort {
  attach(): Promise<void>;
  setPresentation(
    presentation: VideoV3SurfacePresentation,
    geometry?: VideoV3SurfaceGeometry,
  ): Promise<void>;
  detach(): Promise<void>;
  isAttached(): boolean;
}
