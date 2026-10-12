/**
 * V19 W6.0 — `usePresentationStore`: PiP flow state ONLY.
 *
 * `presentation` is an app-side concept, not a lib concept. The lib's
 * `PlayerActivity` is `launchMode="singleTask"` — there's only one
 * presentation at the native level (fullscreen activity).
 * Mini/expanded/pip is a JS-side decision the chrome reads.
 *
 * ## Why this store holds `pipActive` and NOT `mode`
 *
 * W6.0 originally stored `mode: 'mini' | 'expanded' | 'pip'` here and
 * had a `usePresentationSync()` effect (in every activity's tree)
 * write `isPlayerActivity ? 'expanded' : 'mini'` into it. That
 * shipped a black player screen with no chrome at all, and the cause
 * was structural, not a typo:
 *
 * Each Android activity hosts its OWN React root, so `App` — and
 * with it `usePresentationSync` — is mounted TWICE while the player
 * is up: once in the background `MainActivity` tree
 * (`isPlayerActivity === false`) and once in the foreground
 * `PlayerActivity` tree (`isPlayerActivity === true`). Both roots
 * write the SAME process-global zustand store, and `mode` was in the
 * effect's dependency array, so each root's write re-triggered the
 * other's effect, which wrote back. The store ping-ponged
 * `expanded → mini → expanded → mini` forever.
 *
 * The visible symptom was worse than a lost toggle. The chrome gate
 * returns `null` in `'mini'`, so the entire compositor was mounted
 * and unmounted in a loop: the topbar, transport bar, title and
 * overlays were torn down and rebuilt several times per second while
 * the video played underneath, and each cycle re-ran a synchronous
 * MMKV write. Captured at any instant it looked like a black screen
 * with no controls. The persisted store is the proof — the MMKV
 * write log is a stream of `player-presentation {"mode":"expanded"}`
 * / `{"mode":"mini"}` pairs.
 *
 * **The lesson, and the rule this file now encodes:** a value that
 * is DERIVED from a per-tree fact must not be stored in shared
 * process state written by every tree. Two writers, one value, is a
 * race — regardless of how carefully each writer is written.
 *
 * So `mode` is not state. It is computed at read time in
 * `usePresentation()` from exactly two inputs:
 *
 *   1. `isPlayerActivity` — a fact about THIS React tree, already
 *      answered synchronously by lib 1.7.0's `useIsPlayerActivity()`.
 *      Correct on the first render, so there is no frame of wrong
 *      chrome, and impossible for two trees to disagree about
 *      because each tree asks about itself.
 *   2. `pipActive` — below. Genuinely global: the PiP window is a
 *      window state, not a tree state.
 *
 * With the mode derived, no tree ever writes it, so there is no
 * writer to race and `usePresentationSync` no longer exists.
 *
 * ## Why `pipActive` is NOT persisted
 *
 * The old store persisted `mode` to MMKV. Persisting a derived value
 * is what stranded the app: `'pip'` was written to disk, and on the
 * next cold start the old `usePresentationSync` explicitly refused to
 * overwrite `'pip'` (it treated PiP as owned by the PiP flow), so a
 * process that had died in Picture-in-Picture came back permanently
 * suppressed. A transient window state must not survive process
 * death — Android tears down the PiP window with the activity, so
 * the honest post-restart value is always "not in PiP", which is the
 * initial state here.
 *
 * W6.1 will drive `setPipActive` from the lib's PiP-mode-change
 * events as well as the button, so a system-initiated PiP (home
 * gesture) reconciles with the JS chrome. That flow needs no extra
 * state: entering sets `true`, leaving sets `false`, and `mode`
 * re-derives to whatever the host activity says on its own.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.23 + `md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md` §3.B.
 */

import {create} from 'zustand';

/**
 * What shape the chrome takes.
 *
 * - `mini`: no chrome above the foreground screen (there is no video
 *   mini dock — playback happens in its own activity, so nothing to
 *   dock beneath; see `VideoPlayerChrome`).
 * - `expanded`: the full chrome compositor over the player surface.
 * - `pip`: the native PiP window owns the surface; the chrome is
 *   suppressed.
 */
export type PresentationMode = 'mini' | 'expanded' | 'pip';

/**
 * What the APP has asked of the video, independently of whether the
 * surface managed to do it.
 *
 * This is a request, not an outcome, and keeping the two apart is the whole
 * point. `videoSurfacePresented` below records what the native call actually
 * returned; this records what the user asked for. Collapsing them into one
 * value is what makes "the app claims a video is on screen when nothing is"
 * impossible — and it is also what lets a minimise request that the surface
 * cannot honour fall back to a truthful 'mini' rather than being overwritten
 * by the failure.
 */
