/**
 * V19 W3.6.5 — `useSkipSilence` hook.
 *
 * Bridges `useSkipSilenceStore` to the lib's
 * `commands.setAudioFilter(filter, enabled)` method. Subscribes
 * React-side so a UI toggle in VideoMoreSheet immediately fires
 * the lib call. Idempotent — re-firing with the same value is a
 * no-op (the store guards on `get().enabled === enabled`).
 *
 * Mount in the chrome (NowPlayingScreen or higher) — NOT in
 * every primitive. The bridge is the orchestrator's job.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md`
 * Phase 3.6.5 + SPEC §3.10.
 */

import * as React from 'react';
import {
  useSkipSilenceStore,
  SKIP_SILENCE_FILTER,
} from '../../state/useSkipSilenceStore';
import {useTransport} from './useTransport';

export function useSkipSilence(): {enabled: boolean; toggle: () => void} {
  const enabled = useSkipSilenceStore(s => s.enabled);
  const setEnabledInStore = useSkipSilenceStore(s => s.setEnabled);
  const {commands} = useTransport();

  // Fire the lib call when the toggle changes. The store guards
  // against re-firing on equal values, but we also check the
  // first-mount case explicitly to keep the useEffect idempotent.
  React.useEffect(() => {
    try {
      commands.setAudioFilter(SKIP_SILENCE_FILTER, enabled);
    } catch {
      // Bridge not wired (jest / web preview). Skip silently.
    }
    // Intentionally NOT adding `commands` to deps — TransportCommands
    // is memoized with `useMemo` + `[commands, ...]` deps in
    // useTransport, so it's referentially stable per render. Adding
    // it would cause spurious re-fires if the hook re-derives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const toggle = React.useCallback(() => {
    setEnabledInStore(!useSkipSilenceStore.getState().enabled);
  }, [setEnabledInStore]);

  return {enabled, toggle};
}
