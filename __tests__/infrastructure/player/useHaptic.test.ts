/**
 * V19 W3.6.13 — `useHaptic` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.6.13.
 *
 * Coverage:
 *   - HAPTIC_DURATION_MS export maps each intensity to its ms
 *   - Pure helper stability guards
 *
 * (The actual RN `Vibration.vibrate` call is a side-effect that
 * doesn't need to be re-tested here — RN's `Vibration` is itself
 * verified upstream. The hook is a thin wrapper.)
 */

import {HAPTIC_DURATION_MS} from '../../../src/infrastructure/player/useHaptic';

describe('useHaptic — pure helper', () => {
  describe('HAPTIC_DURATION_MS', () => {
    it('light → 10 ms (sub-25 ms threshold for iOS UIImpactStyleLight parity)', () => {
      expect(HAPTIC_DURATION_MS.light).toBe(10);
    });
    it('medium → 25 ms (Apple UIImpactStyleLight range)', () => {
      expect(HAPTIC_DURATION_MS.medium).toBe(25);
    });
    it('heavy → 35 ms (Apple UIImpactStyleMedium range)', () => {
      expect(HAPTIC_DURATION_MS.heavy).toBe(35);
    });
    it('three intensities exactly', () => {
      expect(Object.keys(HAPTIC_DURATION_MS).sort()).toEqual([
        'heavy',
        'light',
        'medium',
      ]);
    });
  });
});
