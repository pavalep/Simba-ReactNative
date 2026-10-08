/**
 * V19 W5 — `useVideoController()` — the React binding for the
 * `VideoController` orchestrator.
 *
 * This is the ONLY React-aware file in the W5 slice. It does three
 * jobs and nothing else:
 *
 *   1. Creates (once) the module-level `VideoController` singleton
 *      and injects the real bridge (`usePlayer().commands` from the
 *      lib) plus a lane-scoped `getNextVideo` resolver.
 *   2. Subscribes the view to controller state via
 *      `useSyncExternalStore` so the chrome re-renders on
 *      transitions without the controller knowing React exists.
 *   3. Exposes the controller's transport, error and observation
 *      actions. It does NOT expose presentation intents: W6.0 moved
 *      presentation to a derived read model (see
 *      `usePresentation.ts`), so this hook has no presentation
 *      surface to keep in sync.
 *
 * Why a module-level singleton:
 *
 *   Audit §5 Rule 8 FORBIDS multiple `SimbaPlayer` mounts — the
 *   native session is a singleton. Two controller instances would
 *   mean two owners of "which item is loaded" and "what does EOF
 *   do", which is exactly the split-brain the orchestrator exists
 *   to prevent. A module singleton guarantees the always-mounted
 *   chrome and any imperative caller share one policy owner.
 *
 * Lane integrity for `getNextVideo` (TRACKER 5.2 — "video lane
 * `Next` returns video item or 'no next' — never audio"):
 *
 *   The resolver reads the consumer's `usePlayerStore.playlist`
 *   (the lane-tagged queue `useQueueSync` maintains) and filters
 *   to `mediaType === 'video'` entries after the current index.
 *   It returns the first VIDEO item or `null`. It can never return
 *   an audio item, so `handleEof` under `repeat-all` physically
 *   cannot hand off across lanes.
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 5.1 + 5.2
 *   `md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md` §4.D + §5.
 */

import {useCallback, useMemo, useRef, useSyncExternalStore} from 'react';
import {usePlayer} from '@simba-dev/react-native-media-player';
import {usePlayerStore} from '../../../state/playerStore';
import {VideoController} from './VideoController';
import {getVideoController, setVideoController} from './controllerSingleton';
import type {
  LoadFileOptions,
  VideoRepeatMode,
  VideoControllerEvent,
  VideoControllerState,
  VideoItem,
} from './VideoController';
import type {ErrorRecoveryAction} from './errorClassifier';

// ─── Singleton ──────────────────────────────────────────────────────

/**
 * Module-level holder. Created lazily on the first `useVideoController`
 * call so a test can import the module without constructing a
 * controller (which would need the lib mocked).
 */
/** Test seam: inject a controller (or null to reset). */
export function __setVideoControllerForTests(
  next: VideoController | null,
): void {
  setVideoController(next);
}

/**
 * Build the controller's injected bridge.
 *
 * **This is a plain function, not a hook, and its name says so.**
 *
 * It used to be `useBuildDeps()` — named `use*` and called through
 * `useMemo(useBuildDeps, [])` so that the `usePlayer()` read inside it
 * would satisfy the linter's naming rule. The naming was the *only*
 * thing that satisfied it: the function was never a hook, and calling
 * it as a `useMemo` factory meant `usePlayer()` → `useContext()` ran
 * inside a built-in hook's callback, where React has no dispatcher
 * bound. React threw "Do not call Hooks inside useEffect(...),
 * useMemo(...), or other built-in Hooks", and because
 * `VideoErrorOverlay` calls `useVideoController()` *above* its
 * `videoState !== 'error'` early return, the throw happened on every
 * render of the expanded chrome — tearing down the whole compositor
 * and leaving the player activity completely blank.
 *
 * So: take the `commands` object as a parameter. A pure builder can't
 * be mis-wired into a hook slot again, and the linter has nothing left
 * to be fooled about.
 */
function buildDeps(
  commands: ReturnType<typeof usePlayer>['commands'],
): ConstructorParameters<typeof VideoController>[0] {
  return {
    loadFile: (uri: string) => commands.loadFile(uri),
    play: () => commands.play(),
    pause: () => commands.pause(),
    seek: (positionMs: number) => commands.seek(positionMs),
    stop: () => commands.stop(),
    getNextVideo: () => {
      const {playlist, currentIndex} = usePlayerStore.getState();
      if (!playlist || playlist.length === 0) return null;
      // Lane-scoped scan: first VIDEO item strictly after the
      // current index. An audio entry is skipped, not returned.
      for (let i = currentIndex + 1; i < playlist.length; i++) {
        const entry = playlist[i];
        if (entry?.mediaType !== 'video') continue;
        return {
          uri: entry.uri,
          title: entry.title,
          lane: 'video' as const,
          kind: entry.type,
          artworkUri: entry.artworkUri,
        } satisfies VideoItem;
      }
      return null;
    },
  };
}

