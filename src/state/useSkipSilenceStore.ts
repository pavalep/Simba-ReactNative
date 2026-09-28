/**
 * V19 W3.6.5 — `useSkipSilenceStore`.
 *
 * MMKV-backed Zustand store for the "Skip silence" podcast UX
 * (Puneet Patwari's "never skip automatically without consent"
 * rule — default OFF).
 *
 * Behavior when ON:
 *   - `commands.setAudioFilter('scaletempo2=max-speed=32.0', true)`
 *     injects mpv's `scaletempo2` audio filter with `max-speed=32.0`.
 *     This is mpv's recommended silence-skip pipeline (chains a
 *     resampler + a silence detector and a tempo stretcher; the
 *     `max-speed=32` cap prevents excessive playback-rate jumps
 *     during non-silent speech).
 *   - When toggled back to OFF: `commands.setAudioFilter(filter, false)`
 *     removes the named filter via `--af-remove`.
 *
 * Why a named filter string and not a property flag:
 *   mpv has no top-level boolean for silence-skipping; the only
 *   documented route is the `af-add` audio-filter pipeline. The
 *   filter name `scaletempo2=max-speed=32.0` is the canonical
 *   mpv recipe (documented in mpv's input.conf and on the Wiki
 *   "Podcast" page).
 *
 * Why this is shipped after lib 1.6.0:
 *   The lib's `commands.setAudioFilter(filter, enabled)` method is
 *   a pre-existing bridge implementation that was promoted to the
 *   public `PlayerCommands` surface in 1.6.0. No native changes
 *   were needed for W3.6.5 — just the chrome-side wiring.
 *
 * Persistence: MMKV via `sharedMMKVStorage`, key
 * `player.skipSilence`.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md`
 * Phase 3.6.5 + `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.10.
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

/** The canonical mpv silence-skip filter (see header comment). */
export const SKIP_SILENCE_FILTER = 'scaletempo2=max-speed=32.0';

export interface SkipSilenceActions {
  /** Enable / disable skip-silence. The hook fires the lib
   *  `setAudioFilter` call so the chrome shouldn't call the lib
   *  directly when toggling. */
  setEnabled: (enabled: boolean) => void;
  reset: () => void;
}

interface SkipSilenceState {
  enabled: boolean;
}

export type SkipSilenceStore = SkipSilenceState & SkipSilenceActions;

const DEFAULT_SKIP_SILENCE = false;

/**
 * Pure helper — given the desired enabled state, return the
 * `setAudioFilter` call args. Lets tests assert the wire without
 * depending on `useEffect` ordering.
 */
export function skipSilenceFilterArgs(enabled: boolean): {
  filter: string;
  enabled: boolean;
} {
  return {filter: SKIP_SILENCE_FILTER, enabled};
}

export const useSkipSilenceStore = create<SkipSilenceStore>()(
  persist(
    (set, get) => ({
      enabled: DEFAULT_SKIP_SILENCE,
      setEnabled: (enabled: boolean) => {
        if (enabled === get().enabled) return;
        set({enabled});
      },
      reset: () => set({enabled: DEFAULT_SKIP_SILENCE}),
    }),
    {
      name: 'player.skipSilence',
      storage: createJSONStorage(() => sharedMMKVStorage),
      version: CURRENT_PERSIST_VERSION,
    },
  ),
);
