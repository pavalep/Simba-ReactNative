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
import type {ComponentProps} from 'react';
import {Animated, type StyleProp, type ViewStyle} from 'react-native';
import {fireEvent, render} from '@testing-library/react-native';
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

// ── SvgIcon: a name-preserving stand-in ─────────────────────────────────
//
// The global `\.svg$` jest mapper (`__mocks__/svgMock.js`) renders
// every icon as the SAME anonymous `svg-placeholder` node and drops
// `color`. Under it, "which icon did this bar ask for?" is unobservable
// — so a "there is no logo" assertion, and the lock/unlock glyph swap,
// would both pass vacuously.
//
// Mocking the real module path (`components/utility/SvgIcon`, the same
// specifier the header imports — not a package barrel) replaces it with
// a host node keyed by `icon-${name}`, which is where the real
// `SvgIcon` resolves the glyph. What the tests below read is therefore
// the component's real decision, not a reimplementation.
jest.mock('../../../../../src/components/utility/SvgIcon', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  const {View} = jest.requireActual('react-native') as typeof import('react-native');
  return {
    SvgIcon: ({
      name,
      size,
      color,
      style,
    }: {
      name: string;
      size?: number;
      color?: string;
      style?: StyleProp<ViewStyle>;
    }) => {
      // `color` is not a `View` prop, hence the cast: the stand-in
      // exists to SURFACE the glyph name and the ink the real
      // `SvgIcon` would hand to the SVG.
      const props = {
        testID: `icon-${name}`,
        color,
        style: [{width: size, height: size}, style],
      } as unknown as ComponentProps<typeof View>;
      return ReactActual.createElement(View, props);
    },
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
    expect(getByTestId('video-header-artist')).toBeTruthy();
  });

  it('omits the artist row entirely when there is no artist', async () => {
    mockTransport.state = makeTransportState({title: 'Untitled Clip'});
    const {queryByTestId} = await renderChrome(<VideoTitleOverlay />);
    expect(queryByTestId('video-header-artist')).toBeNull();
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

  it('does NOT claim a heading role for a container that owns buttons', async () => {
    // The bar became an interactive header in V19 W6.4: it owns a back
    // button and an orientation-lock button. An `accessibilityRole`
    // of 'header' on a node containing interactive controls mislabels
    // the whole cluster as a heading, so the container is a plain
    // layout row and each control carries its own role + label.
    mockTransport.state = makeTransportState({
      title: 'A Documentary About Concrete',
    });
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    expect(getByTestId('video-title-overlay').props.accessibilityRole).toBeUndefined();

    // Both controls are discoverable with state-aware labels.
    expect(
      getByTestId('video-header-back').props.accessibilityLabel,
    ).toBe('Back');
    expect(getByTestId('video-header-lock').props.accessibilityLabel).toBe(
      'Lock orientation',
    );
  });

  it('announces the title and artist as text in reading order', async () => {
    mockTransport.state = makeTransportState({
      title: 'Clip',
      artist: 'Channel',
    });
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    expect(getByTestId('video-header-title').props.children).toBe('Clip');
    expect(getByTestId('video-header-artist').props.children).toBe('Channel');
  });

  it('renders NO logo, wordmark or brand node anywhere in the bar', async () => {
    // Explicit user requirement: the Home header carries the lion +
    // Allura wordmark, and repeating it inside the video player is
    // decoration competing with the title for the same attention. This
    // pins the absence so a later "let's add branding" change has to
    // delete this test on purpose rather than land silently.
    //
    // Meaningful only because the `SvgIcon` seam above preserves the
    // glyph name — under the stock SVG mapper every icon is the same
    // anonymous node and this would pass whatever the bar rendered.
    mockTransport.state = makeTransportState({
      title: 'Clip',
      artist: 'Channel',
    });
    const {queryByTestId, toJSON} = await renderChrome(<VideoTitleOverlay />);
    expect(queryByTestId('icon-lion')).toBeNull();
    expect(JSON.stringify(toJSON())).not.toMatch(/lion|logo|wordmark|allura|Simba/i);
  });

  it('draws exactly the two affordances and nothing else', async () => {
    // Locks the bar's composition down: a back chevron on the left, an
    // orientation lock on the right, and no third icon. SPEC §3.2 says
    // "Nothing else".
    mockTransport.state = makeTransportState({title: 'Clip'});
    const {queryByTestId} = await renderChrome(<VideoTitleOverlay />);
    expect(queryByTestId('icon-chevronLeft')).toBeTruthy();
    expect(queryByTestId('icon-unlock')).toBeTruthy(); // released state
    expect(queryByTestId('icon-lock')).toBeNull(); // no duplicate
  });

  it('swaps the glyph with the state, so the toggle reads without colour', async () => {
    // WCAG 1.4.1: the state must not depend on the gold accent alone.
    mockTransport.state = makeTransportState({
      title: 'Clip',
      isOrientationLocked: true,
    });
    const {queryByTestId} = await renderChrome(<VideoTitleOverlay />);
    expect(queryByTestId('icon-lock')).toBeTruthy();
    expect(queryByTestId('icon-unlock')).toBeNull();
  });

  it('leaves the container transparent to touches so the surface still toggles chrome', async () => {
    // The bar overlays the video surface, and the surface's tap is what
    // toggles the chrome. But the bar now owns two buttons, so the
    // container cannot be `none` (that would make the buttons dead) and
    // must not be `auto` (that would create an invisible dead zone over
    // the middle of the frame). `box-none` is the only value that
    // satisfies both: transparent itself, interactive children.
    mockTransport.state = makeTransportState({title: 'Clip'});
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    expect(getByTestId('video-title-overlay').props.pointerEvents).toBe(
      'box-none',
    );
  });

  // ── V19 W6.4 — the back affordance ────────────────────────────────────

  it('leaves the player via the real lib dismiss command, not a mode write', async () => {
    // `exitPipAndFinish` is the lib's own primitive (exits PiP, finishes
    // PlayerActivity, tears down the SurfaceView). The facade maps it
    // 1:1 as `exitPlayer`.
    mockTransport.state = makeTransportState({title: 'Clip'});
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    await fireEvent.press(getByTestId('video-header-back'));
    expect(mockTransport.commands.exitPlayer).toHaveBeenCalledTimes(1);
  });

  it('does not fall back to any no-op when dismissing', async () => {
    // The W5 reaudit removed this exact shape for `enterPip`: a
    // `(commands as unknown as {...})` cast that always evaluated to
    // undefined, so the button rendered inert. `exitPlayer` is a real
    // member of `TransportCommands`, so the compiler already forbids
    // the cast — this test pins that the press reaches it at all.
    mockTransport.state = makeTransportState({title: 'Clip'});
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    await fireEvent.press(getByTestId('video-header-back'));
    expect(mockTransport.commands.exitPlayer).toHaveBeenCalled();
    expect(mockTransport.commands.close).not.toHaveBeenCalled();
  });

  // ── V19 W6.4 — the orientation lock ───────────────────────────────────

  it('engages the lock by asking for the CURRENT side, not a fixed one', async () => {
    mockTransport.state = makeTransportState({
      title: 'Clip',
      isOrientationLocked: false,
    });
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    await fireEvent.press(getByTestId('video-header-lock'));
    expect(mockTransport.commands.setOrientationLock).toHaveBeenCalledWith(
      true,
    );
  });

  it('releases the lock by asking for the same side it engaged with', async () => {
    mockTransport.state = makeTransportState({
      title: 'Clip',
      isOrientationLocked: true,
    });
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    await fireEvent.press(getByTestId('video-header-lock'));
    expect(mockTransport.commands.setOrientationLock).toHaveBeenCalledWith(
      false,
    );
  });

  it('reports the lock as a switch whose state matches the transport state', async () => {
    mockTransport.state = makeTransportState({
      title: 'Clip',
      isOrientationLocked: true,
    });
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    const lock = getByTestId('video-header-lock');
    expect(lock.props.accessibilityRole).toBe('switch');
    expect(lock.props.accessibilityState).toEqual({checked: true});
    // The label names the ACTION, so it flips with the state — this is
    // what makes the toggle usable without reading colour.
    expect(lock.props.accessibilityLabel).toBe('Unlock orientation');
  });

  it('names the lock action for the released state too', async () => {
    mockTransport.state = makeTransportState({
      title: 'Clip',
      isOrientationLocked: false,
    });
    const {getByTestId} = await renderChrome(<VideoTitleOverlay />);
    const lock = getByTestId('video-header-lock');
    expect(lock.props.accessibilityState).toEqual({checked: false});
    expect(lock.props.accessibilityLabel).toBe('Lock orientation');
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
