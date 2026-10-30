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
 * The fix is at the seam (`useResumeAwareLaunch`), so this test
 * asserts the SEAM's contract, not any individual screen's:
 *
 *   1. `openPlayer` passes `resumeId` = the media uri (the app's
 *      resume key everywhere - `resolveResumeMs` matches on
 *      `Bookmark.fileUri` / `RecentHistoryEntry.fileUri`).
 *   2. An explicit `startPositionMs` is still forwarded untouched, so
 *      the lib's `useOpenWithResume` keeps sole ownership of the
 *      "explicit position wins" precedence rule.
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
  }),
}));

import {useResumeAwareLaunch} from '../../../src/infrastructure/player/useResumeAwareLaunch';
import {useBookmarksStore} from '../../../src/state/bookmarksStore';
import {useRecentHistoryStore} from '../../../src/state/recentHistoryStore';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';

const OPTS = {
  uri: 'file:///movies/namus-kanla-yazilir.mkv',
  title: 'Namus Kanla Yazilir',
  type: 'video' as const,
};

// Same shape, audio lane. Kept as its own constant rather than
// `{...OPTS, type: 'audio'}` inline so that a future change to the video
// fixture cannot silently become an audio test.
const AUDIO_OPTS = {
  uri: 'file:///podcasts/can-ai.mp3',
  title: 'Can AI Take the Repetitive Work Out?',
  type: 'audio' as const,
};

