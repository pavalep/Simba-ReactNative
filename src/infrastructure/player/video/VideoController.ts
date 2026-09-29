/**
 * V19 W5 Phase 5.1 + 5.2 — `VideoController` (the orchestrator).
 *
 * A PURE TypeScript class. No React import, no JSX, no store, no
 * lib import. It owns the video lane's *behaviour* — load
 * lifecycle, lane integrity, finish policy, repeat semantics,
 * error classification — and nothing else.
 *
 * Why a class and not hooks:
 *
 *   The behaviours in W5 are not view concerns. "On EOF with
 *   repeat-one, seek(0) + play" and "an audio item never enters
 *   the video lane" are invariants that must hold whether the
 *   chrome is mounted, whether a test is driving the controller
 *   directly, or whether a future headless/background path calls
 *   it. Encoding them in a component's `useEffect` makes them
 *   untestable without a renderer and lets them drift per call
 *   site. The SPEC is explicit: the controller "never knows about
 *   React. The view just listens." (SPEC §2 diagram)
 *
 *   So the controller is a plain class, the native/player bridge
 *   is injected, and the view subscribes via `subscribe()` and
 *   re-renders on `getState()`. `useVideoController()` (the thin
 *   React binding, exported alongside) does exactly that with
 *   `useSyncExternalStore`.
 *
 * Design rules enforced here (all from the SPEC + TRACKER):
 *
 *   - **Commands are PURE intents** (TRACKER 5.1). `play()` etc.
 *     do not mutate UI. They update the controller's own state
 *     and push a `transition` event for the view to react to.
 *   - **loadFile invalidates in-flight work** (TRACKER 5.1). Each
 *     load bumps a monotonically-increasing `loadToken`; any
 *     async completion tagged with an older token is dropped, so
 *     a slow `load('a')` can never clobber a fast `load('b')`.
 *   - **retry() is loadFile(lastUri)** (TRACKER 5.1) — same code
 *     path, so a retry inherits every invalidation guarantee.
 *   - **close() clears everything** (TRACKER 5.1) including the
 *     native session, and emits the terminal `idle` state.
 *   - **Lane integrity** (TRACKER 5.2). This controller is the
 *     video lane. `next()` returns a video item or null; it
 *     NEVER returns audio. Audio is a sibling controller's lane
 *     and the video lane must not hand off across lanes — it
 *     resolves only against the injected video-queue provider.
 *   - **Finish policy** (TRACKER 5.2):
 *       repeat-one → seek(0) + play, same item, no reload
 *       repeat-all → loadFile(next) if a next VIDEO exists,
 *                     else `finished` (never auto-replay)
 *       off        → `finished`, "Play from beginning"
 *
 * The native bridge is injected as a narrow `VideoControllerDeps`
 * so the class has no import of `@simba-dev/react-native-media-
 * player` — which is what keeps it unit-testable without a
 * renderer AND keeps the lib boundary in the facade layer.
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 5.1 + 5.2
 *   `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §2 (boundary
 *   diagram), §8.3 (repeat behaviour), §11 (finish policy).
 */

import {mediaKindToLane} from '../../../types/media';
import type {MediaKind, MediaLane} from '../../../types/media';
import {classifyError} from './errorClassifier';
import type {
  ClassifiedError,
  ErrorCategory,
  ErrorRecoveryAction,
} from './errorClassifier';

// ─── State ──────────────────────────────────────────────────────────

/**
 * THE single playback-phase enum for the video lane.
 *
 * This type used to exist TWICE with different vocabularies — the
 * controller declared `idle | loading | ready | playing | paused |
 * finished | error` while the chrome's `usePlaybackState` derived
 * `idle | preparing | playing | paused | seeking | buffering |
 * finished | error`. Two owners for one concept, and they disagreed
 * on the two states that matter most (the controller had no
 * `buffering`, the chrome had no `loading`).
 *
 * The controller is now the sole owner (TRACKER 5.1: "Owns …
 * videoState"), and `usePlaybackState()` reads its value back out
 * of the controller after feeding it the lib observation. One
 * vocabulary, one owner, no drift.
 */
