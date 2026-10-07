/**
 * W9.4 — the resume checkpoint WRITER.
 *
 * This is the producer that never existed. `recentHistoryStore` has
 * been read by six surfaces since V17 and written by nothing, which is
 * why "Recently Played" has always rendered its empty state and why
 * resume could only ever come from a bookmark.
 *
 * The tests below are written to catch the specific ways a writer like
 * this fails quietly:
 *
 *   1. **Never fires.** A timer that is torn down and rebuilt on every
 *      position tick resets its own countdown forever, so it writes
 *      once and then never again — indistinguishable from "works" in a
 *      test that only advances the clock once.
 *   2. **Fires on every tick.** The store is persisted to MMKV, so a
 *      per-tick write is a storage storm.
 *   3. **Writes the wrong thing.** A checkpoint with no URI, or with a
 *      URI that does not match what the resume reader looks up.
 *   4. **Loses the last 30 seconds.** No flush on teardown, so
 *      "watched to 29:59, pressed back" resumes at 29:30.
 *   5. **Records media that does not exist.** Live TV and radio report
 *      `duration 0`; a "position" against those is meaningless and
 *      resuming one drops the user mid-broadcast.
 */

import * as React from 'react';
import {render} from '@testing-library/react-native';
import {act} from 'react-test-renderer';

const mockAddRecent = jest.fn();
jest.mock('../../../src/features/recentHistory', () => ({
  addRecent: (entry: unknown) => mockAddRecent(entry),
}));

// W9.5 — the resume frame. Mocked at the LIB's public entry, which is
// where the production code imports it from, so a rename or a move to
// the bridge layer fails these tests rather than silently skipping the
// capture.
const mockCaptureFrame = jest.fn(
  async (
    _uri: string,
    _positionMs: number,
    _options?: {width: number; height: number},
  ): Promise<string | null> => '/data/simba-resume-thumbs/frame.jpg',
);
jest.mock('@simba-dev/react-native-media-player', () => ({
  captureFrame: (
    uri: string,
    positionMs: number,
    options?: {width: number; height: number},
  ) => mockCaptureFrame(uri, positionMs, options),
}));

interface FakeTransport {
  positionMs: number;
  durationMs: number;
  isPlaying: boolean;
  title: string;
}

let mockTransportState: FakeTransport = {
  positionMs: 0,
  durationMs: 600_000,
  isPlaying: true,
  title: 'Namus Kanla Yazilir',
};

jest.mock('../../../src/infrastructure/player/useTransport', () => ({
  useTransport: () => ({state: mockTransportState, commands: {}}),
}));

import {usePlaybackCheckpointSync} from '../../../src/infrastructure/player/usePlaybackCheckpointSync';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';
import {CHECKPOINT_INTERVAL_MS, RESUME_THUMB_HEIGHT, RESUME_THUMB_WIDTH} from '../../../src/infrastructure/player/playbackProgress';

const URI = 'file:///movies/film.mkv';

/**
 * The transport values are pushed in THROUGH a prop so that changing them
 * causes a real React re-render.
 *
 * The first version of this suite assigned to a module-level variable and
 * called `act()`, which does NOT re-render — the hook kept reading the
 * value from mount and every write was correctly rejected for position 0.
 * A test that looks like it is driving the player but is not will pass
 * for entirely the wrong reason, so the state has to go through React.
 */
function Harness(props: {clock: {now: number}; transport: FakeTransport}) {
  mockTransportState = props.transport;
  usePlaybackCheckpointSync(() => props.clock.now);
  return null;
}

const base: FakeTransport = {
  positionMs: 0,
  durationMs: 600_000,
  isPlaying: true,
  title: 'Namus Kanla Yazilir',
};

