/// <reference types="node" />
/**
 * F5 A4 — the checkpoint → Recently Played chain, end to end.
 *
 * ## Why this file exists
 *
 * `usePlaybackCheckpointSync.test.tsx` is thorough — 16 tests covering the
 * cadence, the admission rule, the teardown flush and the resume frame. But
 * it mocks BOTH of the chain's ends:
 *
 *   - `../../../src/infrastructure/player/useTransport`
 *   - `../../../src/features/recentHistory`
 *
 * So it proves the writer's internal logic and nothing about whether the
 * thing it writes to exists, or whether its inputs are real. Those two
 * mocks are individually correct — unit tests should isolate — and
 * together they leave the whole seam untested. Specifically, this file
 * did not exist to catch:
 *
 *   - `useTransport` silently returning `positionMs: 0`, which makes every
 *     checkpoint fail `shouldRecordCheckpoint` and Recently Played stays
 *     empty with zero errors anywhere;
 *   - `addRecent` being renamed, moved, or reduced to a no-op;
 *   - the real store rejecting the entry shape (missing `mediaType`,
 *     `fileUri` normalisation, the persist/repair path).
 *
 * ## What is mocked here, and why only that
 *
 * ONLY `@simba-dev/react-native-media-player`. Everything between the
 * native boundary and the store is the real thing:
 *
 *   lib mock → real useTransport (real derivations) → real
 *   usePlaybackCheckpointSync → real addRecent → real useRecentHistoryStore
 *
 * That is the point. Mocking the lib is the same boundary jest.setup.ts
 * already mocks for every other suite, and it is the only place a real
 * mpv engine could be required.
 *
 * ## Mutation checks
 *
 * `shouldRecordCheckpoint`'s position floor and the `isPlaying` gate are
 * both load-bearing; the "writes nothing while paused" case fails if the
 * pause term is dropped, and the position case fails if the floor is
 * removed. Both were verified by mutation — see the tracker's session 10
 * record.
 */

import * as React from 'react';
import {render} from '@testing-library/react-native';
import {act} from 'react-test-renderer';

// ── The ONLY mock: the native boundary ──────────────────────────────

const mockCaptureFrame = jest.fn(
  async (): Promise<string | null> => '/data/simba-resume-thumbs/frame.jpg',
);

const mockProgress = {
  positionMs: 0,
  durationMs: 0,
  isBuffering: false,
  isSeeking: false,
  seekable: true,
  cacheFill: 0,
  cacheRanges: [] as Array<{start: number; end: number}>,
};

const mockPlayerState: {
  isPlaying: boolean;
  title: string;
  shuffle: boolean;
  playlist: Array<{filename?: string; title?: string}>;
  currentIndex: number;
} = {
  isPlaying: true,
  title: '',
  shuffle: false,
  playlist: [],
  currentIndex: -1,
};

const mockCommands = {
  seek: jest.fn(),
  seekBy: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  clear: jest.fn(),
  stopPlayback: jest.fn(),
};

jest.mock('@simba-dev/react-native-media-player', () => ({
  captureFrame: (
    _uri: string,
    _positionMs: number,
    _options?: {width: number; height: number},
  ) => mockCaptureFrame(),
  usePlayerProgress: () => mockProgress,
  usePlayer: () => ({state: mockPlayerState, commands: mockCommands}),
}));

// ── The REAL chain ──────────────────────────────────────────────────

import {usePlaybackCheckpointSync} from '../../../src/infrastructure/player/usePlaybackCheckpointSync';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';
import {useRecentHistoryStore} from '../../../src/state/recentHistoryStore';

const URI = 'file:///movies/film.mkv';

interface HarnessProps {
  clock: {now: number};
  /** Bumping this is what forces a real React re-render. */
  progress: typeof mockProgress;
}

function Harness({clock, progress}: HarnessProps) {
  Object.assign(mockProgress, progress);
  usePlaybackCheckpointSync(() => clock.now);
  return null;
}

