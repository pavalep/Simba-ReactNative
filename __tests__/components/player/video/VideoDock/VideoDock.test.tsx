/**
 * V22 W22 (2026-10-21) — `VideoDock`, the video lane's mini presentation.
 *
 * It replaces the shared `MiniPlayer`, which took turns with the full
 * player. These tests pin the three properties that made that swap
 * possible to get right:
 *
 * ## 1. The hole and the rect are the SAME rectangle
 *
 * The bar is transparent for video and rebuilt from plates around a hole,
 * because the picture composites beneath the whole React tree: any opaque
 * pixel between the camera and the video hides it. So the hole and the rect
 * handed to the lane must be the same rectangle. Measuring the bar and the
 * slot in two separate passes can disagree during a rotation and put the
 * video beside its own hole — a failure no screenshot of the happy path
 * would show.
 *
 * ## 2. The dock is ALWAYS mounted
 *
 * That is the D9 property: the lane's tree is not torn down and rebuilt
 * when the presentation changes. A side effect that matters is that the
 * slot's rect is ALREADY published when the user taps minimise, so the
 * picture moves into the dock in the same commit that flips the
 * presentation — no frame of fullscreen video under a half-open dock.
 *
 * ## 3. The dock never renders a picture
 *
 * The lib's `attachSurfaceLocked` rebinds the mpv surface on every
 * `setNativePtr`, so a SECOND `<SimbaVideo>` would steal the surface from
 * the first. The dock renders a hole, never a view.
 */

import React from 'react';
import {View} from 'react-native';
import {
  render,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react-native';
import {VideoDock} from '../../../../../src/components/player/video/VideoDock/VideoDock';
import {ThemeProvider} from '../../../../../src/theme';
import {useNowPlayingStore} from '../../../../../src/state/nowPlayingStore';
import {usePresentationStore} from '../../../../../src/state/usePresentationStore';

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

const mockToastShow = jest.fn();

jest.mock('../../../../../src/components/feedback/Toast', () => ({
  useToast: () => ({show: mockToastShow, hide: jest.fn()}),
}));

const mockStopPlayback = jest.fn();

jest.mock('@simba-dev/react-native-media-player', () => {
  const actual = jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    getMpvPlayerModule: () => ({
      stopPlayback: mockStopPlayback,
    }),
  };
});

