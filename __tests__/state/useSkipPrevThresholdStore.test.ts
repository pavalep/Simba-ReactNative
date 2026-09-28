/**
 * V19 W3.6.11 — `useSkipPrevThresholdStore` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.6.11.
 *
 * Covers:
 *   - default `thresholdMs` is 3000 (Apple Music / Spotify standard)
 *   - `setThreshold(N)` updates + clamps to a defensive range
 *   - `getSkipPrevThresholdMs()` returns the current value without
 *     subscribing React-rerender
 *   - `reset()` restores 3000
 */

import {
  DEFAULT_SKIP_PREV_THRESHOLD_MS,
  getSkipPrevThresholdMs,
  useSkipPrevThresholdStore,
} from '../../src/state/useSkipPrevThresholdStore';

describe('useSkipPrevThresholdStore', () => {
  beforeEach(() => {
    useSkipPrevThresholdStore.getState().reset();
  });

  it('default thresholdMs is 3000 (Apple Music / Spotify standard)', () => {
    expect(useSkipPrevThresholdStore.getState().thresholdMs).toBe(
      DEFAULT_SKIP_PREV_THRESHOLD_MS,
    );
    expect(DEFAULT_SKIP_PREV_THRESHOLD_MS).toBe(3000);
  });

  it('setThreshold(5000) updates the threshold', () => {
    useSkipPrevThresholdStore.getState().setThreshold(5000);
    expect(useSkipPrevThresholdStore.getState().thresholdMs).toBe(5000);
  });

  it('setThreshold(0) is allowed (always restarts current)', () => {
    useSkipPrevThresholdStore.getState().setThreshold(0);
    expect(useSkipPrevThresholdStore.getState().thresholdMs).toBe(0);
  });

  it('setThreshold with negative value clamps to 0 (defensive)', () => {
    useSkipPrevThresholdStore.getState().setThreshold(-500);
    expect(useSkipPrevThresholdStore.getState().thresholdMs).toBe(0);
  });

  it('setThreshold with absurdly high value clamps to 60000', () => {
    useSkipPrevThresholdStore.getState().setThreshold(999_999);
    expect(useSkipPrevThresholdStore.getState().thresholdMs).toBe(60_000);
  });

  it('setThreshold(123.7) floors to 123', () => {
    useSkipPrevThresholdStore.getState().setThreshold(123.7);
    expect(useSkipPrevThresholdStore.getState().thresholdMs).toBe(123);
  });

  it('reset() restores 3000', () => {
    useSkipPrevThresholdStore.getState().setThreshold(5000);
    useSkipPrevThresholdStore.getState().reset();
    expect(useSkipPrevThresholdStore.getState().thresholdMs).toBe(3000);
  });

  it('getSkipPrevThresholdMs() returns the current value', () => {
    useSkipPrevThresholdStore.getState().setThreshold(5000);
    expect(getSkipPrevThresholdMs()).toBe(5000);
  });
});
