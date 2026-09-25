/**
 * V19 W0 Phase 0.2 — `usePresentationStore` (FOUNDATIONAL).
 *
 * `presentation` is an app-side concept, not a lib concept. The lib's
 * `PlayerActivity` is `launchMode="singleTask"` — there's only one
 * presentation at the native level (fullscreen activity).
 * Mini/expanded/pip is a JS-side CSS visibility toggle that the
 * chrome (V19 SimbaPlayer, W4+) reads from this store.
 *
 * Persistence: MMKV (matches the app's existing persistence layer —
 * see `src/state/persistence.ts`).
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.23 + the audit doc §3.B.
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

/**
 * The presentation state — what shape the chrome takes.
 *
 * - `mini`: dock at the bottom of the foreground screen. No chrome
 *   visible above. Renders when `usePlayer().state.isPlaying === true`.
 *
 * - `expanded`: full-screen overlay with chrome. The default on cold
 *   start if a session is active; the dock becomes invisible.
 *
 * - `pip`: Picture-in-Picture. Android 12+ `setAutoEnterEnabled(true)`
 *   sets this when the app backgrounds while playing. iOS PiP is
 *   managed by AVPlayerViewController's `canStartPictureInPicture*`.
 */
export type PresentationMode = 'mini' | 'expanded' | 'pip';

export interface PresentationState {
  /** Current presentation mode. Default `'mini'`. */
  mode: PresentationMode;

  /**
   * Set the presentation mode. Called by the chrome (V19 SimbaPlayer)
   * on user actions (tap dock, tap minimize, PiP enter/exit).
   */
  setMode: (mode: PresentationMode) => void;

  /**
   * Convenience: toggle `pip` ↔ the prior mode (mini or expanded).
   * Tracks the prior mode so PiP exit returns to the right place.
   */
  togglePip: () => Promise<void>;

  /**
   * The mode to return to after PiP exits. Set automatically by
   * `setMode()` whenever the user moves out of `'pip'`. Cleared on
   * PiP exit + restore.
   */
  prePipMode: PresentationMode | null;
  _setPrePipMode: (mode: PresentationMode | null) => void;
}

const initialState: Pick<PresentationState, 'mode' | 'prePipMode'> = {
  mode: 'mini',
  prePipMode: null,
};

export const usePresentationStore = create<PresentationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setMode: (mode) => {
        const currentMode = get().mode;
        // Track pre-PiP mode so togglePip can return to it on exit.
        if (currentMode !== 'pip' && mode === 'pip') {
          set({mode, prePipMode: currentMode});
        } else if (currentMode === 'pip' && mode !== 'pip') {
          set({mode, prePipMode: null});
        } else {
          set({mode});
        }
      },

      togglePip: async () => {
        const currentMode = get().mode;
        if (currentMode === 'pip') {
          // Exit PiP -> return to pre-PiP mode.
          const target = get().prePipMode ?? 'expanded';
          set({mode: target, prePipMode: null});
        } else {
          // Enter PiP -> save current mode.
          set({mode: 'pip', prePipMode: currentMode});
        }
      },

      _setPrePipMode: (prePipMode) => set({prePipMode}),
    }),
    {
      name: 'player-presentation',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
      // Only persist `mode`. `prePipMode` is a transient runtime
      // concern — restoring a stale pre-PiP mode across app restarts
      // makes no sense.
      partialize: (state) => ({mode: state.mode}),
    },
  ),
);