describe('useResumeAwareLaunch — resume-aware launch seam', () => {
  beforeEach(() => {
    mockOpenWithResume.mockClear();
    mockLibOpenPlayer.mockClear();
    // The session is module-global, so a test that asserts on what a
    // launch RECORDED needs a clean one to read. Without this the file
    // only passes in declaration order.
    useNowPlayingStore.getState().reset();
  });

  // V21 F3 split these two by lane, because "the position reaches the
  // engine" stopped being one code path.
  //
  // AUDIO still goes out through `useOpenWithResume` -> `bridge.openPlayer`
  // -> `startActivity` (audio has no window, so the Activity only carries
  // the notification). VIDEO does not: the session records the position and
  // `useInWindowVideoLaunch` replays it through `useLaunchPlayback` into the
  // surface `MainActivity` already mounted. Asserting both shapes is the
  // point — an assertion that only covers one lane passes just as well if
  // the other lane silently regresses.

  it('audio: passes the media uri as resumeId AND an explicit position', async () => {
    // W9.5: the seam now ALWAYS sends `startPositionMs`, including an
    // explicit 0. That is deliberate and load-bearing: the lib gates
    // its own resume policy on `providedStartMs == null`
    // (`useOpenWithResume.tsx:128`), so a launch with the field absent
    // would be re-decided by a second rule. One authority, one launch.
    const {result} = await renderHook(() => useResumeAwareLaunch());

    await result.current.openPlayer(AUDIO_OPTS);

    expect(mockOpenWithResume).toHaveBeenCalledTimes(1);
    expect(mockOpenWithResume).toHaveBeenCalledWith({
      ...AUDIO_OPTS,
      startPositionMs: 0,
      resumeId: AUDIO_OPTS.uri,
    });
  });

  it('audio: forwards an explicit startPositionMs untouched', async () => {
    // Precedence between an explicit position and a saved one belongs
    // to the lib's useOpenWithResume. Re-deciding it here would create
    // two sources of truth for one rule - which is how the earlier
    // 1000x-seek bug happened. So the seam must forward, not judge.
    const {result} = await renderHook(() => useResumeAwareLaunch());

    await result.current.openPlayer({...AUDIO_OPTS, startPositionMs: 78_000});

    expect(mockOpenWithResume).toHaveBeenCalledWith({
      ...AUDIO_OPTS,
      startPositionMs: 78_000,
      resumeId: AUDIO_OPTS.uri,
    });
  });

  it('video: records the start position on the session instead of launching an Activity', async () => {
    // The F3 contract, stated as an outcome. The session is the ONLY
    // payload an in-window launch has, so "the position is remembered" and
    // "no second window is started" are one property, not two.
    const {result} = await renderHook(() => useResumeAwareLaunch());

    await expect(result.current.openPlayer(OPTS)).resolves.toBe(true);

    // Starts at 0 because there is no bookmark and no history for this
    // uri - the same resolution `planResume` performs for the audio lane.
    expect(useNowPlayingStore.getState().current).toMatchObject({
      uri: OPTS.uri,
      startPositionMs: 0,
    });
    // The failure this pins: a video launch that still opens an Activity
    // cannot host an in-app mini player at all, because the Surface would
    // belong to the other window.
    expect(mockOpenWithResume).not.toHaveBeenCalled();
    expect(mockLibOpenPlayer).not.toHaveBeenCalled();
  });

  it('video: forwards an explicit startPositionMs onto the session untouched', async () => {
    const {result} = await renderHook(() => useResumeAwareLaunch());

    await result.current.openPlayer({...OPTS, startPositionMs: 78_000});

    expect(useNowPlayingStore.getState().current?.startPositionMs).toBe(78_000);
    expect(mockOpenWithResume).not.toHaveBeenCalled();
  });


  it('returns a stable result object across re-renders', async () => {
    // Consumers put `openPlayer` in useCallback/useMemo dependency
    // arrays. A new object every render would re-run those effects on
    // every player state tick - the exact render-cascade class the W9
    // performance work removed.
    const {result, rerender} = await renderHook(() => useResumeAwareLaunch());
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
        useResumeAwareLaunch({promptResume}),
      );

      await result.current.openPlayer(OPTS);

      expect(promptResume).toHaveBeenCalledTimes(1);
      // Seconds in the store, MILLISECONDS to the bridge. A 17-second
      // bookmark must arrive as 17000, not 17 and not 17000000.
      expect(promptResume.mock.calls[0]![0]).toMatchObject({
        positionMs: 17_000,
        source: 'bookmark',
      });
      expect(useNowPlayingStore.getState().current?.startPositionMs).toBe(17_000);
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
        useResumeAwareLaunch({promptResume: async () => 'start'}),
      );

      await result.current.openPlayer(OPTS);

      // Explicit 0, not an omitted field. Omitting it would let the
      // lib's policy find the very bookmark the user just declined to
      // resume from.
      expect(useNowPlayingStore.getState().current?.startPositionMs).toBe(0);
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
        useResumeAwareLaunch({promptResume}),
      );

      // The Song screen's bookmark jump: an explicit position IS the
      // instruction, and asking again would contradict it.
      await result.current.openPlayer({...OPTS, startPositionMs: 120_000});

      expect(promptResume).not.toHaveBeenCalled();
      expect(useNowPlayingStore.getState().current?.startPositionMs).toBe(120_000);
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
        useResumeAwareLaunch({promptResume}),
      );

      await result.current.openPlayer({...OPTS, startPositionMs: 0});

      expect(promptResume).not.toHaveBeenCalled();
      expect(useNowPlayingStore.getState().current?.startPositionMs).toBe(0);
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
      const {result} = await renderHook(() => useResumeAwareLaunch());

      await result.current.openPlayer(OPTS);

      // No prompt provider is a presentation regression, never a
      // functional one: the saved position must still be honoured.
      expect(useNowPlayingStore.getState().current?.startPositionMs).toBe(17_000);
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
        useResumeAwareLaunch({promptResume}),
      );

      await result.current.openPlayer(OPTS);

      expect(promptResume.mock.calls[0]![0]).toMatchObject({source: 'history'});
      expect(useNowPlayingStore.getState().current?.startPositionMs).toBe(130_000);
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
        useResumeAwareLaunch({promptResume}),
      );

      await result.current.openPlayer(OPTS);

      expect(promptResume).not.toHaveBeenCalled();
      expect(useNowPlayingStore.getState().current?.startPositionMs).toBe(0);
    });
  });
});
/**
 * The lane the seam records, for callers that pass no identity at all.
 *
 * This is the Turkish-film-with-a-music-note bug. `bridgeOpts.type` is
 * `'video' | 'audio'` at every one of the ~31 launch sites, and the seam
 * was DISCARDING it — `...(mediaKind ? {type: mediaKind} : {})` left both
 * fields off the session unless a screen happened to pass them, which
 * only 4 of 31 did. The checkpoint writer then forwarded no lane, and
 * `normalizeMediaClassification` filled the hole with `'audio'`
 * (`media.ts:76`). Every badge consumer reads the lane, so a film drew a
 * music note in Recently Played while Bookmarks showed it correctly.
 *
 * These pin the outcome — the lane is ALWAYS present and correct — rather
 * than the mechanism, because the mechanism has already changed shape
 * once (conditional spreads became direct assignment).
 */