export type VideoState =
  | 'idle'
  | 'preparing'
  | 'playing'
  | 'paused'
  | 'seeking'
  | 'buffering'
  | 'finished'
  | 'error';

/**
 * The controller's view of the video lane.
 *
 * `lane` is a literal `'video'` — this controller IS the video
 * lane. It is typed as `MediaLane` so the shared
 * `VideoControllerState` shape can be diffed against an audio
 * sibling later, but the constructor pins it.
 */
export interface VideoControllerState {
  readonly lane: MediaLane;
  /** The loaded item, or null when idle. */
  readonly currentItem: VideoItem | null;
  /** The playback phase. The ONE enum — see `VideoState` above. */
  readonly videoState: VideoState;
  /** The classified failure, or null. Non-null only when
   *  `videoState === 'error'`. */
  readonly error: ClassifiedError | null;
  /** Current repeat mode. */
  readonly repeatMode: VideoRepeatMode;
  /** Monotonic id of the most recent load. Used to invalidate
   *  stale async completions (TRACKER 5.1). */
  readonly loadToken: number;
}

/**
 * @deprecated Kept as a source-compatible alias for `VideoState`.
 *
 * The controller's private vocabulary (`loading` / `ready`) was
 * merged into the single `VideoState` enum so the controller and
 * the chrome can never disagree about what phase playback is in.
 * New code should use `VideoState`.
 */
export type VideoControllerPhase = VideoState;

/**
 * Repeat mode for the video lane.
 *
 * Named `VideoRepeatMode` (not `RepeatMode`) because the facade
 * already exports `RepeatMode` from `useTransport` for the
 * transport surface. Same vocabulary, same three members — the
 * distinct name keeps the two public exports from colliding at
 * the facade boundary.
 */
export type VideoRepeatMode = 'off' | 'one' | 'all';

/** The item a lane plays. */
export interface VideoItem {
  readonly uri: string;
  readonly title: string;
  /**
   * The item's lane. A `'audio'` item reaching this controller is
   * a lane-integrity violation and is rejected by `loadFile`
   * (TRACKER 5.2).
   */
  readonly lane: MediaLane;
  /** Optional original media kind, used when lane is derived. */
  readonly kind?: MediaKind;
  readonly artworkUri?: string;
  /** Resume position in ms, honoured on first prepare. */
  readonly startPositionMs?: number;
}

/** Options for `loadFile`. */
export interface LoadFileOptions {
  readonly title?: string;
  readonly kind?: MediaKind;
  readonly lane?: MediaLane;
  readonly artworkUri?: string;
  readonly startPositionMs?: number;
}

// ─── Events ─────────────────────────────────────────────────────────

/**
 * The event stream the view listens to. Commands are pure intents;
 * they translate into these events so the view can render without
 * the controller ever touching UI.
 */
export type VideoControllerEvent =
  | {readonly type: 'load'; readonly item: VideoItem; readonly token: number}
  | {readonly type: 'play'}
  | {readonly type: 'pause'}
  | {readonly type: 'seek'; readonly positionMs: number}
  | {readonly type: 'close'}
  | {readonly type: 'repeatMode'; readonly mode: VideoRepeatMode}
  | {readonly type: 'eof'; readonly next: VideoItem | null}
  | {readonly type: 'error'; readonly error: ClassifiedError}
  | {
      readonly type: 'recovery';
      readonly action: ErrorRecoveryAction;
      readonly error: ClassifiedError;
    }
  | {
      readonly type: 'state';
      readonly state: VideoControllerState;
    };

export type VideoControllerListener = (e: VideoControllerEvent) => void;

// ─── Injected bridge ────────────────────────────────────────────────

/**
 * The native/player surface the controller drives. Injected, not
 * imported, so the controller has no lib dependency and tests can
 * pass a spy.
 *
 * Each method corresponds to a lib `PlayerCommands` method
 * (lib 1.6.0 surface) — the controller is a policy layer over
 * the bridge, not a re-implementation of it.
 */
