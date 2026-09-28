/**
 * V19 W3.6.11 — `useSkipPrevThresholdStore`.
 *
 * MMKV-backed Zustand store for the user's "Skip-Previous smart
 * threshold" (Apple Music / Spotify pattern).
 *
 * Semantics:
 *   - When the user taps `commands.skipPrev()`:
 *     - If `positionMs > thresholdMs` → `commands.seek(0)`
 *       (restart the current item)
 *     - Else → `commands.previous()` (skip to the previous item)
 *
 * Default: 3000 ms — matches Apple Music, Spotify, Plex.
 *
 * Why the threshold is configurable:
 *   - Long audiobooks / podcasts: users sometimes want a 30s
 *     threshold (restart a sentence they didn't catch).
 *   - Short music videos: 1s is plenty.
 *   - The default is industry-standard; power users reach here
 *     via the More sheet's Playback group.
 *
 * Persistence: MMKV via `sharedMMKVStorage`, key
 * `player.skipPrevThresholdMs`.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3.W3.6.11 + TRACKER Phase 3.6.11.
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

export const DEFAULT_SKIP_PREV_THRESHOLD_MS = 3000;

export interface SkipPrevThresholdActions {
  setThreshold: (ms: number) => void;
  reset: () => void;
}

interface SkipPrevThresholdState {
  thresholdMs: number;
}

export type SkipPrevThresholdStore = SkipPrevThresholdState &
  SkipPrevThresholdActions;

export const useSkipPrevThresholdStore = create<SkipPrevThresholdStore>()(
  persist(
    set => ({
      thresholdMs: DEFAULT_SKIP_PREV_THRESHOLD_MS,
      setThreshold: (ms: number) => {
        // Clamp into a defensive range so a bad value can't lock
        // the user into an unusable previous-button. 0 disables
        // the threshold (always restarts). 60000ms = 60s is a
        // generous upper bound for audiobook skip behavior.
        const safe = Math.max(0, Math.min(60_000, Math.floor(ms)));
        set({thresholdMs: safe});
      },
      reset: () => set({thresholdMs: DEFAULT_SKIP_PREV_THRESHOLD_MS}),
    }),
    {
      name: 'player.skipPrevThresholdMs',
      storage: createJSONStorage(() => sharedMMKVStorage),
      version: CURRENT_PERSIST_VERSION,
    },
  ),
);

/**
 * Convenience helper for `commands.skipPrev()` consumers. Returns
 * the threshold value WITHOUT subscribing React-rerender — the
 * threshold is read once per `skipPrev()` call. Use a separate
 * selector in the More sheet UI to react to threshold changes.
 */
export function getSkipPrevThresholdMs(): number {
  return useSkipPrevThresholdStore.getState().thresholdMs;
}
