/// <reference types="node" />
/**
 * V19 W-DEFECT-2 — `VideoTitleOverlay` unit tests.
 *
 * The file used to be `export const VideoTitleOverlay = () => null`
 * while still being mounted in the live chrome
 * (`SimbaPlayer/ExpandedChrome`), so the player showed no title at
 * all. These tests pin the behaviour that replaced the stub:
 *
 *   - renders the title from `useTransport().state.title` (the value
 *     the facade already exposed — no new data source)
 *   - renders the artist line when, and only when, one exists
 *   - renders NOTHING when there is no metadata, rather than a
 *     placeholder string
 *   - carries an a11y role/label and a sibling-consistent testID
 *   - does NOT own a visibility system: it has no timer and no
 *     `useChromeAutoHide` call, because `ChromeAutoHideController` is
 *     the single owner of chrome opacity
 *   - collapses its entrance animation under the OS reduce-motion
 *     flag (WCAG 2.3.3), the same convention
 *     `VerticalSwipeGestures` uses
 */

import * as React from 'react';
import {Animated} from 'react-native';
import {render} from '@testing-library/react-native';
import {renderChrome} from '../../../../helpers/renderChrome';
import {
  makeTransportState,
  makeTransportCommands,
} from '../../../../helpers/transportState';
import type {TransportState} from '../../../../../src/infrastructure/player';
import {VideoTitleOverlay} from '../../../../../src/components/player/video/VideoTitleOverlay/VideoTitleOverlay';

// ── Theme: real dark palette (the app's default lane) ──────────────────
jest.mock('../../../../../src/theme', () => {
  const actual = jest.requireActual('../../../../../src/theme/tokens');
  const tokens = actual.darkTokens;
  return {
    useTheme: () => ({
      theme: 'dark',
      tokens,
      colors: tokens.colors,
      legacy: actual.legacyFromTokens(tokens),
      spacing: tokens.spacing,
      typography: tokens.typography,
      shadows: tokens.darkShadows,
      radius: tokens.radius,
      motion: tokens.motion,
      isDark: true,
      setTheme: jest.fn(),
      themeMode: 'dark',
    }),
  };
});

// ── Player facade ───────────────────────────────────────────────────────
let mockTransport: {
  state: TransportState;
  commands: ReturnType<typeof makeTransportCommands>;
} = {
  state: makeTransportState(),
  commands: makeTransportCommands(),
};

/** Flipped per test to exercise the reduce-motion branch. */
let mockReduceMotion = false;
/** Records any auto-hide call, so the test can prove there is none. */
const mockChromeAutoHide = {
  toggle: jest.fn(),
  kick: jest.fn(),
  setVisible: jest.fn(),
};

jest.mock('../../../../../src/infrastructure/player', () => {
  const actual = {
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useTransport',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useHaptic',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/usePresentation',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/usePlaybackState',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useKeyframes',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useSkipSilence',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useChromeAutoHide',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/position',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/streamErrors',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/bridgeErrors',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/resumePolicy',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/validateLane',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/playbackFacade',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/video',
    ),
  };
  return {
    ...actual,
    useTransport: () => mockTransport,
    useReduceMotion: () => mockReduceMotion,
    useChromeAutoHide: () => mockChromeAutoHide,
  };
});

