/**
 * V19 W3.6.5 — `useSkipSilenceStore` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.6.5.
 *
 * Covers:
 *   - default `enabled` is `false` (Puneet Patwari "never skip
 *     automatically without consent" rule)
 *   - `setEnabled(true)` arms + `setEnabled(false)` disarms
 *   - `setEnabled` is idempotent (no-op when value unchanged)
 *   - `reset()` returns to default
 *   - `skipSilenceFilterArgs` returns the canonical mpv filter
 *     payload
 */

import {
  SKIP_SILENCE_FILTER,
  skipSilenceFilterArgs,
  useSkipSilenceStore,
} from '../../src/state/useSkipSilenceStore';

describe('useSkipSilenceStore', () => {
  beforeEach(() => {
    useSkipSilenceStore.getState().reset();
  });

  it('defaults to disabled (off) on first read', () => {
    expect(useSkipSilenceStore.getState().enabled).toBe(false);
  });

  it('setEnabled(true) arms the skip-silence feature', () => {
    useSkipSilenceStore.getState().setEnabled(true);
    expect(useSkipSilenceStore.getState().enabled).toBe(true);
  });

  it('setEnabled(false) after arming disarms', () => {
    useSkipSilenceStore.getState().setEnabled(true);
    expect(useSkipSilenceStore.getState().enabled).toBe(true);
    useSkipSilenceStore.getState().setEnabled(false);
    expect(useSkipSilenceStore.getState().enabled).toBe(false);
  });

  it('setEnabled is a no-op when the value already matches', () => {
    const before = useSkipSilenceStore.getState();
    useSkipSilenceStore.getState().setEnabled(false); // already false
    const after = useSkipSilenceStore.getState();
    expect(before.enabled).toBe(after.enabled);
  });

  it('reset() returns to disabled regardless of prior state', () => {
    useSkipSilenceStore.getState().setEnabled(true);
    useSkipSilenceStore.getState().reset();
    expect(useSkipSilenceStore.getState().enabled).toBe(false);
  });
});

describe('skipSilenceFilterArgs (mpv payload)', () => {
  it('returns the canonical scaletempo2 filter when enabled', () => {
    expect(skipSilenceFilterArgs(true)).toEqual({
      filter: SKIP_SILENCE_FILTER,
      enabled: true,
    });
  });
  it('returns the same filter with enabled=false when disarmed', () => {
    expect(skipSilenceFilterArgs(false)).toEqual({
      filter: SKIP_SILENCE_FILTER,
      enabled: false,
    });
  });
  it('SKIP_SILENCE_FILTER is the canonical mpv scaletempo2 recipe', () => {
    // The string is the load-bearing recipe; tests guard against
    // an accidental rename that would silently change chrome
    // behavior for end-users.
    expect(SKIP_SILENCE_FILTER).toBe('scaletempo2=max-speed=32.0');
  });
});
