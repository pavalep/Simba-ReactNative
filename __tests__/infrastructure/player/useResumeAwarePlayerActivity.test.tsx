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

// Typed with its parameter so the assertions below can read the options
// the seam actually sent. A zero-arg `jest.fn` types `calls[0]` as an
// empty tuple, which makes every `calls[0][0]` a compile error and
// tempts an author to assert on something weaker instead.
const mockOpenWithResume = jest.fn(
  async (_opts: Record<string, unknown>): Promise<boolean> => true,
);
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
import {useBookmarksStore} from '../../../src/state/bookmarksStore';
import {useRecentHistoryStore} from '../../../src/state/recentHistoryStore';

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

  it('passes the media uri as resumeId AND an explicit position', async () => {
    // W9.5: the seam now ALWAYS sends `startPositionMs`, including an
    // explicit 0. That is deliberate and load-bearing: the lib gates
    // its own resume policy on `providedStartMs == null`
    // (`useOpenWithResume.tsx:128`), so a launch with the field absent
    // would be re-decided by a second rule. One authority, one launch.
    const {result} = await renderHook(() => usePlayerActivity());

    await result.current.openPlayer(OPTS);

    expect(mockOpenWithResume).toHaveBeenCalledTimes(1);
    expect(mockOpenWithResume).toHaveBeenCalledWith({
      ...OPTS,
      startPositionMs: 0,
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

  // ── W9.5 — the Continue / Start-over prompt ─────────────────────
  //
  // Plex's documented shape: "if you had started a title, a dialog
  // offers Resume or From the beginning". These pin the four states
  // that decide it, because the bug this replaces was a screen passing
  // its own `startPositionMs` — i.e. the seam being bypassed silently.

  describe('resume prompt', () => {
    beforeEach(() => {
      useBookmarksStore.getState().reset();
      useRecentHistoryStore.getState().reset();
    });

    it('offers the saved position and uses it when the user continues', async () => {
      useBookmarksStore.getState().addBookmark({
        bookmark: {
          fileUri: OPTS.uri,
          title: 'Namus Kanla Yazilir',
          position: 17,
          duration: 3991,
          createdAt: '2026-10-07T00:00:00.000Z',
          label: '',
          mediaType: 'video',
          type: 'movie',
          source: 'api',
        },
      });
      const promptResume = jest.fn(async (_c: {positionMs: number; source: string; title: string}) => 'resume' as const);
      const {result} = await renderHook(() =>
        usePlayerActivity({promptResume}),
      );

      await result.current.openPlayer(OPTS);

      expect(promptResume).toHaveBeenCalledTimes(1);
      // Seconds in the store, MILLISECONDS to the bridge. A 17-second
      // bookmark must arrive as 17000, not 17 and not 17000000.
      expect(promptResume.mock.calls[0]![0]).toMatchObject({
        positionMs: 17_000,
        source: 'bookmark',
      });
      expect(mockOpenWithResume.mock.calls[0]![0].startPositionMs).toBe(17_000);
    });

    it('sends an explicit 0 when the user chooses to start over', async () => {
      useBookmarksStore.getState().addBookmark({
        bookmark: {
          fileUri: OPTS.uri,
          title: 'Namus Kanla Yazilir',
          position: 17,
          duration: 3991,
          createdAt: '2026-10-07T00:00:00.000Z',
          label: '',
          mediaType: 'video',
          type: 'movie',
          source: 'api',
        },
      });
      const {result} = await renderHook(() =>
        usePlayerActivity({promptResume: async () => 'start'}),
      );

      await result.current.openPlayer(OPTS);

      // Explicit 0, not an omitted field. Omitting it would let the
      // lib's policy find the very bookmark the user just declined to
      // resume from.
      expect(mockOpenWithResume.mock.calls[0]![0].startPositionMs).toBe(0);
    });

    it('does not ask when the caller already chose a position', async () => {
      useBookmarksStore.getState().addBookmark({
        bookmark: {
          fileUri: OPTS.uri,
          title: 'Namus Kanla Yazilir',
          position: 17,
          duration: 3991,
          createdAt: '2026-10-07T00:00:00.000Z',
          label: '',
          mediaType: 'video',
          type: 'movie',
          source: 'api',
        },
      });
      const promptResume = jest.fn(async (_c: {positionMs: number; source: string; title: string}) => 'resume' as const);
      const {result} = await renderHook(() =>
        usePlayerActivity({promptResume}),
      );

      // The Song screen's bookmark jump: an explicit position IS the
      // instruction, and asking again would contradict it.
      await result.current.openPlayer({...OPTS, startPositionMs: 120_000});

      expect(promptResume).not.toHaveBeenCalled();
      expect(mockOpenWithResume.mock.calls[0]![0].startPositionMs).toBe(120_000);
    });

    it('does not ask when the caller explicitly restarted from zero', async () => {
      useBookmarksStore.getState().addBookmark({
        bookmark: {
          fileUri: OPTS.uri,
          title: 'Namus Kanla Yazilir',
          position: 17,
          duration: 3991,
          createdAt: '2026-10-07T00:00:00.000Z',
          label: '',
          mediaType: 'video',
          type: 'movie',
          source: 'api',
        },
      });
      const promptResume = jest.fn(async (_c: {positionMs: number; source: string; title: string}) => 'resume' as const);
      const {result} = await renderHook(() =>
        usePlayerActivity({promptResume}),
      );

      await result.current.openPlayer({...OPTS, startPositionMs: 0});

      expect(promptResume).not.toHaveBeenCalled();
      expect(mockOpenWithResume.mock.calls[0]![0].startPositionMs).toBe(0);
    });

    it('resumes silently when no prompt is wired', async () => {
      useBookmarksStore.getState().addBookmark({
        bookmark: {
          fileUri: OPTS.uri,
          title: 'Namus Kanla Yazilir',
          position: 17,
          duration: 3991,
          createdAt: '2026-10-07T00:00:00.000Z',
          label: '',
          mediaType: 'video',
          type: 'movie',
          source: 'api',
        },
      });
      const {result} = await renderHook(() => usePlayerActivity());

      await result.current.openPlayer(OPTS);

      // No prompt provider is a presentation regression, never a
      // functional one: the saved position must still be honoured.
      expect(mockOpenWithResume.mock.calls[0]![0].startPositionMs).toBe(17_000);
    });

    it('reads a history position when there is no bookmark', async () => {
      useRecentHistoryStore.getState().upsertRecentHistoryEntry({
        fileUri: OPTS.uri,
        title: 'Namus Kanla Yazilir',
        position: 130,
        duration: 3991,
      });
      const promptResume = jest.fn(async (_c: {positionMs: number; source: string; title: string}) => 'resume' as const);
      const {result} = await renderHook(() =>
        usePlayerActivity({promptResume}),
      );

      await result.current.openPlayer(OPTS);

      expect(promptResume.mock.calls[0]![0]).toMatchObject({source: 'history'});
      expect(mockOpenWithResume.mock.calls[0]![0].startPositionMs).toBe(130_000);
    });

    it('never asks about media that is effectively finished', async () => {
      // 95% of 3991s. The heuristic applies to history only, never to
      // an explicit bookmark.
      useRecentHistoryStore.getState().upsertRecentHistoryEntry({
        fileUri: OPTS.uri,
        title: 'Namus Kanla Yazilir',
        position: 3791,
        duration: 3991,
      });
      const promptResume = jest.fn(async (_c: {positionMs: number; source: string; title: string}) => 'resume' as const);
      const {result} = await renderHook(() =>
        usePlayerActivity({promptResume}),
      );

      await result.current.openPlayer(OPTS);

      expect(promptResume).not.toHaveBeenCalled();
      expect(mockOpenWithResume.mock.calls[0]![0].startPositionMs).toBe(0);
    });
  });
});