describe('VideoTitleOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReduceMotion = false;
    mockTransport.state = makeTransportState();
    mockTransport.commands = makeTransportCommands();
  });

  it('renders the title from the transport state', async () => {
    mockTransport.state = makeTransportState({
      title: 'A Documentary About Concrete',
    });
    const {getByText} = await renderChrome(<VideoTitleOverlay />);
    expect(getByText('A Documentary About Concrete')).toBeTruthy();
  });

  it('renders the artist beneath the title when one exists', async () => {
    mockTransport.state = makeTransportState({
      title: 'A Documentary About Concrete',
      artist: 'Some Channel',
    });
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    expect(getByTestId('video-title-overlay-artist')).toBeTruthy();
  });

  it('omits the artist row entirely when there is no artist', async () => {
    mockTransport.state = makeTransportState({title: 'Untitled Clip'});
    const {queryByTestId} = await renderChrome(<VideoTitleOverlay />);
    expect(queryByTestId('video-title-overlay-artist')).toBeNull();
  });

  it('renders nothing when the transport carries no title', async () => {
    // The stub's `return null` is preserved for this case on purpose:
    // a placeholder ("Unknown title") would be a claim about data the
    // app does not have.
    mockTransport.state = makeTransportState({title: '', artist: ''});
    const {toJSON} = await renderChrome(<VideoTitleOverlay />);
    expect(toJSON()).toBeNull();
  });

  it('treats a whitespace-only title as no title', async () => {
    mockTransport.state = makeTransportState({title: '   ', artist: 'X'});
    const {toJSON} = await renderChrome(<VideoTitleOverlay />);
    expect(toJSON()).toBeNull();
  });

  it('exposes a header role and a state-aware accessibility label', async () => {
    mockTransport.state = makeTransportState({
      title: 'A Documentary About Concrete',
    });
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    const node = getByTestId('video-title-overlay');
    expect(node.props.accessibilityRole).toBe('header');
    expect(node.props.accessibilityLabel).toBe(
      'Now playing: A Documentary About Concrete',
    );
  });

  it('includes the artist in the accessibility label when present', async () => {
    mockTransport.state = makeTransportState({
      title: 'Clip',
      artist: 'Channel',
    });
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    expect(getByTestId('video-title-overlay').props.accessibilityLabel).toBe(
      'Now playing: Clip. Channel',
    );
  });

  it('never swallows a tap meant for the surface beneath it', async () => {
    // The overlay is mounted OVER the video surface, which owns the
    // tap that toggles the chrome. A chrome that eats that tap is
    // the "invisible dead zone" defect, so it must stay transparent
    // to touches.
    mockTransport.state = makeTransportState({title: 'Clip'});
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    expect(getByTestId('video-title-overlay').props.pointerEvents).toBe('none');
  });

  it('truncates the title rather than growing the top bar', async () => {
    mockTransport.state = makeTransportState({
      title: 'An extremely long episode title that would otherwise push the row off-screen',
    });
    const {getByText} = await renderChrome(<VideoTitleOverlay />);
    expect(getByText(/extremely long episode title/).props.numberOfLines).toBe(1);
  });

  it('does NOT create a second visibility system', async () => {
    // `ChromeAutoHideController` already fades this subtree; a local
    // timer here would be the competing visibility state the
    // controller was introduced to eliminate. Nothing in the overlay
    // may call the auto-hide surface.
    mockTransport.state = makeTransportState({title: 'Clip'});
    await renderChrome(<VideoTitleOverlay />);
    expect(mockChromeAutoHide.toggle).not.toHaveBeenCalled();
    expect(mockChromeAutoHide.kick).not.toHaveBeenCalled();
    expect(mockChromeAutoHide.setVisible).not.toHaveBeenCalled();
  });

  it('re-renders the new title when the transport moves to the next item', async () => {
    mockTransport.state = makeTransportState({title: 'First'});
    const {getByText, queryByText, rerender, unmount} = await renderChrome(
      <VideoTitleOverlay />,
    );
    expect(getByText('First')).toBeTruthy();

    mockTransport.state = makeTransportState({title: 'Second'});
    await rerender(<VideoTitleOverlay />);

    expect(getByText('Second')).toBeTruthy();
    expect(queryByText('First')).toBeNull();
    await unmount();
  });

  it('honours the OS reduce-motion flag (animation duration 0)', async () => {
    // Sibling convention (`VerticalSwipeGestures`' `useFadingOpacity`):
    // reduce-motion collapses the duration to 0 ms rather than
    // removing the element, so the rendered output is identical and
    // only the animation is suppressed.
    const timings: number[] = [];
    const spy = jest
      .spyOn(Animated, 'timing')
      .mockImplementation((value, config) => {
        timings.push(config.duration ?? -1);
        // Return the shape `Animated.parallel` consumes without
        // driving a real native animation under jest.
        return {start: jest.fn(), stop: jest.fn(), reset: jest.fn()} as never;
      });

    mockReduceMotion = true;
    mockTransport.state = makeTransportState({title: 'Clip'});
    const {getByText, unmount} = await renderChrome(<VideoTitleOverlay />);

    expect(getByText('Clip')).toBeTruthy();
    // `toContain` rather than `every`: the tree this renders inside
    // (`renderChrome` wraps a `ToastProvider`) runs its own
    // `Animated.timing` calls, so the recorded list is not exclusively
    // the overlay's. What matters is that the overlay contributed a
    // 0 ms timing — the collapse — and nothing about its own output
    // changes.
    expect(timings).toContain(0);

    spy.mockRestore();
    await unmount();
  });

  it('animates over a non-zero duration when reduce-motion is off', async () => {
    const timings: number[] = [];
    const spy = jest
      .spyOn(Animated, 'timing')
      .mockImplementation((value, config) => {
        timings.push(config.duration ?? -1);
        return {start: jest.fn(), stop: jest.fn(), reset: jest.fn()} as never;
      });

    mockReduceMotion = false;
    mockTransport.state = makeTransportState({title: 'Clip'});
    const {unmount} = await renderChrome(<VideoTitleOverlay />);

    expect(timings.length).toBeGreaterThan(0);
    // The entrance fade the component declares (FADE_IN_MS = 180). A
    // non-zero duration is what "reduce-motion is OFF" means here.
    expect(timings).toContain(180);

    spy.mockRestore();
    await unmount();
  });
});
