/**
 * V19 W3.6.12 — `useAutoPlayNextStore`.
 *
 * MMKV-backed Zustand store for the "Auto-play next" toggle.
 *
 * Behavior:
 *   - When `enabled === true`, the NextUpOverlay (Phase 3.6.7)
 *     auto-fires `commands.next()` at the end of its countdown.
 *   - When `enabled === false` (default), the NextUpOverlay
 *     ALWAYS requires an explicit user gesture (Cancel stays on
 *     the finished item, Play now calls `commands.next()` once).
 *
 * Default OFF (Puneet Patwari rule — "never auto-action without
 * consent" — applied to NextUp the same way it was applied to
 * SkipSilence in W3.6.5).
 *
 * Persistence: MMKV via `sharedMMKVStorage`, key
 * `player.autoPlayNext`. App's preferred persistence layer (the
 * SPEC said AsyncStorage; consistency with the rest of the chrome
 * is MMKV).
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.6.12 +
 *   `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.W3.6.12.
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

export interface AutoPlayNextActions {
  /** Toggle the auto-play-next preference. */
  setEnabled: (enabled: boolean) => void;
  reset: () => void;
}

interface AutoPlayNextState {
  enabled: boolean;
}

export type AutoPlayNextStore = AutoPlayNextState & AutoPlayNextActions;

const DEFAULT_AUTO_PLAY_NEXT = false;

export const useAutoPlayNextStore = create<AutoPlayNextStore>()(
  persist(
    (set, get) => ({
      enabled: DEFAULT_AUTO_PLAY_NEXT,
      setEnabled: (enabled: boolean) => {
        // Idempotent — guard against re-firing the same value so
        // the NextUpOverlay's auto-fire effect (Phase 3.6.7) only
        // re-runs when the value actually changes.
        if (enabled === get().enabled) return;
        set({enabled});
      },
      reset: () => set({enabled: DEFAULT_AUTO_PLAY_NEXT}),
    }),
    {
      name: 'player.autoPlayNext',
      storage: createJSONStorage(() => sharedMMKVStorage),
      version: CURRENT_PERSIST_VERSION,
    },
  ),
);
