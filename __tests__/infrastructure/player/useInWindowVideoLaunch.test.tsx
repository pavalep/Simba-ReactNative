/**
 * V22 W33 (2026-10-28) — B-012's app half.
 *
 * ## What this pins
 *
 * A second launch must be a **DIFFERENT** launch.
 *
 * The in-window video launcher's identity is its `requestId`, and the
 * launcher derives that from the now-playing session's **monotonic**
 * `sessionId`. The lib's `useLaunchPlayback` keys its effect on
 * `` `${requestId}|${uri}|${startPositionSec}` ``, so a second launch only
 * re-fires the effect if the session id moved.
 *
 * B-012 ("tapping a second movie while one is playing does nothing") was
 * reported as undiagnosed. The app half of that chain has now been read end
 * to end and is correct — the tap, the facade, the seam, the session, the
 * payload and the request id all move, and nothing in between guards,
 * caches or swallows. So this test pins that half, so the next person does
 * not have to re-read it: if a future change makes a second launch reuse the
 * first launch's identity, this fails.
 *
 * What the test does NOT claim: that the second movie PLAYS. The one place
 * a second launch can still die is below `bridge.loadFile`, on the native
 * side, and the lib's bridge is internal — the app cannot intercept
 * `loadFile` in a jest test without re-implementing the lib's own effect,
 * which would prove nothing. See bug `B-012` for the two candidates and the
 * exact log line that separates them.
 */
import {act, renderHook} from '@testing-library/react-native';

const mockUseLaunchPlayback = jest.fn();
const mockOpenWithResume = jest.fn(
  async (_opts: Record<string, unknown>): Promise<boolean> => true,
);
const mockLibOpenPlayer = jest.fn(async () => true);

jest.mock('@simba-dev/react-native-media-player', () => {
  const actual = jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    useOpenWithResume: () => mockOpenWithResume,
    usePlayerActivity: () => ({openPlayer: mockLibOpenPlayer}),
    useLaunchPlayback: (params: unknown) => mockUseLaunchPlayback(params),
  };
});

import {useInWindowVideoLaunch} from '../../../src/infrastructure/player/useInWindowVideoLaunch';
import {useResumeAwareLaunch} from '../../../src/infrastructure/player/useResumeAwareLaunch';
import {useBookmarksStore} from '../../../src/state/bookmarksStore';
import {useRecentHistoryStore} from '../../../src/state/recentHistoryStore';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';

const FIRST = 'file:///movies/first.mkv';
const SECOND = 'file:///movies/second.mkv';

interface Payload {
  uri: string;
  title: string;
  requestId?: string;
  startPositionMs?: number;
}

/** The payload the launcher was last handed. */
function lastPayload(): Payload | undefined {
  const calls = mockUseLaunchPlayback.mock.calls;
  const last = calls[calls.length - 1];
  return (last?.[0] ?? null) as Payload | undefined;
}

describe('useInWindowVideoLaunch', () => {
  beforeEach(() => {
    mockUseLaunchPlayback.mockClear();
    mockOpenWithResume.mockClear();
    mockLibOpenPlayer.mockClear();
    useNowPlayingStore.getState().reset();
    useBookmarksStore.getState().reset();
    useRecentHistoryStore.getState().reset();
  });

  it('hands the launcher a NEW identity for a second launch', async () => {
    const {result} = await renderHook(() => {
      // Both hooks in one render: the launcher reads the session the seam
      // writes, so they have to share a tree.
      useInWindowVideoLaunch();
      return useResumeAwareLaunch();
    });

    await act(async () => {
      await result.current.openPlayer({
        uri: FIRST,
        title: 'first',
        type: 'video',
      });
    });
    const first = lastPayload();

    await act(async () => {
      await result.current.openPlayer({
        uri: SECOND,
        title: 'second',
        type: 'video',
      });
    });
    const second = lastPayload();

    // The payload moved.
    expect(first?.uri).toBe(FIRST);
    expect(second?.uri).toBe(SECOND);

    // And — the part the whole chain rests on — the IDENTITY moved with
    // it. A payload that reused the first launch's `requestId` would
    // produce the same effect key in the lib and no load would happen.
    expect(first?.requestId).toBeDefined();
    expect(second?.requestId).not.toBe(first?.requestId);
    expect(Number(second?.requestId)).toBeGreaterThan(
      Number(first?.requestId),
    );
  });

  it('gives the SAME file a new identity too', async () => {
    const {result} = await renderHook(() => {
      useInWindowVideoLaunch();
      return useResumeAwareLaunch();
    });

    await act(async () => {
      await result.current.openPlayer({uri: FIRST, title: 'first', type: 'video'});
    });
    const first = lastPayload();

    await act(async () => {
      await result.current.openPlayer({uri: FIRST, title: 'first', type: 'video'});
    });
    const second = lastPayload();

    // `uri + startPositionMs` is NOT a launch identity — the launcher
    // carries `requestId` for exactly this case. Replaying the same file
    // must still be a new launch.
    expect(second?.requestId).not.toBe(first?.requestId);
  });
});