describe('checkpoint → Recently Played (F5 A4, one root)', () => {
  let clock: {now: number};

  const entries = () => useRecentHistoryStore.getState().entries;

  const setProgress = async (
    view: {rerender: (el: React.ReactElement) => unknown},
    patch: Partial<typeof mockProgress>,
  ) => {
    await view.rerender(
      <Harness
        clock={clock}
        progress={{...mockProgress, ...patch}}
      />,
    );
  };

  const tick = (ms: number) => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockCaptureFrame.mockClear();
    mockCaptureFrame.mockResolvedValue('/data/simba-resume-thumbs/frame.jpg');
    Object.assign(mockProgress, {
      positionMs: 0,
      durationMs: 0,
      isBuffering: false,
      isSeeking: false,
      seekable: true,
      cacheFill: 0,
      cacheRanges: [],
    });
    Object.assign(mockPlayerState, {
      isPlaying: true,
      title: 'Namus Kanla Yazilir',
      shuffle: false,
      playlist: [],
      currentIndex: -1,
    });
    useNowPlayingStore.getState().reset();
    useRecentHistoryStore.getState().clearRecentHistory();
    clock = {now: 1_000_000};
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const launch = () => {
    act(() => {
      useNowPlayingStore.getState().begin({
        uri: URI,
        title: 'Namus Kanla Yazilir',
        startPositionMs: 0,
        type: 'movie',
        mediaLane: 'video',
        streamType: 'video',
      });
    });
  };

  // ── The claims ────────────────────────────────────────────────────

  it('lands a real entry in the real Recently Played store', async () => {
    // This is the whole point of the file. Every step between the lib and
    // the store is production code: `useTransport`'s derivations decide
    // that positionMs 60_000 / durationMs 600_000 is playing media, the
    // writer's admission rule admits it, `addRecent` normalises the uri
    // and the store prepends it.
    launch();
    const view = await render(<Harness clock={clock} progress={mockProgress} />);
    await setProgress(view, {positionMs: 60_000, durationMs: 600_000});

    expect(entries()).toHaveLength(0); // not yet — the cadence has not fired

    tick(30_000);

    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toMatchObject({
      fileUri: URI,
      title: 'Namus Kanla Yazilir',
      position: 60,
      duration: 600,
      type: 'movie',
      mediaType: 'video',
    });
  });

  it('reaches the store because useTransport really derives from the lib', async () => {
    // Faithful mutant: make `useTransport` report `positionMs: 0`
    // regardless of `usePlayerProgress()`. The entry never appears.
    // This is the exact regression the mocked unit suite cannot catch.
    launch();
    const view = await render(<Harness clock={clock} progress={mockProgress} />);
    await setProgress(view, {positionMs: 45_000, durationMs: 300_000});
    tick(30_000);

    // And the position recorded is the ONE the lib reported, not a
    // constant the writer invented.
    expect(entries()[0]!.position).toBe(45);
  });

  it('writes nothing while the lib reports paused', async () => {
    // Faithful mutant: drop the `playerState.isPlaying` term from
    // `useTransport`'s derivation. A paused track has a known duration
    // and a frozen position, so it satisfies every OTHER term — without
    // the pause term this checkpoint is written for a track nobody is
    // listening to, and resume offers a position for a stopped item.
    launch();
    const view = await render(<Harness clock={clock} progress={mockProgress} />);
    mockPlayerState.isPlaying = false;
    await setProgress(view, {positionMs: 60_000, durationMs: 600_000});
    tick(30_000 * 4);

    expect(entries()).toHaveLength(0);
  });

  it('writes nothing while the lib reports buffering', async () => {
    // Same shape, different term. Buffering with a frozen position would
    // otherwise record a "watched to" for a stream that has not started.
    launch();
    const view = await render(<Harness clock={clock} progress={mockProgress} />);
    await setProgress(view, {
      positionMs: 60_000,
      durationMs: 600_000,
      isBuffering: true,
    });
    tick(30_000 * 4);

    expect(entries()).toHaveLength(0);
  });

  it('flushes the final position into the store on teardown', async () => {
    // "Watched to 29:59, pressed back" must not resume at 29:30 — and
    // this now proves the flush reaches the STORE, not just a mock.
    launch();
    const view = await render(<Harness clock={clock} progress={mockProgress} />);
    await setProgress(view, {positionMs: 90_000, durationMs: 600_000});

    await view.unmount();

    expect(entries()[0]).toMatchObject({position: 90});
  });

  it('records nothing at all for a cold start', async () => {
    // No session launched: there is no file to record history for.
    const view = await render(<Harness clock={clock} progress={mockProgress} />);
    await setProgress(view, {positionMs: 60_000, durationMs: 600_000});
    tick(30_000 * 4);

    expect(entries()).toHaveLength(0);
  });
});