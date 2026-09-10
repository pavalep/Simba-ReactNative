/**
 * V21 W7 P26 — `secondsToMs` unit tests.
 *
 * `secondsToMs` is the single conversion point between the app's
 * stores (bookmarks, history — both persist positions in **seconds**)
 * and the player module's bridge (`OpenPlayerOptions.startPositionMs`
 * — **milliseconds**). The two units differ by 1000x; a naive
 * `startPositionMs: position` call would seek to ~60ms when the
 * user expected ~60s.
 *
 * These tests are pure unit tests (no React, no module mocks) —
 * the helper is a top-level function in
 * `src/infrastructure/player/position.ts`.
 */

import {secondsToMs} from '../../../src/infrastructure/player/position';

describe('secondsToMs (V21 W7 P26)', () => {
  it('converts positive seconds to milliseconds (whole seconds)', () => {
    expect(secondsToMs(1)).toBe(1000);
    expect(secondsToMs(60)).toBe(60_000);
    expect(secondsToMs(3600)).toBe(3_600_000);
  });

  it('converts fractional seconds (rounded to nearest ms)', () => {
    expect(secondsToMs(0.5)).toBe(500);
    expect(secondsToMs(1.5)).toBe(1500);
    expect(secondsToMs(123.456)).toBe(123_456);
    // .0004 rounds to 0 → 60.0004 → 60_000 (Math.round of 60_000.4)
    expect(secondsToMs(60.0004)).toBe(60_000);
    // .0006 rounds to 1 → 60.0006 → 60_001
    expect(secondsToMs(60.0006)).toBe(60_001);
  });

  it('returns undefined for 0 (start from the beginning)', () => {
    expect(secondsToMs(0)).toBeUndefined();
  });

  it('returns undefined for negative values', () => {
    expect(secondsToMs(-1)).toBeUndefined();
    expect(secondsToMs(-0.0001)).toBeUndefined();
    expect(secondsToMs(-1_000_000)).toBeUndefined();
  });

  it('returns undefined for non-finite values', () => {
    expect(secondsToMs(Number.NaN)).toBeUndefined();
    expect(secondsToMs(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(secondsToMs(Number.NEGATIVE_INFINITY)).toBeUndefined();
  });

  it('handles bookmark-typical positions', () => {
    // 5:00 (300s) — typical podcast mid-roll bookmark
    expect(secondsToMs(300)).toBe(300_000);
    // 1:23:45 (5025s) — typical audiobook bookmark
    expect(secondsToMs(5025)).toBe(5_025_000);
    // 0.5s — "you just tapped play" position
    expect(secondsToMs(0.5)).toBe(500);
  });
});