export interface VideoControllerDeps {
  /** `commands.loadFile(uri)` */
  loadFile(uri: string): void;
  /** `commands.play()` */
  play(): void;
  /** `commands.pause()` */
  pause(): void;
  /** `commands.seek(positionMs)` */
  seek(positionMs: number): void;
  /** `commands.stop()` — release the native session (TRACKER close). */
  stop(): void;
  /**
   * Resolve the next item in the VIDEO queue, or null at the end.
   *
   * The provider is lane-scoped by construction: the composition
   * root (`useVideoController`) passes a resolver that only ever
   * returns video-lane items, which is how "next is a video item
   * or no next — never audio" is enforced (TRACKER 5.2).
   */
  getNextVideo(): VideoItem | null;
  /**
   * Optional async prepare acknowledgement. The controller awaits
   * it so it can drop a completion whose `loadToken` is stale
   * (TRACKER 5.1 "loadFile invalidates in-flight operations").
   * Resolving marks the lane `ready`; rejecting routes through
   * the classifier into `error`.
   */
  prepare?(
    item: VideoItem,
    token: number,
  ): Promise<void> | void;
  /** Optional logger for `__DEV__` tracing. */
  log?(message: string, detail?: unknown): void;
}

// ─── Controller ─────────────────────────────────────────────────────

const INITIAL: VideoControllerState = {
  lane: 'video',
  currentItem: null,
  videoState: 'idle',
  error: null,
  repeatMode: 'off',
  loadToken: 0,
};

/**
 * The video-lane orchestrator. See the module header for the full
 * contract. One instance per app (created by `useVideoController`
 * and stored in a module-level singleton so the always-mounted
 * chrome and any imperative caller share one policy owner).
 */
export class VideoController {
  private deps: VideoControllerDeps;
  private readonly listeners = new Set<VideoControllerListener>();
  private state: VideoControllerState = INITIAL;
  /** The URI most recently loaded, for `retry()`. TRACKER 5.1:
   *  "retry() is loadFile with the cached URI". Cached here, not
   *  by the caller, so callers can't pass a mismatched URI. */
  private lastUri: string | null = null;
  private lastOptions: LoadFileOptions = {};
  private disposed = false;

  constructor(deps: VideoControllerDeps) {
    this.deps = deps;
  }

  // ── Observation ────────────────────────────────────────────────

  /** Current state. Safe to call in render (returns a stable ref
   *  between transitions). */
  getState = (): VideoControllerState => this.state;