describe('useResumeAwareLaunch - the session always records a lane', () => {
  beforeEach(() => {
    mockOpenWithResume.mockClear();
    useNowPlayingStore.getState().reset();
  });

  it('records video for a video launch that passes no mediaKind or mediaLane', async () => {
    const {result} = await renderHook(() => useResumeAwareLaunch());
    await result.current.openPlayer(OPTS);

    const session = useNowPlayingStore.getState().current;
    expect(session?.mediaLane).toBe('video');
    expect(session?.streamType).toBe('video');
  });

  it('records audio for an audio launch that passes no mediaKind or mediaLane', async () => {
    // The regression that matters most: an unclassified AUDIO launch must
    // not be able to land in the video lane either.
    const {result} = await renderHook(() => useResumeAwareLaunch());
    await result.current.openPlayer({
      uri: 'file:///podcasts/can-ai.mp3',
      title: 'Can AI Take the Repetitive Work Out?',
      type: 'audio',
    });

    const session = useNowPlayingStore.getState().current;
    expect(session?.mediaLane).toBe('audio');
    expect(session?.streamType).toBe('audio');
  });

  it("a catalogue lane still wins — it is more specific than 'it's audio'", async () => {
    const {result} = await renderHook(() => useResumeAwareLaunch());
    await result.current.openPlayer({
      ...OPTS,
      type: 'audio',
      mediaLane: 'audio',
      mediaKind: 'podcast',
    });

    const session = useNowPlayingStore.getState().current;
    expect(session?.mediaLane).toBe('audio');
    expect(session?.type).toBe('podcast');
  });
});

/**
 * B-026 — the artwork the caller hands over reaches BOTH consumers.
 *
 * The seam has always accepted a `thumbnailPath`; what it did not have
 * was a CALLER that supplied one, so every history entry was written
 * with `thumbnailPath: ''` and the search tile for a film the user had
 * already watched drew a placeholder instead of a poster.
 *
 * Two consumers, two assertions:
 *
 *   - the BRIDGE (`artworkPath`) — the media notification's large icon;
 *   - the SESSION (`thumbnailPath`) — which the checkpoint writer copies
 *     onto the history entry, and which is therefore what the next
 *     search for that film draws.
 *
 * A launch that reaches only one of them is still broken, so both are
 * pinned.
 */
describe('useResumeAwareLaunch — the artwork reaches the bridge and the session', () => {
  const ARTWORK = 'https://cdn.example.test/cover.jpg';

  beforeEach(() => {
    mockOpenWithResume.mockClear();
    useNowPlayingStore.getState().reset();
  });

  it('forwards the artwork to the bridge as artworkPath', async () => {
    const {result} = await renderHook(() => useResumeAwareLaunch());

    await result.current.openPlayer({...AUDIO_OPTS, thumbnailPath: ARTWORK});

    expect(mockOpenWithResume).toHaveBeenCalledWith(
      expect.objectContaining({artworkPath: ARTWORK}),
    );
  });

  it('records the artwork on the session', async () => {
    const {result} = await renderHook(() => useResumeAwareLaunch());

    await result.current.openPlayer({...AUDIO_OPTS, thumbnailPath: ARTWORK});

    expect(useNowPlayingStore.getState().current?.thumbnailPath).toBe(ARTWORK);
  });

  it('sends no artwork at all when the caller has none', async () => {
    // The ~34 call sites that pass no artwork must not grow a blank
    // `artworkPath` — a present-but-empty path is artwork to the bridge.
    const {result} = await renderHook(() => useResumeAwareLaunch());

    await result.current.openPlayer(AUDIO_OPTS);

    expect(mockOpenWithResume.mock.calls[0]![0]).not.toHaveProperty(
      'artworkPath',
    );
    expect(useNowPlayingStore.getState().current?.thumbnailPath).toBeUndefined();
  });
});
