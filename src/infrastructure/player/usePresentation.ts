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
 *   mode = pipActive             → 'pip'       (a window state)
 *         videoSurfacePresented  → 'expanded'  (the surface is really showing)
 *         otherwise              → 'mini'      (browsing screens)
 *
 * V21 F3: the second input was `isPlayerActivity` — "is this React tree
 * the dedicated `PlayerActivity`'s tree". Collapsing to one Activity
 * deleted the question rather than answering it differently: there is one
 * tree and one mounted surface, always, so the predicate would have said
 * 'mini' everywhere and the chrome would never have mounted.
 *
 * `videoSurfacePresented` replaces it, and it is a better question: not
 * "is there a surface" but "is the surface actually showing video". That
 * cannot be derived here — it is the boolean the native mutation returned —
 * so it is stored, written by exactly one hook (`useVideoSurface`). The
 * lesson this module exists to carry still holds: it is not that storage is
 * forbidden, it is that a DERIVED value written by every tree is a race.
 * One writer reporting a real outcome is not that.
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
  // V21 F3. This used to be `useIsPlayerActivity()` — "is this React tree
  // the dedicated PlayerActivity's tree", i.e. "is there a native surface
  // beneath me". With playback in `MainActivity` that question has no
  // answer any more: there is exactly one tree and one surface, always.
  // Asking it anyway would report 'mini' everywhere and the video chrome
  // would never mount.
  //
  // What replaced it is the better question: is the surface ACTUALLY
  // showing video? That is not derivable from app state — it is the boolean
  // the native call returned — so `useVideoSurface` (its only writer) sets
  // it and this reads it. `false` means 'mini', which is the honest
  // rendering: no chrome over a window with no video, instead of a full
  // player UI painted on nothing.
  const videoSurfacePresented = usePresentationStore((s) => s.videoSurfacePresented);
  const pipActive = usePresentationStore((s) => s.pipActive);
  const setPipActive = usePresentationStore((s) => s.setPipActive);
  const togglePip = usePresentationStore((s) => s.togglePip);

  const mode: PresentationMode = pipActive
    ? 'pip'
    : videoSurfacePresented
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
