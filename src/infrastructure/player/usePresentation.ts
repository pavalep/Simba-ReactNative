/**
 * V19 W0 Phase 0.2 — `usePresentation()` hook.
 *
 * Thin re-export of `usePresentationStore` so consumer code can import
 * from the facade (`src/infrastructure/player/`) per the isolation
 * contract (SPEC §2.1 Rule 1).
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.23 + the audit doc §3.B.
 */

import {
  usePresentationStore,
  type PresentationMode,
  type PresentationState,
} from '../../state/usePresentationStore';

export {usePresentationStore, type PresentationMode, type PresentationState};

/**
 * Hook alias for ergonomics in the chrome. Returns the full store
 * state + actions.
 *
 * Usage in V19 SimbaPlayer (W4+):
 *   const {mode, setMode} = usePresentation();
 *   if (mode === 'mini') return <VideoMiniPlayer />;
 */
export function usePresentation(): {
  mode: 'mini' | 'expanded' | 'pip';
  setMode: (mode: 'mini' | 'expanded' | 'pip') => void;
  togglePip: () => Promise<void>;
} {
  const mode = usePresentationStore((s) => s.mode);
  const setMode = usePresentationStore((s) => s.setMode);
  const togglePip = usePresentationStore((s) => s.togglePip);
  return {mode, setMode, togglePip};
}
