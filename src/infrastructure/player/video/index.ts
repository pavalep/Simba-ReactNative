/**
 * `src/infrastructure/player/video/` barrel.
 *
 * ## Why this barrel still exists
 *
 * The W5 slice shipped a `VideoController` orchestrator here. It was
 * deleted (V22 W22, item 20 / B-014): `useVideoController` had ZERO
 * call sites, `getVideoController` was only ever called from inside the
 * dead module, and the lib exported none of it. Chrome never used it —
 * the chrome reads its state from `usePlaybackState`.
 *
 * What survives in this folder is the ERROR CLASSIFIER, which is live:
 * `VideoErrorOverlay` imports `classifyError` from the app barrel, and
 * seven chrome suites `jest.requireActual` THIS module to get the real
 * classifier into their barrel mock. So the barrel stays, and now
 * re-exports the classifier directly instead of through the deleted
 * controller.
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 5.1-5.3.
 */

export {
  classifyError,
  type ClassifiedError,
  type ErrorCategory,
  type ErrorRecoveryAction,
} from './errorClassifier';
