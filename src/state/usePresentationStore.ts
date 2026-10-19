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
 * This is a request, not an outcome.
 *
 * It was originally kept apart from an outcome value (`videoSurfacePresented`,
 * what the native surface mutation returned) so a request that could not be
 * honoured fell back to a truthful 'mini' instead of being overwritten by the
 * failure. That separation is still the right instinct, but the outcome side
 * no longer exists: the picture is a real view component in this tree, so
 * whether it is on screen is structural rather than reported.
 */
export type VideoPresentation = 'expanded' | 'mini';

/**
 * The mini player's live on-screen rect, in WINDOW pixels.
 *
 * It used to exist for a hand-off that no longer happens:
 * `useVideoSurface` read it and passed it to the lib's `setVideoBounds`,
 * because a `SurfaceView` mounted at `android.R.id.content` sits outside any
 * React node and could only be positioned in window coordinates. That is why
 * the unit here is WINDOW pixels and not a React-relative layout value.
 *
 * `<SimbaVideo>` is a React child now, so React Native positions it directly
 * and nothing needs a coordinate hand-off. `useVideoSurface` is deleted and
 * **this field currently has one writer and no reader** — `MiniPlayer`
 * publishes it, nothing consumes it.
 *
 * It is kept because Stage 9 gives it its reader: collapsing the video lane
 * onto D9 means ONE mounted `<SimbaVideo>` that fullscreen and the dock
 * differ by `style` on, and this measured rect is exactly the dock's
 * geometry. Stated plainly so the next reader does not go looking for a
 * consumer that does not exist yet.
 */
export interface VideoMiniRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The video lane's own origin in WINDOW pixels.
 *
 * The sibling of `VideoMiniRect`, and the same kind of fact: a measurement
 * of where a piece of player geometry sits, taken in window coordinates
 * because that is the only space two different subtrees can be compared in.
 *
 * The dock measures its slot. The lane measures its own origin. Neither
 * one alone can place the picture — the picture's box is relative to the
 * lane, and the dock's slot is relative to the window — so the
 * difference between them is the answer. See
 * `src/infrastructure/player/dockPlacement.ts`.
 *
 * It is published here rather than kept as the lane's local state so that
 * the placement is a pure function of two published measurements. That is
 * what makes it testable: `measureInWindow` is a native call, and React
 * Native Testing Library v14 removed `createNodeMock`, so a test cannot
 * give a host component a `measureInWindow` at all. A local
 * `useState` inside the lane would be permanently `null` under test, and
 * the wiring between the two measurements — the part that can actually be
 * wrong — would go untested.
 */
export interface VideoLaneOrigin {
  x: number;
  y: number;
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
   *
   * ## Why this starts `'mini'` (2026-10-16)
   *
   * It used to start `'expanded'`, and that was only ever survivable because
   * a second gate hid it: the old derivation was
   * `videoSurfacePresented ? 'expanded' : 'mini'`, and that flag is `false`
   * on a cold start, so `'expanded'` never actually took effect until a real
   * video launch happened.
   *
   * `videoSurfacePresented` is deleted now — the picture is a view in the
   * tree, so the mode is structural. Removing the mask exposed the value
   * underneath, and it was simply wrong: on a cold start **no writer has
   * run**, there is no video, and nothing can be expanded.
   *
   * This is not cosmetic. With `'expanded'` as the cold-start value,
   * `VideoPlayerChrome` mounted the entire expanded video chrome over an
   * empty player on every cold start. Each of those components calls the
   * bridge in its own mount effect, and React runs **child effects before
   * parent effects** — so they beat `PlayerProvider`'s own
   * `initPlayer()` effect. The result, on device, was eight consecutive
   * `MpvPlayerModule not initialized. Call initPlayer() first.` native
   * exceptions and a red screen at launch.
   *
   * `'mini'` is the honest cold-start value: it mounts no video chrome, so
   * nothing races the engine, and the launch seam promotes it to
   * `'expanded'` the moment a video actually starts.
   */
  videoPresentation: VideoPresentation;

  /** Record the requested video presentation. */
  setVideoPresentation: (presentation: VideoPresentation) => void;

  /**
   * The mini player's measured window rect, or `null` when it has not been
   * measured (or has been torn down).
   *
   * `null` remains the honest answer for "we cannot place the picture". It
   * used to be load-bearing because `useVideoSurface` refused to reveal a
   * surface it could not place — a 0x0 `SurfaceView` is an invalid libmpv
   * render target, so guessing traded a missing mini player for a black
   * rectangle. With the picture laid out by React Native, a zero-extent
   * result is simply a node that has not been measured, and `MiniPlayer`
   * already refuses to publish one.
   */
  videoMiniRect: VideoMiniRect | null;

  /** Publish (or clear, with `null`) the mini player's measured rect. */
  setVideoMiniRect: (rect: VideoMiniRect | null) => void;

  /**
   * The video lane's own window origin, or `null` before it has measured
   * itself.
   *
   * `null` is the honest answer for "we do not know where we are", and it
   * is what keeps the picture where it was rather than placing it
   * somewhere guessed.
   */
  videoLaneOrigin: VideoLaneOrigin | null;

  /**
   * Publish the lane's window origin.
   *
   * The equality guard lives here rather than at the call site: a
   * re-layout must not churn the store, and zustand notifies every
   * subscriber on every `set`, so "set it to the same value" is not a
   * no-op unless the setter says so.
   */
  setVideoLaneOrigin: (origin: VideoLaneOrigin | null) => void;
}

export const usePresentationStore = create<PresentationState>()(set => ({
  pipActive: false,
  setPipActive: (pipActive: boolean) => set({pipActive}),
  togglePip: () => set(state => ({pipActive: !state.pipActive})),
  videoPresentation: 'mini',
  setVideoPresentation: (videoPresentation: VideoPresentation) =>
    set({videoPresentation}),
  videoMiniRect: null,
  setVideoMiniRect: (videoMiniRect: VideoMiniRect | null) =>
    set({videoMiniRect}),
  videoLaneOrigin: null,
  setVideoLaneOrigin: (origin: VideoLaneOrigin | null) =>
    set(state => {
      const current = state.videoLaneOrigin;
      const unchanged =
        current === origin ||
        (current !== null &&
          origin !== null &&
          current.x === origin.x &&
          current.y === origin.y);
      // Returning the SAME state object tells zustand nothing changed, so
      // it does not notify a single subscriber. Returning a partial would
      // merge into a new object and re-render every reader of this store.
      return unchanged ? state : {videoLaneOrigin: origin};
    }),
}));