export type VideoPresentation = 'expanded' | 'mini';

/**
 * The mini player's live on-screen rect, in WINDOW pixels.
 *
 * `setVideoBounds` places the native `SurfaceView` inside the host
 * container, not inside a React node, so a React-relative layout value is
 * not enough — the surface needs window coordinates. `measureInWindow` is
 * what produces them, and this is where the result is published.
 *
 * One writer (the `MiniPlayer`'s own layout pass), one reader
 * (`useVideoSurface`). It is a measurement, not a derivation: no pure
 * function of app state can know where a view ended up on screen.
 */
export interface VideoMiniRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PresentationState {
  /**
   * Whether the PiP window is currently up.
   *
   * Genuinely global: the PiP window is a window state, not a tree state.
   */
  pipActive: boolean;

  /**
   * Enter or leave PiP. Must be paired with the native transition
   * (`commands.enterPip()` / `commands.exitPip()`); entering PiP
   * without suppressing the JS chrome paints the full chrome over
   * the PiP window, and leaving it without restoring the chrome
   * leaves a black activity.
   */
  setPipActive: (active: boolean) => void;

  /** Flip `pipActive`. */
  togglePip: () => void;

  /**
   * V21 F3 — is the native video surface actually showing video right now?
   *
   * This one IS stored, and the distinction matters. `pipActive` and the
   * old `mode` were DERIVED from per-tree facts, which is why every tree
   * writing one of them was a race (see the module docstring). This is
   * neither derived nor guessed: it is the boolean a native call actually
   * returned. `setVideoBounds` / `setSurfaceVisible` resolve `false` when
   * there is no surface, when the caller is off the main thread, or when
   * the mutation threw — and "we asked and it did not happen" is not
   * something any pure function of app state can know.
   *
   * It has exactly ONE writer (`useVideoSurface`, mounted once, in
   * `ActivityShell`), which is what makes it safe: the rule this file
   * exists to enforce is about *multiple writers of a derived value*, not
   * about storage as such.
   *
   * The reason the answer is needed: `usePresentation()` decides whether
   * to render the video chrome. If it answered from the SESSION instead,
   * an unpresentable surface (no mount, refused mutation) would still
   * report 'expanded' and paint the full chrome over a window with no
   * video in it. Reading the real outcome means that case falls back to
   * 'mini' — chrome off, no lie on screen.
   */
  videoSurfacePresented: boolean;

  /** Record the outcome of a native surface presentation attempt. */
  setVideoSurfacePresented: (presented: boolean) => void;

  /**
   * V21 F4 — has the app been asked to show video fullscreen or minimised?
   *
   * Written by discrete events only: the launch seam (every video launch
   * resets it to `'expanded'`, mirroring how it already calls
   * `expandAudioPlayer()` for audio), the minimise verb, and tapping the
   * mini bar. Never written from an effect that depends on the value it
   * writes — that is the W6.0 ping-pong described in the module docstring,
   * and it shipped a black player screen. One tree writes it after F5, and
   * even before that, the writers are user/launch events rather than
   * per-tree reconcilers.
   */
  videoPresentation: VideoPresentation;

  /** Record the requested video presentation. */
  setVideoPresentation: (presentation: VideoPresentation) => void;

  /**
   * The mini player's measured window rect, or `null` when it has not been
   * measured (or has been torn down).
   *
   * `null` is the honest answer for "we cannot place the surface", and
   * `useVideoSurface` refuses to reveal a surface it cannot place — a
   * 0x0 `SurfaceView` is an invalid libmpv render target, so guessing here
   * would trade a missing mini player for a black rectangle.
   */
  videoMiniRect: VideoMiniRect | null;

  /** Publish (or clear, with `null`) the mini player's measured rect. */
  setVideoMiniRect: (rect: VideoMiniRect | null) => void;
}

export const usePresentationStore = create<PresentationState>()(set => ({
  pipActive: false,
  setPipActive: (pipActive: boolean) => set({pipActive}),
  togglePip: () => set(state => ({pipActive: !state.pipActive})),
  videoSurfacePresented: false,
  setVideoSurfacePresented: (videoSurfacePresented: boolean) =>
    set({videoSurfacePresented}),
  videoPresentation: 'expanded',
  setVideoPresentation: (videoPresentation: VideoPresentation) =>
    set({videoPresentation}),
  videoMiniRect: null,
  setVideoMiniRect: (videoMiniRect: VideoMiniRect | null) =>
    set({videoMiniRect}),
}));
