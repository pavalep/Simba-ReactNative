export {
  createVideoV3SourceFingerprint,
  isSameVideoV3Source,
} from './domain/VideoV3Fingerprint';
export {
  emptyVideoV3Snapshot,
  type VideoV3BufferRange,
  type VideoV3Capabilities,
  type VideoV3Chapter,
  type VideoV3Error,
  type VideoV3PlatformCapabilities,
  type VideoV3SessionPhase,
  type VideoV3SessionSnapshot,
  type VideoV3SourceIdentity,
  type VideoV3Track,
  type VideoV3VideoMetrics,
  type VideoV3ViewState,
} from './domain/VideoV3Types';
export {VideoV3IntentController} from './controller/VideoV3IntentController';
export {createVideoV3PlatformCapabilities} from './infrastructure/VideoV3PlatformCapabilities';
export {
  type VideoV3CommandResult,
  type VideoV3Intent,
  type VideoV3IntentDispatcher,
  type VideoV3SessionFactory,
} from './ports/VideoV3Commands';
export {
  type VideoV3LoadRequest,
  type VideoV3SeekRequest,
  type VideoV3SessionEvent,
  type VideoV3SessionListener,
  type VideoV3SessionPort,
  type VideoV3Unsubscribe,
} from './ports/VideoV3SessionPort';
export {
  type VideoV3SurfaceGeometry,
  type VideoV3SurfacePort,
  type VideoV3SurfacePresentation,
} from './ports/VideoV3SurfacePort';
export {createVideoV3Playback} from './session/createVideoV3Playback';
export {VideoV3MpvSession} from './session/VideoV3MpvSession';
export {
  VideoV3StateAdapter,
  type VideoV3ViewStateListener,
} from './state/VideoV3StateAdapter';
export {reduceVideoV3SessionEvent} from './state/reduceVideoV3SessionEvent';
export {VideoV3NativeStateSynchronizer} from './state/VideoV3NativeStateSynchronizer';
export {
  createVideoV3BufferPresentation,
  normalizeVideoV3BufferedRanges,
  selectVideoV3ActiveBufferedRange,
  type VideoV3BufferPresentation,
} from './domain/VideoV3BufferPolicy';
export {VideoV3ControlButton, type VideoV3ControlButtonProps} from './presentation/VideoV3ControlButton';
export {VideoV3ControlLayer, type VideoV3ControlLayerProps} from './presentation/VideoV3ControlLayer';
export {VideoV3Icon, type VideoV3IconName, type VideoV3IconProps} from './presentation/VideoV3Icon';
export {VideoV3ProgressRail, type VideoV3ProgressRailProps} from './presentation/VideoV3ProgressRail';
export {
  calculateVideoV3SafeGeometry,
  type VideoV3ControlModel,
  type VideoV3PresentationMode,
  type VideoV3PresentationState,
  type VideoV3SafeAreaInsets,
  type VideoV3SafeGeometry,
  type VideoV3Viewport,
} from './presentation/VideoV3PresentationTypes';
export {useVideoV3PresentationGeometry} from './presentation/useVideoV3PresentationGeometry';
export {VideoV3SafeControlLayer} from './presentation/VideoV3SafeControlLayer';
export {VideoV3FirstFrameLoading, type VideoV3FirstFrameLoadingProps} from './loading/VideoV3FirstFrameLoading';
export {VideoV3PresentationShell, type VideoV3PresentationShellProps} from './presentation/VideoV3PresentationShell';
export {
  VideoV3PipAdapter,
  type VideoV3PipAction,
  type VideoV3PipMode,
  type VideoV3PipPort,
  type VideoV3PipState,
} from './platform/VideoV3PipAdapter';
export {VideoV3Host, type VideoV3HostProps} from './host/VideoV3Host';
export {
  VideoV3NativeSurface,
  type VideoV3NativeSurfaceProps,
} from './surface/VideoV3NativeSurface';
export {
  VideoV3SurfaceController,
  type VideoV3SurfaceState,
  type VideoV3SurfaceStateListener,
} from './surface/VideoV3SurfaceController';