  /** Subscribe to the event stream. Returns an unsubscribe fn. */
  subscribe = (listener: VideoControllerListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Subscribe to state changes only (used by the React binding). */
  subscribeState = (listener: () => void): (() => void) => {
    const wrapped = () => listener();
    this.listeners.add(wrapped);
    return () => {
      this.listeners.delete(wrapped);
    };
  };

  private emit(e: VideoControllerEvent): void {
    for (const l of this.listeners) l(e);
  }

  /** Replace state and notify state subscribers. */
  private setState(patch: Partial<VideoControllerState>): void {
    this.state = {...this.state, ...patch};
    this.emit({type: 'state', state: this.state});
  }

  private log(message: string, detail?: unknown): void {
    this.deps.log?.(message, detail);
  }

  // ── Load lifecycle (TRACKER 5.1) ───────────────────────────────

  /**
   * Load an item into the video lane.
   *
   * - Rejects an audio-lane item (lane integrity, TRACKER 5.2) by
   *   transitioning to `error` with a `blocked`-shaped classified
   *   error and NOT calling the bridge. Returning a rejected
   *   promise would force every caller into a try/catch for a
   *   condition the controller treats as terminal UI state.
   * - Bumps `loadToken` FIRST, so any in-flight `prepare` from a
   *   prior load is invalidated before we touch the bridge.
   * - Caches the URI + options for `retry()`.
   */
  loadFile = async (
    uri: string,
    opts: LoadFileOptions = {},
  ): Promise<void> => {
    if (this.disposed) return;
    const lane: MediaLane =
      opts.lane ??
      (opts.kind ? mediaKindToLane(opts.kind) : 'video');

    // Lane integrity: this controller is the video lane. An audio
    // item is a hard error, surfaced through the classifier so the
    // view renders the standard error overlay rather than silently
    // no-op'ing.
    if (lane !== 'video') {
      this.reportError(
        new Error(
          `[VideoController] lane violation: refusing to load an '${lane}' item in the video lane`,
        ),
      );
      return;
    }

    const item: VideoItem = {
      uri,
      title: opts.title ?? '',
      lane: 'video',
      kind: opts.kind,
      artworkUri: opts.artworkUri,
      startPositionMs: opts.startPositionMs,
    };

    // Invalidate prior in-flight work before any bridge call.
    const token = this.state.loadToken + 1;
    this.setState({
      currentItem: item,
      videoState: 'preparing',
      error: null,
      loadToken: token,
    });
    this.lastUri = uri;
    this.lastOptions = opts;
    this.emit({type: 'load', item, token});

    try {
      this.deps.loadFile(uri);
    } catch (e) {
      // Only surface the failure if this load is still the current
      // one; a newer load may already own the lane.
      if (token === this.state.loadToken) this.reportError(e);
      return;
    }

    if (!this.deps.prepare) return;
    try {
      await this.deps.prepare(item, token);
      // Stale completion guard (TRACKER 5.1): a newer loadFile ran
      // while this prepare was in flight — drop the result.
      if (token !== this.state.loadToken) {
        this.log('dropping stale prepare completion', {token});
        return;
      }
      // No state change here on purpose. The phase stays
      // 'preparing' until the lib actually reports 'playing' /
      // 'buffering' through `observePlayback`. Advancing it here
      // would mean claiming playback state we have not observed —
      // a fabricated transition.
    } catch (e) {
      if (token !== this.state.loadToken) {
        this.log('dropping stale prepare rejection', {token});
        return;
      }
      this.reportError(e);
    }
  };

  /**
   * Re-attempt the last loaded URI. TRACKER 5.1: "retry() is
   * loadFile with the cached URI" — literally the same path, so it
   * inherits every invalidation + lane guarantee. No-op when
   * nothing has been loaded.
   */
  retry = async (): Promise<void> => {
    if (this.lastUri === null) return;
    // A codec failure's recovery path wants a software-decode
    // retry; if the classified error asked for it, apply it before
    // re-loading. The actual `hwdec=no` write is the bridge's job;
    // the controller only signals the intent.
    if (this.state.error && this.state.error.actions.includes('software-decode')) {
      this.emit({
        type: 'recovery',
        action: 'software-decode',
        error: this.state.error,
      });
    }
    await this.loadFile(this.lastUri, this.lastOptions);
  };

  /** Release the native session and reset to `idle`. TRACKER 5.1. */
  close = (): void => {
    if (this.disposed) return;
    // Bump the token so any in-flight prepare is invalidated, then
    // release the native session and clear controller state.
    this.setState({loadToken: this.state.loadToken + 1, videoState: 'idle'});
    this.deps.stop();
    this.lastUri = null;
    this.lastOptions = {};
    this.state = INITIAL;
    this.emit({type: 'state', state: this.state});
    this.emit({type: 'close'});
  };

  // ── Transport intents (pure; TRACKER 5.1) ─────────────────────

  /** Intent: play. Updates local phase + emits; no UI mutation. */
  play = (): void => {
    if (this.disposed || !this.state.currentItem) return;
    if (this.state.videoState === 'finished') {
      // Play-after-finished is an explicit reset-to-zero + resume
      // (SPEC §11 "Play after Finished"), NOT a reload.
      this.seek(0);
    }
    this.deps.play();
    this.setState({videoState: 'playing', error: null});
    this.emit({type: 'play'});
  };

  /** Intent: pause. */
  pause = (): void => {
    if (this.disposed || !this.state.currentItem) return;
    this.deps.pause();
    this.setState({videoState: 'paused'});
    this.emit({type: 'pause'});
  };

  /** Intent: seek to an absolute position (clamped to >= 0). */
  seek = (positionMs: number): void => {
    if (this.disposed || !this.state.currentItem) return;
    const clamped = Math.max(0, positionMs);
    this.deps.seek(clamped);
    this.emit({type: 'seek', positionMs: clamped});
  };

  /** Set the repeat mode. */
  setRepeatMode = (mode: VideoRepeatMode): void => {
    if (this.disposed) return;
    this.setState({repeatMode: mode});
    this.emit({type: 'repeatMode', mode});
  };

  // ── Finish policy (TRACKER 5.2) ───────────────────────────────

  /**
   * Handle end-of-file for the current item.
   *
   * TRACKER 5.2 rules:
   *   - repeat-one → seek(0) + play on the SAME item. No second
   *     loadFile (the file is already loaded; reloading would flash).
   *   - repeat-all → resolve the next VIDEO item. If one exists,
   *     loadFile it. If not (end of queue), go `finished` — never
   *     auto-replay.
   *   - off → `finished`.
   *
   * The "next" comes from `deps.getNextVideo()`, which is
   * lane-scoped by construction, so repeat-all can never hand off
   * to an audio item (lane integrity, TRACKER 5.2).
   */
  handleEof = (): void => {
    if (this.disposed) return;
    const next = this.deps.getNextVideo();
    this.emit({type: 'eof', next});

    if (this.state.repeatMode === 'one') {
      // Same item restarts; no loadFile.
      this.deps.seek(0);
      this.deps.play();
      this.setState({videoState: 'playing'});
      return;
    }

    if (this.state.repeatMode === 'all' && next) {
      void this.loadFile(next.uri, {
        title: next.title,
        artworkUri: next.artworkUri,
        lane: next.lane,
      });
      return;
    }

    // off, or repeat-all with no next → finished. Never auto-replay.
    this.setState({videoState: 'finished'});
  };

  // ── Observation intake ───────────────────────────────────────

  /**
   * Report an observed playback phase into the controller.
   *
   * The lib's `commands.loadFile` is fire-and-forget — there is no
   * prepare promise to await, and inventing one with a timer would
   * be a fake acknowledgement. So the view observes the REAL lib
   * state (via `usePlaybackState` / the lib's own events) and
   * reports it here. The controller keeps ownership of *policy*
   * (what phase is legal, what happens at EOF, what an error
   * means) while the view supplies *observation* — no fake state
   * is invented on either side.
   *
   * Guards:
   *   - Ignored once disposed.
   *   - Ignored after `close()` (state is back to `idle`).
   *   - `error` is sticky: a failed load is not downgraded by a
   *     late-arriving `ready` from the same token.
   */
  observePlayback = (phase: VideoState): void => {
    if (this.disposed) return;
    if (!this.state.currentItem) return;
    if (this.state.videoState === 'error' && phase !== 'error') return;
    if (this.state.videoState === phase) return;
    this.setState({videoState: phase});
  };

  // ── Error handling (TRACKER 5.3) ──────────────────────────────

  /**
   * Route a failure through the classifier and into `error` state.
   * The classifier is pure; the controller only stores the result
   * and emits so the overlay can render it.
   */
  reportError = (e: unknown): void => {
    const classified = classifyError(e);
    this.setState({videoState: 'error', error: classified});
    this.emit({type: 'error', error: classified});
  };

  /**
   * Offer a recovery action for the current error. Pure intent —
   * the actual work is delegated to the view / bridge via the
   * emitted `recovery` event. This keeps "reauth" and
   * "stop-other" as chrome/navigation concerns, not controller
   * logic.
   */
  requestRecovery = (action: ErrorRecoveryAction): void => {
    if (!this.state.error) return;
    this.emit({type: 'recovery', action, error: this.state.error});
  };

  // ── Lifecycle ────────────────────────────────────────────────

  /**
   * Re-point the controller at a fresh bridge without recreating
   * it.
   *
   * The React binding builds its `deps` from `usePlayer()`, whose
   * `commands` identity can change across provider re-renders. The
   * controller must survive those re-renders (recreating it would
   * drop every subscriber and reset the loaded item), so the
   * binding swaps the bridge in place instead.
   *
   * A disposed controller ignores this — a dead controller stays
   * dead rather than silently resurrecting.
   */
  attachDeps = (deps: VideoControllerDeps): void => {
    if (this.disposed) return;
    this.deps = deps;
  };

  /** Permanently dispose. Drops all listeners. */
  dispose = (): void => {
    this.disposed = true;
    this.listeners.clear();
  };

  /** True once `dispose()` has run. Exposed for the binding's teardown. */
  get isDisposed(): boolean {
    return this.disposed;
  }
}

export {classifyError};
export type {ClassifiedError, ErrorCategory, ErrorRecoveryAction};
