/**
 * V19 W9.3 — the resume-aware launch seam.
 *
 * ## Why this test exists
 *
 * The resume chain was fully built and had no input:
 *
 * ```
 * resolveResumeMs()   <- App.tsx resumePolicy prop     worked
 *   -> PlayerResumeProvider <- lib <SimbaPlayer>       worked
 *     -> PlayerResumeContext                           worked
 *       -> useOpenWithResume()                         worked
 *         <- ???                                       NO CALLER
 * ```
 *
 * All ~28 app call sites used the lib's `usePlayerActivity()`, which
 * forwards `startPositionMs ?? 0` and never consults the context.
 * Tap a film you had watched 40 minutes into and it opened at 0:00.
 *
 * The fix is at the seam (`useResumeAwarePlayerActivity`), so this test
 * asserts the SEAM's contract, not any individual screen's:
 *
 *   1. `openPlayer` passes `resumeId` = the media uri (the app's
 *      resume key everywhere - `resolveResumeMs` matches on
 *      `Bookmark.fileUri` / `RecentHistoryEntry.fileUri`).
 *   2. An explicit `startPositionMs` is still forwarded untouched, so
 *      the lib's `useOpenWithResume` keeps sole ownership of the
 *      "explicit position wins" precedence rule.
 *   3. `getLaunchParams` still passes through.
 *
 * These are the assertions that FAIL if the wrapper is reverted to the
 * lib hook - which is the point. A test that cannot fail is a
 * comment with a `.test.tsx` extension.
 */

import {renderHook} from '@testing-library/react-native';

const mockOpenWithResume = jest.fn(async () => true);
const mockGetLaunchParams = jest.fn(() => null);
// The LIB's `usePlayerActivity` also returns an `openPlayer`. It has to
// be modelled, or a mutation that routes back to the lib hook fails on
// `undefined is not a function` instead of on the missing resumeId -
// which would prove nothing about the contract.
const mockLibOpenPlayer = jest.fn(async () => true);

// Mock the REAL module path so the seam resolves the same symbols the
// app does at runtime. `usePlayerActivity` here is the LIB's
// pass-through hook - if the seam ever calls this one instead of
// `useOpenWithResume`, assertion 1 fails.
jest.mock('@simba-dev/react-native-media-player', () => ({
  useOpenWithResume: () => mockOpenWithResume,
  usePlayerActivity: () => ({
    openPlayer: mockLibOpenPlayer,
    getLaunchParams: mockGetLaunchParams,
  }),
}));

import {usePlayerActivity} from '../../../src/infrastructure/player/useResumeAwarePlayerActivity';

const OPTS = {
  uri: 'file:///movies/namus-kanla-yazilir.mkv',
  title: 'Namus Kanla Yazilir',
  type: 'video' as const,
};

describe('usePlayerActivity — resume-aware launch seam', () => {
  beforeEach(() => {
    mockOpenWithResume.mockClear();
    mockLibOpenPlayer.mockClear();
    mockGetLaunchParams.mockClear();
  });

  it('passes the media uri as resumeId so the policy can resolve a position', async () => {
    const {result} = await renderHook(() => usePlayerActivity());

    await result.current.openPlayer(OPTS);

    expect(mockOpenWithResume).toHaveBeenCalledTimes(1);
    expect(mockOpenWithResume).toHaveBeenCalledWith({
      ...OPTS,
      resumeId: 'file:///movies/namus-kanla-yazilir.mkv',
    });
  });

  it('forwards an explicit startPositionMs untouched', async () => {
    // Precedence between an explicit position and a saved one belongs
    // to the lib's useOpenWithResume. Re-deciding it here would create
    // two sources of truth for one rule - which is how the earlier
    // 1000x-seek bug happened. So the seam must forward, not judge.
    const {result} = await renderHook(() => usePlayerActivity());

    await result.current.openPlayer({...OPTS, startPositionMs: 78_000});

    expect(mockOpenWithResume).toHaveBeenCalledWith({
      ...OPTS,
      startPositionMs: 78_000,
      resumeId: OPTS.uri,
    });
  });

  it('keeps getLaunchParams working', async () => {
    // The seam replaces one method of the result; the other must be
    // untouched or deep-link cold start breaks.
    const {result} = await renderHook(() => usePlayerActivity());

    expect(result.current.getLaunchParams()).toBeNull();
    expect(mockGetLaunchParams).toHaveBeenCalledTimes(1);
  });

  it('returns a stable result object across re-renders', async () => {
    // Consumers put `openPlayer` in useCallback/useMemo dependency
    // arrays. A new object every render would re-run those effects on
    // every player state tick - the exact render-cascade class the W9
    // performance work removed.
    const {result, rerender} = await renderHook(() => usePlayerActivity());
    const first = result.current;

    await rerender({});

    expect(result.current).toBe(first);
    expect(result.current.openPlayer).toBe(first.openPlayer);
  });
});