// Only `useTransport` is stubbed. `usePresentation` is the REAL hook over
// the real store, so these tests exercise the actual derivation rather than
// asserting that a mock was called — a mocked setter would pass even if the
// store write were dropped on the way out.
jest.mock('../../../../../src/infrastructure/player', () => ({
  useTransport: () => mockTransport,
  usePresentation: jest.requireActual(
    '../../../../../src/infrastructure/player/usePresentation',
  ).usePresentation,
  // `PlayerControl` (the play/pause + close buttons) pulls `useHaptic`
  // from the same barrel, so replacing the module wholesale would leave
  // the real button unable to render.
  useHaptic: jest.requireActual(
    '../../../../../src/infrastructure/player/useHaptic',
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

async function renderDock() {
  measureIndex = 0;
  return render(
    <ThemeProvider>
      <VideoDock />
    </ThemeProvider>,
  );
}

describe('VideoDock', () => {
  beforeEach(() => {
    // Installed for the WHOLE test, not just the render: the rotation test
    // fires a layout event after mounting, and re-measuring is the
    // behaviour under test. Tearing the stub down at the end of `render`
    // would leave that event calling nothing — the test would then be
    // asserting that a no-op did not happen.
    restoreMeasure = stubMeasureInWindow();
    mockTransport.commands.togglePlayPause.mockClear();
    mockStopPlayback.mockReset();
    mockToastShow.mockReset();
    useNowPlayingStore.getState().reset();
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

  // ── geometry ─────────────────────────────────────────────────────────

  it('publishes the slot rect in WINDOW pixels', async () => {
    // The lane positions the picture from this rect, so it must be the
    // bar's own position NOT subtracted: the lane does that translation.
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

    const slot = getByTestId('video-dock-slot');
    const flat = Object.assign({}, ...[slot.props.style].flat(Infinity));
    expect(flat.backgroundColor).toBeUndefined();
  });

  it('renders the bar transparent for video', async () => {
    startVideoSession();
    const {getByTestId} = await renderDock();

    const flat = Object.assign(
      {},
      ...[getByTestId('video-dock').props.style].flat(Infinity),
    );
    expect(flat.backgroundColor).toBeUndefined();
  });

  it('ignores a zero-size measurement instead of publishing an unusable rect', async () => {
    // "Not laid out yet" reports as 0x0. Publishing it would make the
    // picture an invalid render target, and the refusal would describe a
    // layout bug that does not exist.
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
      fireEvent(getByTestId('video-dock'), 'layout', {
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

  // ── D9: one mounted tree ─────────────────────────────────────────────

  it('is mounted in the EXPANDED presentation too, and still publishes the slot', async () => {
    // This is the property that removes the flash on minimise. The dock is
    // always laid out, so the rect the lane needs to move the picture is
    // already published before the user taps anything.
    startVideoSession();
    usePresentationStore.setState({videoPresentation: 'expanded'});

    await renderDock();

    await waitFor(() =>
      expect(usePresentationStore.getState().videoMiniRect).toEqual(SLOT),
    );
  });

  it('is invisible and untouchable while the player is expanded', async () => {
    // An invisible bar sitting over the bottom of the window must not
    // swallow a tap meant for the transport bar underneath it.
    startVideoSession();
    usePresentationStore.setState({videoPresentation: 'expanded'});

    const {getByTestId} = await renderDock();

    expect(getByTestId('video-dock').props.pointerEvents).toBe('none');
  });

  it('never renders a picture — the surface must stay bound to one view', async () => {
    // The lib rebinds the mpv surface on every `setNativePtr`, so a second
    // `<SimbaVideo>` would steal it from the first. The dock renders a
    // HOLE, never a view.
    startVideoSession();
    const {toJSON} = await renderDock();

    // `toJSON()` is the HOST tree, so the native view's own type name is
    // what appears — which is exactly the thing that must not be here.
    expect(JSON.stringify(toJSON())).not.toContain('SimbaVideo');
  });

  // ── verbs ────────────────────────────────────────────────────────────

  it('expands the video presentation when the title is tapped', async () => {
    startVideoSession();
    const {getByLabelText} = await renderDock();

    await act(async () => {
      fireEvent.press(getByLabelText('Open player for Namus Kanla Yazilir'));
    });

    expect(usePresentationStore.getState().videoPresentation).toBe('expanded');
  });

  it('toggles play/pause from the dock', async () => {
    startVideoSession();
    const {getByTestId} = await renderDock();

    await act(async () => {
      fireEvent.press(getByTestId('video-dock-playpause'));
    });

    expect(mockTransport.commands.togglePlayPause).toHaveBeenCalledTimes(1);
  });

  it('closes through the real teardown, not the lib stop command', async () => {
    startVideoSession();
    const {getByTestId} = await renderDock();

    await act(async () => {
      fireEvent.press(getByTestId('video-dock-close'));
    });

    expect(mockStopPlayback).toHaveBeenCalledTimes(1);
    expect(useNowPlayingStore.getState().current).toBeNull();
  });

  it('keeps the player up and reports the error when the native stop fails', async () => {
    startVideoSession();
    mockStopPlayback.mockImplementation(() => {
      throw new Error('service refused to stop');
    });
    const {getByTestId} = await renderDock();

    await act(async () => {
      fireEvent.press(getByTestId('video-dock-close'));
    });

    expect(useNowPlayingStore.getState().current).not.toBeNull();
    expect(mockToastShow).toHaveBeenCalledWith(
      'service refused to stop',
      'error',
    );
  });
});