// ─── Hook ───────────────────────────────────────────────────────────

export interface UseVideoControllerApi {
  /** Live controller state. Re-renders the caller on transition. */
  state: VideoControllerState;
  /** The controller instance (for imperative / non-React callers). */
  controller: VideoController;
  /** Subscribe to the raw event stream (load / eof / recovery / …). */
  subscribe: (l: (e: VideoControllerEvent) => void) => () => void;

  // ── Load lifecycle (TRACKER 5.1) ──
  loadFile: (uri: string, opts?: LoadFileOptions) => Promise<void>;
  retry: () => Promise<void>;
  close: () => void;

  // ── Transport intents ──
  play: () => void;
  pause: () => void;
  seek: (positionMs: number) => void;
  setRepeatMode: (mode: VideoRepeatMode) => void;

  // ── Finish policy (TRACKER 5.2) ──
  handleEof: () => void;

  // ── Error + recovery (TRACKER 5.3) ──
  reportError: (e: unknown) => void;
  requestRecovery: (action: ErrorRecoveryAction) => void;

  // ── Observation intake ──
  observePlayback: (phase: VideoControllerState['videoState']) => void;

  // W6.0 — the TRACKER 5.1 presentation intents
  // (`expandPresentation` / `collapsePresentation` /
  // `closePresentation`) were removed. They had no call sites, and
  // each wrote a `mode` into the process-global presentation store —
  // a write that every mounted activity React root performed at once,
  // which is what made the chrome fight itself. Presentation is now
  // derived from the host activity; the one intent that is genuinely
  // a user action, PiP, lives on `usePresentation()` as
  // `setPipActive`.
}

/**
 * Bind the `VideoController` singleton to a React view.
 *
 * Mount once — in `VideoPlayer` (V19 chrome compositor) or
 * at the App shell. The controller outlives any single screen
 * (always-mount per audit §4.D), so the singleton persists across
 * navigations; unmounting only unsubscribes the view.
 */
export function useVideoController(): UseVideoControllerApi {
  // NOTE: this file lives in `src/infrastructure/player/`, which is
  // the ONE directory allowed to import the lib directly (audit
  // §5 Rule 1). It is not chrome, so it is not an isolation
  // violation.
  //
  // `usePlayer()` is read HERE, at the top level of the component —
  // the only place a hook is legal. It used to be read inside a
  // `useMemo` factory, which is what blanked the player; see
  // `buildDeps` above.
  const {commands} = usePlayer();

  // Rebuilt only when the lib's `commands` identity changes. The
  // singleton is re-pointed at the result on every render (below), so
  // a fresh object here is always safe — the memo just avoids
  // rebuilding the wrappers when nothing upstream moved.
  const deps = useMemo(() => buildDeps(commands), [commands]);

  // Create the singleton once, then keep its bridge pointed at the
  // latest commands. Recreating it would drop every subscriber and
  // reset the loaded item mid-session, so only the deps are swapped.
  let controller = getVideoController();
  if (controller === null) {
    controller = new VideoController(deps);
    setVideoController(controller);
  } else {
    controller.attachDeps(deps);
  }

  const state = useSyncExternalStore(
    controller.subscribeState,
    controller.getState,
    controller.getState,
  );

  const subscribe = useCallback(
    (l: (e: VideoControllerEvent) => void) => controller.subscribe(l),
    [controller],
  );

  return {
    state,
    controller,
    subscribe,

    loadFile: controller.loadFile,
    retry: controller.retry,
    close: controller.close,

    play: controller.play,
    pause: controller.pause,
    seek: controller.seek,
    setRepeatMode: controller.setRepeatMode,

    handleEof: controller.handleEof,

    reportError: controller.reportError,
    requestRecovery: controller.requestRecovery,

    observePlayback: controller.observePlayback,

    // W6.0 — `expandPresentation` / `collapsePresentation` /
    // `closePresentation` are GONE. They had no call sites anywhere
    // in the app, and all three wrote a `mode` into the
    // process-global presentation store. That store is now derived
    // from `useIsPlayerActivity()` plus the PiP flow flag, so there
    // is no `mode` to write: a chrome that is showing because this
    // activity hosts a player surface is expanded, and one in
    // `MainActivity` is mini, by derivation rather than by a command.
    // The PiP intent that IS still a real user action is exposed as
    // `setPipActive` on `usePresentation()`, and the full enter/exit
    // transition (native window + chrome suppression) is owned by
    // `VideoPlayerRef.enterPip` / `.exitPip`.
  };
}
