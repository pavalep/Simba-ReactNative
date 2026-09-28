/**
 * V19 W3.5.6 — `useSleepTimerStore` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.5.6 +
 * `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.10.
 *
 * Covers:
 *   - default `minutes` is `0` (timer off)
 *   - `setMinutes(N>0)` arms the timer
 *   - `setMinutes(0)` or `setMinutes(-1)` disarms the timer (clamps to 0)
 *   - `reset()` restores the default
 *   - `SLEEP_TIMER_OPTIONS` has the expected 7 entries (Off + 6 durations)
 */

import {
  SLEEP_TIMER_OPTIONS,
  useSleepTimerStore,
} from '../../src/state/useSleepTimerStore';

describe('useSleepTimerStore', () => {
  beforeEach(() => {
    useSleepTimerStore.getState().reset();
  });

  it('defaults to 0 minutes (timer off) on first read', () => {
    expect(useSleepTimerStore.getState().minutes).toBe(0);
  });

  it('setMinutes(5) arms the timer at 5 minutes', () => {
    useSleepTimerStore.getState().setMinutes(5);
    expect(useSleepTimerStore.getState().minutes).toBe(5);
  });

  it('setMinutes(60) arms the timer at 60 minutes', () => {
    useSleepTimerStore.getState().setMinutes(60);
    expect(useSleepTimerStore.getState().minutes).toBe(60);
  });

  it('setMinutes(0) explicitly disarms', () => {
    useSleepTimerStore.getState().setMinutes(30);
    expect(useSleepTimerStore.getState().minutes).toBe(30);
    useSleepTimerStore.getState().setMinutes(0);
    expect(useSleepTimerStore.getState().minutes).toBe(0);
  });

  it('setMinutes(-1) clamps to 0 (defensive against bad input)', () => {
    useSleepTimerStore.getState().setMinutes(-1);
    expect(useSleepTimerStore.getState().minutes).toBe(0);
  });

  it('reset() restores 0', () => {
    useSleepTimerStore.getState().setMinutes(45);
    useSleepTimerStore.getState().reset();
    expect(useSleepTimerStore.getState().minutes).toBe(0);
  });
});

describe('SLEEP_TIMER_OPTIONS metadata', () => {
  it('has exactly 7 options (Off + 6 durations)', () => {
    expect(SLEEP_TIMER_OPTIONS).toHaveLength(7);
  });

  it('first option is Off (value 0)', () => {
    const off = SLEEP_TIMER_OPTIONS[0];
    expect(off.value).toBe(0);
    expect(off.label.toLowerCase()).toBe('off');
  });

  it('contains 5 / 10 / 15 / 30 / 45 / 60 minute options', () => {
    const values = new Set(SLEEP_TIMER_OPTIONS.map(o => o.value));
    expect(values.has(5)).toBe(true);
    expect(values.has(10)).toBe(true);
    expect(values.has(15)).toBe(true);
    expect(values.has(30)).toBe(true);
    expect(values.has(45)).toBe(true);
    expect(values.has(60)).toBe(true);
  });

  it('every option has a non-empty label', () => {
    for (const opt of SLEEP_TIMER_OPTIONS) {
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });
});
