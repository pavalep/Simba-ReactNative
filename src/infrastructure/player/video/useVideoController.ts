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
 *   3. Exposes the presentation intents (`expandPresentation` /
 *      `collapsePresentation` / `closePresentation`) that route
 *      into `usePresentationStore` (TRACKER 5.1 surface).
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
import {usePresentationStore} from '../../../state/usePresentationStore';
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
 * Build the controller's injected bridge. Named `use*` because it
 * calls `usePlayer()` — `react-hooks/rules-of-hooks` requires
 * hook-shaped names for functions that read hooks.
 */
function useBuildDeps(): ConstructorParameters<typeof VideoController>[0] {
  // NOTE: this file lives in `src/infrastructure/player/`, which is
  // the ONE directory allowed to import the lib directly (audit
  // §5 Rule 1). It is not chrome, so it is not an isolation
  // violation.
  const {commands} = usePlayer();

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

  // ── Presentation intents (TRACKER 5.1) ──
  expandPresentation: () => void;
  collapsePresentation: () => void;
  closePresentation: () => void;
}

/**
 * Bind the `VideoController` singleton to a React view.
 *
 * Mount once — in `SimbaPlayerContent` (V19 chrome compositor) or
 * at the App shell. The controller outlives any single screen
 * (always-mount per audit §4.D), so the singleton persists across
 * navigations; unmounting only unsubscribes the view.
 */
export function useVideoController(): UseVideoControllerApi {
  // `usePlayer()` is a hook, so the deps must be built during
  // render. We build them every render but only inject them ONCE
  // into the singleton (the controller reads them lazily through
  // the closures, so re-injection is unnecessary after the first).
  const deps = useMemo(useBuildDeps, []);

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

  const setMode = usePresentationStore((s) => s.setMode);

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

    // Presentation intents route into the presentation store, NOT
    // into navigation. Per the always-mount rule, expanding /
    // collapsing is a chrome presentation change, not a screen
    // push — `NowPlayingScreen` is a thin viewer that only reads
    // the mode.
    expandPresentation: () => setMode('expanded'),
    collapsePresentation: () => setMode('mini'),
    closePresentation: () => setMode('mini'),
  };
}
