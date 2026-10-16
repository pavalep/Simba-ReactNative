/**
 * V21 F4 — `MiniPlayer`, the shared dock for both lanes.
 *
 * ## The property under test
 *
 * The bar is transparent for video and rebuilt from plates around a hole,
 * because the `SurfaceView` composites beneath the whole React tree: any
 * opaque pixel between the camera and the video hides it. So the hole and
 * the rect handed to `setVideoBounds` must be the SAME rectangle.
 *
 * That is what these tests protect. Measuring the bar and the slot in two
 * separate passes can disagree during a rotation and put the video beside
 * its own hole — a failure no screenshot of the happy path would show.
 */

import React from 'react';
import {View} from 'react-native';
import {render, fireEvent, act, waitFor, cleanup} from '@testing-library/react-native';
import {MiniPlayer} from '../../../../src/components/player/mini/MiniPlayer';
import {ThemeProvider} from '../../../../src/theme';
import {useNowPlayingStore} from '../../../../src/state/nowPlayingStore';
import {useAudioPresentationStore} from '../../../../src/state/useAudioPresentationStore';
import {usePresentationStore} from '../../../../src/state/usePresentationStore';

type MeasureCallback = (
  x: number,
  y: number,
  width: number,
  height: number,
) => void;
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BAR: Rect = {x: 0, y: 2400, width: 1080, height: 120};
const SLOT: Rect = {x: 16, y: 2438, width: 44, height: 44};

const mockTransport = {
  state: {
    title: 'Track Title',
    artist: 'Some Artist',
    durationMs: 200_000,
    positionMs: 50_000,
    isPlaying: true,
    isOrientationLocked: false,
    volume: 1,
    isMuted: false,
    queueLength: 0,
  },
  commands: {
    togglePlayPause: jest.fn(),
    stopPlayback: jest.fn(),
    exitPipAndFinish: jest.fn(),
    setOrientationLock: jest.fn(),
  },
};

// Only `useTransport` is stubbed. `usePresentation` is the REAL hook over
// the real store, so these tests exercise the actual derivation rather than
// asserting that a mock was called — a mocked setter would pass even if the
// store write were dropped on the way out.
jest.mock('../../../../src/infrastructure/player', () => ({
  useTransport: () => mockTransport,
  usePresentation: jest.requireActual(
    '../../../../src/infrastructure/player/usePresentation',
  ).usePresentation,
  // `PlayerControl` (the play/pause + close buttons) pulls `useHaptic`
  // from the same barrel, so replacing the module wholesale would leave
  // the real button unable to render.
  useHaptic: jest.requireActual(
    '../../../../src/infrastructure/player/useHaptic',
  ).useHaptic,
}));

function startVideoSession() {
  useNowPlayingStore.getState().begin({
    uri: 'file:///movies/film.mkv',
    title: 'Namus Kanla Yazilir',
    startPositionMs: 0,
    streamType: 'video',
    type: 'movie',
    mediaLane: 'video',
  });
}

function startAudioSession() {
  useNowPlayingStore.getState().begin({
    uri: 'file:///podcasts/can-ai.mp3',
    title: 'Track Title',
    startPositionMs: 0,
    streamType: 'audio',
    type: 'podcast',
    mediaLane: 'audio',
    thumbnailPath: 'file:///art.jpg',
  });
}

/**
 * `measureInWindow` is a host method RNTL does not implement, so it is
 * stubbed for the duration of each render.
 *
 * The hook measures the bar first and the slot second, once per pass, so
 * alternating the answer by call index reproduces the real two-node
 * measurement. Resetting the index per pass keeps rotation re-runs
 * deterministic.
 */
let measureIndex = 0;
let measureRects: Rect[] = [BAR, SLOT];
let restoreMeasure: (() => void) | null = null;

function stubMeasureInWindow() {
  const holder = View as unknown as {prototype: Record<string, unknown>};
  const original = holder.prototype.measureInWindow;
  holder.prototype.measureInWindow = function measure(
    this: unknown,
    cb: MeasureCallback,
  ) {
    const rect = measureRects[measureIndex % measureRects.length]!;
    measureIndex += 1;
    cb(rect.x, rect.y, rect.width, rect.height);
  };
  return () => {
    holder.prototype.measureInWindow = original;
  };
}

async function renderDock(onClose: () => void = jest.fn()) {
  measureIndex = 0;
  return render(
    <ThemeProvider>
      <MiniPlayer onClose={onClose} />
    </ThemeProvider>,
  );
}

