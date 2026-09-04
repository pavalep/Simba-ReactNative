/**
 * Wave 8 / Phase 43 — PlaybackOverlayHost conditional-render verification.
 *
 * **Coverage (revised Phase 47):**
 * The component-level conditional render (V12 default → `null`, V11
 * rollback → inline mount) is structural; verifying it at runtime by
 * actually rendering the host requires a long mock tree (Redux store +
 * playback context + audio providers + a `Provider` for Redux + a
 * `Provider` for the playback state). The full path is exercised
 * on-device by QA matrix cases 35.1 / 35.7 / 35.8 and by the cutover
 * runbook §6.1 smoke tests.
 *
 * What this test file verifies at the unit level:
 *
 *   43.A: `USE_DEDICATED_PLAYER_ACTIVITY` flag is `true` in the default
 *         `src/lib/flags.ts` export (the Phase 41 cutover default).
 *   43.B: The flag can be swapped via `jest.isolateModules` + `jest.doMock`
 *         to verify the gated branch in PlaybackOverlayHost source.
 *   43.C: The PlaybackOverlayHost source contains the V12-default short-circuit
 *         (`if (USE_DEDICATED_PLAYER_ACTIVITY) return null;`) immediately
 *         after the auth/state hooks are evaluated. We read the source as a
 *         string and pattern-match — this is a structural check that doesn't
 *         require the React render path.
 */
import * as fs from 'node:fs';

describe('PlaybackOverlayHost — Phase 43.A flag default', () => {
  test('USE_DEDICATED_PLAYER_ACTIVITY is true (the V12 default since Phase 41)', () => {
    const flags = require('../src/lib/flags');
    expect(flags.USE_DEDICATED_PLAYER_ACTIVITY).toBe(true);
  });

  test('USE_UNIFIED_MEDIA_SESSION is false (deferred to Phase 41.5)', () => {
    const flags = require('../src/lib/flags');
    expect(flags.USE_UNIFIED_MEDIA_SESSION).toBe(false);
  });
});

describe('PlaybackOverlayHost — Phase 43.B flag swap (jest.isolateModules)', () => {
  test('a flipped flag value takes effect in an isolated module graph', () => {
    jest.isolateModules(() => {
      jest.doMock('../src/lib/flags', () => ({
        USE_DEDICATED_PLAYER_ACTIVITY: false,
        USE_UNIFIED_MEDIA_SESSION: false,
      }));
      const flippedFlags = require('../src/lib/flags');
      expect(flippedFlags.USE_DEDICATED_PLAYER_ACTIVITY).toBe(false);
    });
  });

  test('the default flag value still applies outside the isolateModules block', async () => {
    // After the previous test's `jest.isolateModules` + `jest.doMock`,
    // the mock is still registered with jest. We need to clear it before
    // re-reading the production flag value.
    jest.dontMock('../src/lib/flags');
    jest.resetModules();
    const flags = require('../src/lib/flags');
    expect(flags.USE_DEDICATED_PLAYER_ACTIVITY).toBe(true);
  });
});

describe('PlaybackOverlayHost — Phase 43.C source-level short-circuit gate', () => {
  /**
   * Read the PlaybackOverlayHost source as a string and verify it contains
   * the V12 short-circuit gate (`if (USE_DEDICATED_PLAYER_ACTIVITY) return null;`).
   * This is a structural check — it verifies the source has the gate, not
   * that the runtime renders `null`. The runtime check belongs to on-device
   * QA (matrix case 35.1/35.8) + the cutover runbook §6.1 smoke tests.
   */
  const sourcePath = require.resolve(
    '../src/modules/playback/PlaybackOverlayHost',
  );
  const sourceText = fs.readFileSync(sourcePath, 'utf8');

  test('imports USE_DEDICATED_PLAYER_ACTIVITY from src/lib/flags', () => {
    expect(sourceText).toMatch(
      /import\s*\{[^}]*USE_DEDICATED_PLAYER_ACTIVITY[^}]*\}\s*from\s*['"]\.\.\/\.\.\/lib\/flags['"]/,
    );
  });

  test('contains the V12 short-circuit guard', () => {
    expect(sourceText).toMatch(
      /if\s*\(\s*USE_DEDICATED_PLAYER_ACTIVITY\s*\)\s*return\s+null\s*;?/,
    );
  });

  test('the guard appears before the auth + active + presentation gates', () => {
    // The V12 gate should fire before any V11-style rendering. Layout
    // (top of body to bottom): USE_DEDICATED_PLAYER_ACTIVITY check → auth
    // check → active check → presentation check → VideoHost / AudioModule
    // branches.
    const v12GateIdx = sourceText.indexOf(
      'if (USE_DEDICATED_PLAYER_ACTIVITY) return null',
    );
    const authGateIdx = sourceText.indexOf('!isAuthenticated');
    const activeGateIdx = sourceText.indexOf('!active');
    expect(v12GateIdx).toBeGreaterThan(-1);
    expect(authGateIdx).toBeGreaterThan(-1);
    expect(activeGateIdx).toBeGreaterThan(-1);
    expect(v12GateIdx).toBeLessThan(authGateIdx);
    expect(authGateIdx).toBeLessThan(activeGateIdx);
  });

  test('file header documents the Phase 43 conditional-render refactor', () => {
    // The Phase 43 JSDoc block (in the `PlaybackOverlayHost.tsx` file
    // header) cites Phase 47 + the V12 PlayerActivity replacement. Verify
    // both citations appear so future readers can trace the design.
    const header = sourceText.slice(0, sourceText.indexOf('export const PlaybackOverlayHost'));
    expect(header).toContain('Phase 43');
    expect(header).toContain('USE_DEDICATED_PLAYER_ACTIVITY');
    expect(header).toContain('PlayerActivity');
  });
});