describe('usePlaybackCheckpointSync', () => {
  let clock: {now: number};

  beforeEach(() => {
    jest.useFakeTimers();
    mockAddRecent.mockClear();
    mockCaptureFrame.mockClear();
    mockCaptureFrame.mockResolvedValue('/data/simba-resume-thumbs/frame.jpg');
    mockTransportState = {...base};
    useNowPlayingStore.getState().reset();
    clock = {now: 1_000_000};
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const launch = (uri = URI, title = 'Namus Kanla Yazilir') => {
    act(() => {
      useNowPlayingStore.getState().begin({
        uri,
        title,
        type: 'movie',
        mediaLane: 'video',
      });
    });
  };

  /** Push a new transport state through a real re-render. */
  const setTransport = async (view: {rerender: (el: React.ReactElement) => unknown}, patch: Partial<FakeTransport>) => {
    mockTransportState = {...base, ...patch};
    await view.rerender(
      <Harness clock={clock} transport={mockTransportState} />,
    );
  };

  const tick = (ms = CHECKPOINT_INTERVAL_MS) => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  it('writes nothing when no media has been launched', async () => {
    // A cold start must not invent history — there is no file to invent
    // it for, so the only correct answer is nothing.
    const view = await render(
      <Harness clock={clock} transport={mockTransportState} />,
    );
    await setTransport(view, {positionMs: 60_000});
    tick(CHECKPOINT_INTERVAL_MS * 4);

    expect(mockAddRecent).not.toHaveBeenCalled();
  });

  it('writes a checkpoint keyed on the launched uri', async () => {
    launch();
    const view = await render(
      <Harness clock={clock} transport={mockTransportState} />,
    );
    await setTransport(view, {positionMs: 60_000});
    tick();

    expect(mockAddRecent).toHaveBeenCalledTimes(1);
    expect(mockAddRecent).toHaveBeenCalledWith(
      expect.objectContaining({
        fileUri: URI,
        title: 'Namus Kanla Yazilir',
        position: 60,
        duration: 600,
        type: 'movie',
        mediaType: 'video',
      }),
    );
  });

  it('does NOT write on every tick', async () => {
    // 4 intervals of clock time, one write. The store is persisted to
    // MMKV, so this is a storage-write budget, not a render budget.
    launch();
    const view = await render(
      <Harness clock={clock} transport={mockTransportState} />,
    );
    await setTransport(view, {positionMs: 60_000});
    clock.now += CHECKPOINT_INTERVAL_MS * 4;
    tick(CHECKPOINT_INTERVAL_MS * 4);

    expect(mockAddRecent).toHaveBeenCalledTimes(1);
  });

  it('keeps writing once the interval has genuinely elapsed', async () => {
    // The mirror of the test above. A guard that never fires is worse
    // than one that always fires: the first silently loses every resume
    // position, the second merely costs some writes.
    launch();
    const view = await render(
      <Harness clock={clock} transport={mockTransportState} />,
    );

    for (let i = 1; i <= 3; i++) {
      await setTransport(view, {positionMs: i * 30_000});
      clock.now += CHECKPOINT_INTERVAL_MS;
      tick();
    }

    expect(mockAddRecent).toHaveBeenCalledTimes(3);
  });

  it('never records a live / unknown-duration stream', async () => {
    launch('udp://239.1.1.1:1234');
    const view = await render(
      <Harness clock={clock} transport={mockTransportState} />,
    );
    await setTransport(view, {durationMs: 0, positionMs: 60_000});
    tick(CHECKPOINT_INTERVAL_MS * 4);

    expect(mockAddRecent).not.toHaveBeenCalled();
  });

  it('does not record a mis-tap', async () => {
    launch();
    const view = await render(
      <Harness clock={clock} transport={mockTransportState} />,
    );
    await setTransport(view, {positionMs: 1_000});
    tick(CHECKPOINT_INTERVAL_MS * 4);

    expect(mockAddRecent).not.toHaveBeenCalled();
  });

  it('does not record while paused', async () => {
    launch();
    const view = await render(
      <Harness clock={clock} transport={mockTransportState} />,
    );
    await setTransport(view, {isPlaying: false, positionMs: 60_000});
    tick(CHECKPOINT_INTERVAL_MS * 4);

    expect(mockAddRecent).not.toHaveBeenCalled();
  });

  it('restarts the cadence for a NEW session of the same media', async () => {
    // W9.5: this test previously asserted `toHaveBeenCalledTimes(2)`
    // after the relaunch's first tick — and that count came from the
    // periodic write plus the PREVIOUS session's teardown flush. The
    // final tick, the one that actually demonstrates the claim, was
    // being rate-limited out and nothing checked it. Keying the
    // rate-limit on the session (not the URI) is what makes the
    // relaunch write promptly, and the assertion below is the claim
    // itself rather than a tally.
    launch();
    const view = await render(
      <Harness clock={clock} transport={mockTransportState} />,
    );
    await setTransport(view, {positionMs: 60_000});
    clock.now += CHECKPOINT_INTERVAL_MS;
    tick();
    expect(mockAddRecent).toHaveBeenCalledTimes(1);

    act(() => {
      useNowPlayingStore.getState().begin({uri: URI, title: 'Film'});
    });
    await setTransport(view, {positionMs: 30_000});
    // Only ONE second after the previous session's checkpoint — well
    // inside the 30 s window that would suppress a same-URI write.
    clock.now += 1_000;
    tick();

    // The new session wrote promptly, at its OWN position.
    expect(mockAddRecent.mock.calls.at(-1)![0]).toMatchObject({position: 30});
  });

  it('flushes the final position when the session is torn down', async () => {
    // "Watched to 29:59, pressed back" must not resume at 29:30.
    launch();
    const view = await render(
      <Harness clock={clock} transport={mockTransportState} />,
    );
    await setTransport(view, {positionMs: 90_000});

    await view.unmount();

    expect(mockAddRecent).toHaveBeenCalledWith(
      expect.objectContaining({position: 90}),
    );
  });

  it('does not double-write when the tree re-renders', async () => {
    // The flush lives in the effect CLEANUP keyed on the session id, so a
    // re-render (4x/second while playing) must not trigger it. If it
    // did, the store would take 4 writes per second regardless of the
    // cadence — the exact regression the interval exists to prevent.
    launch();
    const view = await render(
      <Harness clock={clock} transport={mockTransportState} />,
    );
    await setTransport(view, {positionMs: 90_000});
    await setTransport(view, {positionMs: 91_000});
    await setTransport(view, {positionMs: 92_000});

    expect(mockAddRecent).not.toHaveBeenCalled();

    await view.unmount();
    // Two writes on teardown, both for the SAME media: the position,
    // then that entry again with the captured frame. The claim is that
    // a re-render adds nothing — the three rerenders above produced no
    // write at all, and teardown produces a fixed two, not one per
    // render.
    expect(mockAddRecent).toHaveBeenCalledTimes(2);
    expect(mockAddRecent.mock.calls[0]![0]).not.toHaveProperty(
      'resumeThumbnailPath',
    );
    expect(mockAddRecent.mock.calls[1]![0]).toMatchObject({
      resumeThumbnailPath: '/data/simba-resume-thumbs/frame.jpg',
    });
  });

  // ── W9.5 — the resume frame ────────────────────────────────────
  describe('resume thumbnail', () => {
    const mountedAt = async (positionMs: number) => {
      launch();
      const view = await render(
        <Harness clock={clock} transport={mockTransportState} />,
      );
      await setTransport(view, {positionMs});
      return view;
    };

    it('captures the frame at the position the user actually left at', async () => {
      const view = await mountedAt(90_000);

      await view.unmount();
      await act(async () => {await Promise.resolve();});

      expect(mockCaptureFrame).toHaveBeenCalledTimes(1);
      expect(mockCaptureFrame.mock.calls[0]![0]).toBe(URI);
      // MILLISECONDS, matching the bridge's units. Passing the
      // position in seconds here would ask for a frame 1000x earlier
      // than the resume point and quietly produce the wrong picture.
      expect(mockCaptureFrame.mock.calls[0]![1]).toBe(90_000);
    });

    it('asks for a 16:9 frame sized for the rail card', async () => {
      const view = await mountedAt(90_000);

      await view.unmount();
      await act(async () => {await Promise.resolve();});

      expect(mockCaptureFrame.mock.calls[0]![2]).toEqual({
        width: RESUME_THUMB_WIDTH,
        height: RESUME_THUMB_HEIGHT,
      });
    });

    it('writes the position FIRST, so a failed capture cannot cost it', async () => {
      mockCaptureFrame.mockRejectedValue(new Error('no decoder'));
      const view = await mountedAt(90_000);

      await view.unmount();
      await act(async () => {await Promise.resolve();});

      // The capture rejected, and the position is still there. This is
      // the whole reason the capture is fired after the write rather
      // than awaited in front of it.
      expect(mockAddRecent).toHaveBeenCalledWith(
        expect.objectContaining({position: 90}),
      );
    });

    it('treats "no frame available" as normal and keeps the poster fallback', async () => {
      // captureFrame resolves null for a live stream or an unsupported
      // container. That is an outcome, not a failure.
      mockCaptureFrame.mockResolvedValue(null);
      const view = await mountedAt(90_000);

      await view.unmount();
      await act(async () => {await Promise.resolve();});

      expect(mockAddRecent).toHaveBeenCalledWith(
        expect.objectContaining({position: 90}),
      );
      expect(mockAddRecent).not.toHaveBeenCalledWith(
        expect.objectContaining({resumeThumbnailPath: expect.anything()}),
      );
    });

    it('does NOT capture on the periodic cadence', async () => {
      const view = await mountedAt(90_000);

      tick(CHECKPOINT_INTERVAL_MS * 4);

      // Re-decoding the same picture every 30 s costs a byte range and
      // a decoder for a frame that looks identical to the last one.
      expect(mockCaptureFrame).not.toHaveBeenCalled();
    });
  });
});