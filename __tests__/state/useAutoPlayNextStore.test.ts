/**
 * V19 W3.6.12 — `useAutoPlayNextStore` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.6.12.
 *
 * Covers:
 *   - default `enabled` is `false` (Puneet Patwari rule)
 *   - `setEnabled(true)` arms + `setEnabled(false)` disarms
 *   - `setEnabled` is idempotent
 *   - `reset()` restores the default
 */

import {useAutoPlayNextStore} from '../../src/state/useAutoPlayNextStore';

describe('useAutoPlayNextStore', () => {
  beforeEach(() => {
    useAutoPlayNextStore.getState().reset();
  });

  it('defaults to disabled (off) on first read', () => {
    expect(useAutoPlayNextStore.getState().enabled).toBe(false);
  });

  it('setEnabled(true) arms auto-play-next', () => {
    useAutoPlayNextStore.getState().setEnabled(true);
    expect(useAutoPlayNextStore.getState().enabled).toBe(true);
  });

  it('setEnabled(false) disarms after arming', () => {
    useAutoPlayNextStore.getState().setEnabled(true);
    expect(useAutoPlayNextStore.getState().enabled).toBe(true);
    useAutoPlayNextStore.getState().setEnabled(false);
    expect(useAutoPlayNextStore.getState().enabled).toBe(false);
  });

  it('setEnabled is idempotent (no-op when value unchanged)', () => {
    useAutoPlayNextStore.getState().setEnabled(false); // already false
    expect(useAutoPlayNextStore.getState().enabled).toBe(false);
  });

  it('reset() restores the default (OFF)', () => {
    useAutoPlayNextStore.getState().setEnabled(true);
    useAutoPlayNextStore.getState().reset();
    expect(useAutoPlayNextStore.getState().enabled).toBe(false);
  });
});
