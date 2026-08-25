import type {VideoV3Capabilities, VideoV3ViewState} from '../domain/VideoV3Types';

export type VideoV3PresentationMode = 'full' | 'mini';
export type VideoV3ChromeVisibility = 'visible' | 'hidden';

export interface VideoV3SafeAreaInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface VideoV3Viewport {
  readonly width: number;
  readonly height: number;
}

export interface VideoV3SafeGeometry {
  readonly topContentInset: number;
  readonly bottomContentInset: number;
  readonly horizontalContentInset: number;
  readonly controlGap: number;
  readonly utilityGap: number;
  readonly compact: boolean;
  readonly landscape: boolean;
}

export interface VideoV3PresentationState {
  readonly mode: VideoV3PresentationMode;
  readonly chrome: VideoV3ChromeVisibility;
  readonly safeArea: VideoV3SafeAreaInsets;
  readonly viewport: VideoV3Viewport;
  readonly geometry: VideoV3SafeGeometry;
  readonly isLocked: boolean;
  readonly transitionGeneration: number;
}

export interface VideoV3ControlModel {
  readonly session: VideoV3ViewState;
  readonly presentation: VideoV3PresentationState;
  readonly capabilities: VideoV3Capabilities;
}

export function calculateVideoV3SafeGeometry(
  insets: VideoV3SafeAreaInsets,
  viewport: VideoV3Viewport,
): VideoV3SafeGeometry {
  const landscape = viewport.width > viewport.height;
  const compact = viewport.width < 390 || viewport.height < 640;
  const horizontalBase = landscape ? 24 : 16;
  const controlGap = compact ? 10 : landscape ? 16 : 14;
  const utilityGap = compact ? 8 : 12;
  return {
    topContentInset: Math.max(insets.top, 12),
    bottomContentInset: Math.max(insets.bottom, 12),
    horizontalContentInset: Math.max(insets.left, insets.right, horizontalBase),
    controlGap,
    utilityGap,
    compact,
    landscape,
  };
}
