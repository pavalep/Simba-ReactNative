import type {VideoCapabilities, VideoViewState} from '../domain/VideoTypes';

export type VideoPresentationMode = 'full' | 'mini';
export type VideoChromeVisibility = 'visible' | 'hidden';

export interface VideoSafeAreaInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface VideoViewport {
  readonly width: number;
  readonly height: number;
}

export interface VideoSafeGeometry {
  readonly topContentInset: number;
  readonly bottomContentInset: number;
  readonly horizontalContentInset: number;
  readonly controlGap: number;
  readonly utilityGap: number;
  readonly compact: boolean;
  readonly landscape: boolean;
}

export interface VideoPresentationState {
  readonly mode: VideoPresentationMode;
  readonly chrome: VideoChromeVisibility;
  readonly safeArea: VideoSafeAreaInsets;
  readonly viewport: VideoViewport;
  readonly geometry: VideoSafeGeometry;
  readonly isLocked: boolean;
  readonly transitionGeneration: number;
}

export interface VideoControlModel {
  readonly session: VideoViewState;
  readonly presentation: VideoPresentationState;
  readonly capabilities: VideoCapabilities;
}

export function calculateVideoSafeGeometry(
  insets: VideoSafeAreaInsets,
  viewport: VideoViewport,
): VideoSafeGeometry {
  const landscape = viewport.width > viewport.height;
  const compact = viewport.width < 390 || viewport.height < 640;
  const horizontalBase = landscape ? 24 : 16;
  const controlGap = compact ? 10 : landscape ? 16 : 14;
  const utilityGap = compact ? 8 : 12;
  // v11 T8.3: spec §4.9 — bottom bar 24 px from physical bottom
  // in landscape. The system safe-area bottom is often 0 in
  // landscape on devices with a side home indicator (Pixel,
  // most modern Androids), so a 12 px floor is too tight. The
  // 24 px landscape floor matches the spec; portrait keeps
  // the 12 px floor from before (closer to the home indicator
  // pill at the bottom).
  const bottomFloor = landscape ? 24 : 12;
  return {
    topContentInset: Math.max(insets.top, 12),
    bottomContentInset: Math.max(insets.bottom, bottomFloor),
    horizontalContentInset: Math.max(insets.left, insets.right, horizontalBase),
    controlGap,
    utilityGap,
    compact,
    landscape,
  };
}
