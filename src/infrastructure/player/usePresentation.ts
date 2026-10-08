/**
 * V19 W6.0 — `usePresentation()`: the chrome's presentation read model.
 *
 * `mode` is DERIVED here, never stored. See
 * `src/state/usePresentationStore.ts` for the full account of why a
 * stored, cross-root-written `mode` shipped a black player screen
 * (two activity React roots fighting over one process-global zustand
 * store), and why the mode is now computed from the tree's own facts.
 *
 * The short version:
 *
 *   mode = pipActive          → 'pip'       (a window state)
 *         isPlayerActivity    → 'expanded'  (this tree has a surface)
 *         otherwise           → 'mini'      (browsing screens)
 *
 * `isPlayerActivity` is lib 1.7.0's synchronous, idempotent answer
 * to "is there a native `MpvRenderView` beneath this React tree?".
 * Because each activity's tree asks the question about ITSELF, two
 * mounted roots cannot disagree — which is exactly what the old
 * shared-store design invited.
 *
 * The `useLaunchParams()`-based alternative is wrong for this: it is
 * a ONE-SHOT queue (the first consumer drains it, so a chrome
 * component would steal the payload from the player root), it is
 * async (the answer lands a render late, so a mount gate flashes its
 * own absence for a frame), and "are there launch params?" is not
 * "is there a surface under me?".
 *
 * Imported from `./playbackFacade` rather than the package barrel so
 * this file keeps the 1-import rule for the lib and does not widen
 * the `src/infrastructure/player/index.ts` cycle
 * (barrel → chrome → … → barrel), the same class of failure recorded
 * in `usePlaybackState.ts`.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.23 + `md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md` §3.B.
 */

import {useIsPlayerActivity} from './playbackFacade';
import {
  usePresentationStore,
  type PresentationMode,
  type PresentationState,
} from '../../state/usePresentationStore';

export {usePresentationStore, type PresentationMode, type PresentationState};

export interface Presentation {
  /** The derived mode. See the module docstring. */
  mode: PresentationMode;
  /** `mode === 'pip'`, hoisted so callers don't re-derive it. */
  isPip: boolean;
  /** `mode === 'expanded'` — i.e. this tree has a player surface. */
  isExpanded: boolean;
  /** Enter/leave PiP. Pair with the native `enterPip`/`exitPip`. */
  setPipActive: (active: boolean) => void;
  /** Flip PiP on the JS side. */
  togglePip: () => void;
}

/**
 * Usage in VideoPlayer (W4+):
 *   const {isExpanded} = usePresentation();
 *   if (!isExpanded) return null;
 */
export function usePresentation(): Presentation {
  const isPlayerActivity = useIsPlayerActivity();
  const pipActive = usePresentationStore((s) => s.pipActive);
  const setPipActive = usePresentationStore((s) => s.setPipActive);
  const togglePip = usePresentationStore((s) => s.togglePip);

  const mode: PresentationMode = pipActive
    ? 'pip'
    : isPlayerActivity
      ? 'expanded'
      : 'mini';

  return {
    mode,
    isPip: mode === 'pip',
    isExpanded: mode === 'expanded',
    setPipActive,
    togglePip,
  };
}
