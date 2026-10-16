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
 *         videoPresentation      → 'expanded'  (the user asked for fullscreen)
 *         otherwise              → 'mini'      (the dock, or browsing screens)
 *
 * V21 F3 briefly made the second input `isPlayerActivity` — "is this React
 * tree the dedicated `PlayerActivity`'s tree". Collapsing to one Activity
 * deleted the question rather than answering it differently.
 *
 * 2026-10-16: the second input was `videoSurfacePresented` — "is the surface
 * ACTUALLY showing video", the boolean a native mutation returned. That
 * existed only because the surface was mounted OUTSIDE the React tree, so no
 * React-side fact could answer it. With `<SimbaVideo>` now a real view
 * component in the tree, the answer is structural: the picture is mounted
 * exactly when the chrome that renders it is mounted. See the note at the
 * derivation below.
 *
 * The lesson this module exists to carry still holds: it is not that storage is
 * forbidden, it is that a DERIVED value written by every tree is a race. One
 * writer reporting a real outcome is not that. It is also not a reason to keep
 * storing a value that is no longer derived from anything.
 *
 * The `useLaunchParams()`-based alternative is wrong for this: it is
 * a ONE-SHOT queue (the first consumer drains it, so a chrome
 * component would steal the payload from the player root), it is
 * async (the answer lands a render late, so a mount gate flashes its
 * own absence for a frame), and "are there launch params?" is not
 * "is there a surface under me?".
 *
 * The lib barrel is not imported here at all. It used to import
 * `useIsPlayerActivity` and never called it — a dead import that survived
 * because neither `tsc` (no `noUnusedLocals`) nor the ESLint config flags
 * unused imports in this repo. F5 deletes `useIsPlayerActivity` outright,
 * so carrying the import forward would only have hidden the deletion.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.23 + `md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md` §3.B.
 */

import {
  usePresentationStore,
  type PresentationMode,
  type PresentationState,
  type VideoMiniRect,
  type VideoPresentation,
} from '../../state/usePresentationStore';

export {
  usePresentationStore,
  type PresentationMode,
  type PresentationState,
  type VideoMiniRect,
  type VideoPresentation,
};

export interface Presentation {
  /** The derived mode. See the module docstring. */
  mode: PresentationMode;
  /** `mode === 'pip'`, hoisted so callers don't re-derive it. */
  isPip: boolean;
  /** `mode === 'expanded'` — the full chrome over the player surface. */
  isExpanded: boolean;
  /**
   * `mode === 'mini'` AND there is something to minimise to.
   *
   * Distinct from `!isExpanded`: PiP is also not-expanded, but during PiP
   * there is no mini bar — the OS window owns the surface, and drawing a
   * mini bar under it would be a second, competing presentation of one
   * video. A caller that wants "the dock" must not be handed true for PiP.
   */
  isMini: boolean;
  /** What the app asked of the video, ignoring whether it succeeded. */
  videoPresentation: VideoPresentation;
  /** Record the requested video presentation. */
  setVideoPresentation: (presentation: VideoPresentation) => void;
  /** The mini player's measured window rect, or `null`. */
  videoMiniRect: VideoMiniRect | null;
  /** Publish (or clear) the mini player's measured rect. */
  setVideoMiniRect: (rect: VideoMiniRect | null) => void;
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
  // 2026-10-16. `videoSurfacePresented` is GONE from this derivation.
  //
  // It existed to answer "is the surface ACTUALLY showing video?", which was
  // not derivable while the surface was a Kotlin-mounted SIBLING of the React
  // root: React rendered a transparent placeholder and the real picture lived
  // outside the tree, so the only evidence was the boolean the native mutation
  // returned.
  //
  // `<SimbaVideo>` is now a real view component IN the tree, so the question
  // became structural rather than reported: the picture is mounted exactly
  // when the chrome that renders it is mounted. There is nothing left to
  // report, so nothing is stored and nothing is waited a render late — which
  // also removes the one-frame chrome flash the async answer could cause.
  //
  // What is deliberately NOT reintroduced: a mount gate here. The gate would
  // read "should the picture be showing", and the picture's own presence in
  // this tree already is that answer. Re-asking it is how two owners of one
  // fact get built.
  const videoPresentation = usePresentationStore(s => s.videoPresentation);
  const videoMiniRect = usePresentationStore(s => s.videoMiniRect);
  const setVideoPresentation = usePresentationStore(
    s => s.setVideoPresentation,
  );
  const setVideoMiniRect = usePresentationStore(s => s.setVideoMiniRect);
  const pipActive = usePresentationStore(s => s.pipActive);
  const setPipActive = usePresentationStore(s => s.setPipActive);
  const togglePip = usePresentationStore(s => s.togglePip);

  // Two inputs, both facts about the app's own state: did the user ask for
  // fullscreen video, and is the OS PiP window owning it.
  const mode: PresentationMode = pipActive
    ? 'pip'
    : videoPresentation === 'expanded'
      ? 'expanded'
      : 'mini';

  // Both flags are read off `mode`, never recomputed from the inputs.
  // Computing `isExpanded` as its own expression is how PiP came to report
  // expanded: the PiP branch lives in `mode` only, so a parallel expression
  // silently disagrees with it. One derivation, one answer.
  //
  // `isMini` is simply the other half of `mode`. It used to additionally
  // require `videoSurfacePresented`, to avoid advertising a video in a dock
  // that had nothing to put in it — a guard against an un-presentable
  // surface, which is no longer a state that can exist.
  return {
    mode,
    isPip: mode === 'pip',
    isExpanded: mode === 'expanded',
    isMini: mode === 'mini',
    videoPresentation,
    setVideoPresentation,
    videoMiniRect,
    setVideoMiniRect,
    setPipActive,
    togglePip,
  };
}