describe('MiniPlayer', () => {
  beforeEach(() => {
    // Installed for the WHOLE test, not just the render: the rotation test
    // fires a layout event after mounting, and re-measuring is the
    // behaviour under test. Tearing the stub down at the end of `render`
    // would leave that event calling nothing — the test would then be
    // asserting that a no-op did not happen.
    restoreMeasure = stubMeasureInWindow();
    mockTransport.commands.togglePlayPause.mockClear();
    useNowPlayingStore.getState().reset();
    useAudioPresentationStore.setState({mode: 'mini'});
    usePresentationStore.setState({
      videoPresentation: 'mini',
      videoMiniRect: null,
    });
  });

  afterEach(() => {
    restoreMeasure?.();
    restoreMeasure = null;
    measureRects = [BAR, SLOT];
  });

  // ── audio lane ──────────────────────────────────────────────────────

  it('renders artwork, not a video slot, for the audio lane', async () => {
    startAudioSession();
    const {queryByTestId} = await renderDock();

    expect(queryByTestId('mini-video-slot')).toBeNull();
    expect(queryByTestId('mini-player')).not.toBeNull();
  });

  it('publishes no video rect for the audio lane', async () => {
    // A stale rect would be consumed by a later video session's first
    // render, before that session's own dock had measured anything.
    startAudioSession();
    await renderDock();

    expect(usePresentationStore.getState().videoMiniRect).toBeNull();
  });

  it('expands audio through the audio presentation store', async () => {
    startAudioSession();
    const {getByLabelText} = await renderDock();

    await act(async () => {
      fireEvent.press(getByLabelText('Open player for Track Title'));
    });

    expect(useAudioPresentationStore.getState().mode).toBe('expanded');
  });

  // ── video lane ──────────────────────────────────────────────────────

  it('publishes the slot rect in WINDOW pixels', async () => {
    // `setVideoBounds` takes window pixels, so this is a pass-through: the
    // bar's own position must NOT be subtracted here.
    startVideoSession();
    await renderDock();

    await waitFor(() =>
      expect(usePresentationStore.getState().videoMiniRect).toEqual(SLOT),
    );
  });

  it('leaves the hole transparent — no background, no children', async () => {
    // Any fill here hides the frame completely. The plates exist precisely
    // so this rectangle is a hole.
    startVideoSession();
    const {getByTestId} = await renderDock();

    const slot = getByTestId('mini-video-slot');
    const flat = Object.assign({}, ...[slot.props.style].flat(Infinity));
    expect(flat.backgroundColor).toBeUndefined();
  });

  it('renders the bar transparent for video and opaque for audio', async () => {
    startVideoSession();
    const video = await renderDock();
    const videoFlat = Object.assign(
      {},
      ...[video.getByTestId('mini-player').props.style].flat(Infinity),
    );

    startAudioSession();
    const audio = await renderDock();
    const audioFlat = Object.assign(
      {},
      ...[audio.getByTestId('mini-player').props.style].flat(Infinity),
    );

    expect(videoFlat.backgroundColor).toBeUndefined();
    expect(audioFlat.backgroundColor).toBeDefined();
  });

  it('expands video by asking for the expanded presentation', async () => {
    startVideoSession();
    const {getByLabelText} = await renderDock();

    await act(async () => {
      fireEvent.press(getByLabelText('Open player for Namus Kanla Yazilir'));
    });

    expect(usePresentationStore.getState().videoPresentation).toBe('expanded');
  });

  // ── shared controls ─────────────────────────────────────────────────

  it('runs the same close verb for both lanes', async () => {
    const onClose = jest.fn();
    startVideoSession();
    const video = await renderDock(onClose);
    await act(async () => {
      fireEvent.press(video.getByTestId('mini-close'));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    startAudioSession();
    const audio = await renderDock(onClose);
    await act(async () => {
      fireEvent.press(audio.getByTestId('mini-close'));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps one play/pause control for both lanes', async () => {
    startVideoSession();
    const video = await renderDock();
    await act(async () => {
      fireEvent.press(video.getByTestId('mini-playpause'));
    });

    startAudioSession();
    const audio = await renderDock();
    await act(async () => {
      fireEvent.press(audio.getByTestId('mini-playpause'));
    });

    expect(mockTransport.commands.togglePlayPause).toHaveBeenCalledTimes(2);
  });

  // ── measurement hygiene ─────────────────────────────────────────────

  it('re-publishes when the bar re-lays out, which is what rotation does', async () => {
    // The bar is `left: 0, right: 0`, so its width changes on rotation.
    // The SLOT is a fixed-size square whose own layout does not change, so
    // watching the slot's onLayout would never fire — the surface would
    // stay at portrait coordinates.
    startVideoSession();
    const {getByTestId} = await renderDock();
    await waitFor(() =>
      expect(usePresentationStore.getState().videoMiniRect).toEqual(SLOT),
    );

    const landscapeBar: Rect = {x: 0, y: 900, width: 2400, height: 140};
    const landscapeSlot: Rect = {x: 24, y: 948, width: 44, height: 44};
    measureRects = [landscapeBar, landscapeSlot];
    measureIndex = 0;

    await act(async () => {
      fireEvent(getByTestId('mini-player'), 'layout', {
        nativeEvent: {layout: {x: 0, y: 900, width: 2400, height: 140}},
      });
    });

    await waitFor(() =>
      expect(usePresentationStore.getState().videoMiniRect).toEqual(
        landscapeSlot,
      ),
    );
    measureRects = [BAR, SLOT];
  });

  it('ignores a zero-size measurement instead of publishing an unusable rect', async () => {
    // "Not laid out yet" reports as 0x0. Publishing it would make
    // `setVideoBounds` refuse, and the refusal log would describe a layout
    // bug that does not exist.
    startVideoSession();
    measureRects = [
      {x: 0, y: 0, width: 0, height: 0},
      {x: 0, y: 0, width: 0, height: 0},
    ];
    measureIndex = 0;

    await renderDock();

    expect(usePresentationStore.getState().videoMiniRect).toBeNull();
    measureRects = [BAR, SLOT];
  });
});