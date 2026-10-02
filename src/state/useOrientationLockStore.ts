/**
 * V19 W6.4 — `useOrientationLockStore`.
 *
 * MMKV-backed Zustand store for the player header's orientation lock
 * (the YouTube / Apple TV / Plex pattern: pin the video to its current
 * orientation so rotating the device cannot re-lay-out the frame
 * mid-scene).
 *
 * ## What "locked" means, and why it is a boolean and not a mode
 *
 * The platform primitive is `Activity.requestedOrientation`, and the
 * lib already exposes it as `commands.setOrientation(mode)` with
 * `'portrait' | 'landscape' | 'sensor'` (`MpvBridgeModule.setOrientation`
 * maps each to the matching `SCREEN_ORIENTATION_*` constant).
 *
 * A lock therefore has exactly two honest outcomes:
 *
 *   - **locked**   → pin to whatever orientation the video is in RIGHT
 *                    NOW (portrait stays portrait, landscape stays
 *                    landscape). YouTube, Apple TV and Plex all pin to
 *                    current rather than forcing a side.
 *   - **unlocked** → `setOrientation('sensor')`, i.e. free to rotate.
 *
 * Storing the resolved *side* instead of a boolean would be tempting and
 * is wrong: the side can change underneath the store (the user rotates
 * while unlocked), and a persisted `'landscape'` would silently pin a
 * freshly-opened portrait video. The boolean is the user's intent; the
 * side is derived at the moment the lock is applied, from the live
 * layout. One source of truth, no stale orientation.
 *
 * ## Why this is persisted
 *
 * The lock is a viewing preference, not a transient state: a user who
 * pins orientation because they are reading burned-in subtitles on a
 * tablet wants that every time they open a video, not just for the
 * session in which they set it.
 *
 * Contrast `usePresentationStore`, which is deliberately NOT persisted —
 * but for the opposite reason. PiP is a *window* state that Android
 * destroys with the activity, so persisting it strands the app (see that
 * file's header). Orientation is neither window state nor derived from
 * anything the process can outlive, so it persists.
 *
 * Persistence: MMKV via `sharedMMKVStorage`, key `player.orientationLock`.
 *
 * ## The store is intent, not proof
 *
 * `setOrientation` is fire-and-forget — it returns nothing, so there is
 * no way to observe whether the platform honoured the request. This
 * store therefore records what the user asked for, and the header
 * re-applies it on mount. That is sound here because of a structural
 * guarantee, not luck: the header only mounts inside `ExpandedChrome`,
 * whose mount gate is `presentation.isExpanded === isPlayerActivity`.
 * So by the time anything reads this store, `getCurrentActivity()` is
 * the `PlayerActivity` and the request cannot be dropped for want of an
 * activity. If a future caller needs the lock outside that gate, it
 * must re-apply on its own mount rather than assume this one did.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3.2 (top bar) + TRACKER Phase 6.4.
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

export interface OrientationLockActions {
  /** Record the user's intent. Does NOT touch the platform — the
   *  caller is responsible for calling `commands.setOrientation`. */
  setLocked: (locked: boolean) => void;
  /** Flip the lock and return the NEW value, so a non-React caller can
   *  apply the matching orientation without a second subscription. */
  toggleLocked: () => boolean;
  reset: () => void;
}

interface OrientationLockState {
  /** `true` = pin to the current orientation. `false` = free to rotate. */
  locked: boolean;
}

export type OrientationLockStore = OrientationLockState & OrientationLockActions;

export const useOrientationLockStore = create<OrientationLockStore>()(
  persist(
    (set, get) => ({
      locked: false,
      setLocked: (locked: boolean) => set({locked}),
      toggleLocked: () => {
        const next = !get().locked;
        set({locked: next});
        return next;
      },
      reset: () => set({locked: false}),
    }),
    {
      name: 'player.orientationLock',
      storage: createJSONStorage(() => sharedMMKVStorage),
      version: CURRENT_PERSIST_VERSION,
    },
  ),
);

/**
 * Non-reactive read for imperative callers (the header's tap handler),
 * matching `getSkipPrevThresholdMs()` in `useSkipPrevThresholdStore`.
 * A component that needs to RENDER the lock state must use the hook so
 * it re-renders on change.
 */
export function getOrientationLocked(): boolean {
  return useOrientationLockStore.getState().locked;
}
