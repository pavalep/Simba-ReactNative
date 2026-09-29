/**
 * V19 W5 — `src/infrastructure/player/video/` barrel.
 *
 * The W5 slice has exactly one React-aware file
 * (`useVideoController.ts`); everything else is pure TypeScript
 * so the policy layer stays testable without a renderer.
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 5.1-5.3.
 */

export {
  VideoController,
  classifyError,
  type VideoControllerState,
  type VideoControllerPhase,
  type VideoControllerEvent,
  type VideoControllerListener,
  type VideoControllerDeps,
  type VideoItem,
  type LoadFileOptions,
  type VideoRepeatMode,
  type ClassifiedError,
  type ErrorCategory,
  type ErrorRecoveryAction,
} from './VideoController';

export {
  useVideoController,
  __setVideoControllerForTests,
  type UseVideoControllerApi,
} from './useVideoController';
