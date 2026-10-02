// ─── VerticalSwipeGestures — worklet runtime contract + wiring ───────────
//
// Regression origin: the Worklets Babel plugin (required by Reanimated 4)
// auto-workletizes callbacks passed INLINE in a gesture configuration
// chain. Every handler in `VerticalSwipeGestures` is exactly that shape,
// so all four gestures were executing on the UI runtime while calling
// JS-thread-only things — the mpv bridge, React `setState`, `setTimeout`:
//
//   Uncaught Error: [Worklets] Tried to synchronously call a Remote
//   Function. Called "setSpeed" on the UI Runtime.
//
// That aborts each handler mid-gesture, so brightness swipe, volume
// swipe, double-tap ±10s, long-press 2× and the single-tap chrome toggle
// were all throwing instead of working.
//
// `runOnJS(true)` is the documented switch (see the installed RNGH
// typings on `BaseGesture.runOnJS`). The FIRST test in this file is the
// regression guard: it fails loudly if anyone removes it.
//
// The gesture-handler module is replaced with a recorder, because the real
// one needs a native module. Each builder records its chained calls and
// keeps the handler callbacks so the tests can fire them directly —
// which is the point: a handler nobody ever invokes is a handler nobody
// knows is broken.

interface GestureRecord {
  kind: string;
  log: string[];
  handlers: Record<string, (event: unknown) => void>;
  /** Present only on `Exclusive`: the `__kind` of each member, in order. */
  members?: string[];
}

const mockCreated: GestureRecord[] = [];

jest.mock('react-native-gesture-handler', () => {
  const HANDLER_METHODS = [
    'onBegin',
    'onStart',
    'onUpdate',
    'onEnd',
    'onFinalize',
  ];
  const CONFIG_METHODS = [
    'activeOffsetY',
    'failOffsetX',
    'enabled',
    'runOnJS',
    'numberOfTaps',
    'maxDelay',
    'maxDuration',
    'minDuration',
  ];

  const create = (kind: string, members?: string[]) => {
    const rec: GestureRecord = {kind, log: [], handlers: {}, members};
    mockCreated.push(rec);

    const api: Record<string, unknown> = {
      __kind: kind,
      toGestureArray: () => [api],
    };

    HANDLER_METHODS.forEach(name => {
      api[name] = (cb: (event: unknown) => void) => {
        rec.handlers[name] = cb;
        rec.log.push(name);
        return api;
      };
    });

    CONFIG_METHODS.forEach(name => {
      api[name] = (arg: unknown) => {
        rec.log.push(`${name}=${JSON.stringify(arg)}`);
        return api;
      };
    });

    return api;
  };

  return {
    Gesture: {
      Pan: () => create('Pan'),
      Tap: () => create('Tap'),
      LongPress: () => create('LongPress'),
      Exclusive: (...members: Array<{__kind: string}>) =>
        create(
          'Exclusive',
          members.map(m => m.__kind),
        ),
    },
    GestureDetector: ({children}: {children: React.ReactNode}) => children,
    GestureHandlerRootView: ({children}: {children: React.ReactNode}) =>
      children,
  };
});

/**
 * `useTheme` throws outside a `ThemeProvider`, and the indicator /
 * badge / ripple primitives inside this file read colour tokens through
 * it. The mock is built from the REAL `darkTokens` rather than a
 * hand-written colour stub: a partial stub silently breaks the moment a
 * nested consumer reads one token the test forgot to copy, and this
 * component tree has four nested consumers.
 */
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
      shadows: tokens.shadows,
      radius: tokens.radius,
      motion: tokens.motion,
      isDark: true,
      setTheme: jest.fn(),
      themeMode: 'dark',
    }),
  };
});

const mockCommands = {
  setSpeed: jest.fn(),
  setVolume: jest.fn(),
  setScreenBrightness: jest.fn(),
  seekBy: jest.fn(),
  getScreenBrightness: jest.fn(() => 0.5),
};

const mockTransportState = {speed: 1, volume: 80};
const mockToggle = jest.fn();
const mockKick = jest.fn();
const mockPresentationMode = {value: 'expanded'};

jest.mock('../../../../../src/infrastructure/player', () => ({
  useTransport: () => ({state: mockTransportState, commands: mockCommands}),
  useChromeAutoHide: () => ({toggle: mockToggle, kick: mockKick}),
  usePresentation: () => ({mode: mockPresentationMode.value}),
  useReduceMotion: () => false,
}));

import * as React from 'react';
import {render, act, screen, within} from '@testing-library/react-native';
import {Dimensions} from 'react-native';
import {VerticalSwipeGestures} from '../../../../../src/components/player/video/Gestures/VerticalSwipeGestures';

/** The real dark palette, for the colour assertion below. */
const {darkTokens} = jest.requireActual(
  '../../../../../src/theme/tokens',
) as typeof import('../../../../../src/theme/tokens');

/**
 * `AppText` composes its colour and typography into one style array,
 * so a single `{color}` read off `props.style` is undefined. Collapsing
 * the array is what the platform does at paint time.
 */
function flattenStyle(style: unknown): {color?: string} {
  const flat = (Array.isArray(style) ? style.flat(Infinity) : [style]).filter(
    Boolean,
  ) as Array<{color?: string}>;
  return Object.assign({}, ...flat) as {color?: string};
}

// The component seeds its frame from the window (see `windowFrame` in
// the component), so these are the numbers its pan maths actually uses.
const FRAME_WIDTH = Dimensions.get('window').width;
const FRAME_HEIGHT = Dimensions.get('window').height;
const LEFT_X = FRAME_WIDTH * 0.25;
const RIGHT_X = FRAME_WIDTH * 0.75;
// A drag of 10% of the frame height, upwards.
const DRAG_UP_10PCT = -FRAME_HEIGHT * 0.1;

/**
 * Render the component. No layout event is needed: the component seeds
 * its frame from `Dimensions.get('window')` so the left/right split is
 * correct from the first render (see the comment on `windowFrame`).
 */
async function renderGestures() {
  await render(<VerticalSwipeGestures onGesture={onGesture} />);
}

let onGesture: jest.Mock;

beforeEach(() => {
  mockCreated.length = 0;
  onGesture = jest.fn();
  Object.values(mockCommands).forEach(m =>
    typeof m === 'function' ? (m as jest.Mock).mockClear?.() : undefined,
  );
  mockToggle.mockClear();
  mockKick.mockClear();
  mockCommands.getScreenBrightness.mockReturnValue(0.5);
  mockTransportState.speed = 1;
  mockTransportState.volume = 80;
  mockPresentationMode.value = 'expanded';
});

/** The four leaf gestures, in the order the component creates them. */
function leafGestures(): GestureRecord[] {
  return mockCreated.filter(r => r.kind !== 'Exclusive');
}

function gestureOfKind(kind: string, occurrence = 0): GestureRecord {
  return mockCreated.filter(r => r.kind === kind)[occurrence];
}

// ─── The regression guard ────────────────────────────────────────────────

describe('worklet runtime contract', () => {
  it('runs EVERY gesture callback on the JS thread', async () => {
    await renderGestures();
    const leaves = leafGestures();
    // pan, doubleTap, longPress, singleTap
    expect(leaves).toHaveLength(4);

    // Reported as a LIST rather than a per-gesture `expect(cond, msg)`:
    // jest's `expect` takes one argument only, and a single failure diff
    // naming every offending gesture is more useful than the first one.
    const missing = leaves
      .filter(rec => !rec.log.includes('runOnJS=true'))
      .map(rec => rec.kind);
    expect(missing).toEqual([]);
  });

  it('composes all four gestures in Exclusive order', async () => {
    await renderGestures();
    const exclusive = mockCreated.find(r => r.kind === 'Exclusive');
    expect(exclusive).toBeDefined();
    // Gesture.Exclusive(longPress, doubleTap, pan, singleTap) — priority
    // order is the arbitration contract: long-press beats double-tap beats
    // pan beats single-tap. Reordering silently changes which gesture wins.
    expect(exclusive?.members).toEqual(['LongPress', 'Tap', 'Pan', 'Tap']);
  });

  it('registers a handler on every gesture it builds', async () => {
    // A gesture with no handlers is a gesture that cannot do anything —
    // the failure mode that hides until a user touches the screen.
    await renderGestures();
    for (const rec of leafGestures()) {
      expect(Object.keys(rec.handlers).length).toBeGreaterThan(0);
    }
  });
});

// ─── PAN — brightness (left) / volume (right) ────────────────────────────

describe('vertical pan', () => {
  it('sets screen brightness on the left half', async () => {
    await renderGestures();
    const pan = gestureOfKind('Pan');
    await act(async () => {
      pan.handlers.onBegin?.({});
      pan.handlers.onUpdate?.({x: LEFT_X, translationY: DRAG_UP_10PCT});
    });
    expect(mockCommands.setScreenBrightness).toHaveBeenCalled();
    expect(mockCommands.setVolume).not.toHaveBeenCalled();
    // Starts at 0.5 and dragging up 10% of the frame increases it.
    expect(mockCommands.setScreenBrightness).toHaveBeenLastCalledWith(
      expect.closeTo(0.6, 5),
    );
  });

  it('sets volume on the right half', async () => {
    await renderGestures();
    const pan = gestureOfKind('Pan');
    await act(async () => {
      pan.handlers.onBegin?.({});
      pan.handlers.onUpdate?.({x: RIGHT_X, translationY: DRAG_UP_10PCT});
    });
    expect(mockCommands.setVolume).toHaveBeenCalled();
    expect(mockCommands.setScreenBrightness).not.toHaveBeenCalled();
    // Starts from the transport's volume (80); +10% of frame height → 90.
    expect(mockCommands.setVolume).toHaveBeenLastCalledWith(
      expect.closeTo(90, 5),
    );
  });

  it('clamps brightness to 0..1 and volume to 0..100', async () => {
    await renderGestures();
    const pan = gestureOfKind('Pan');
    await act(async () => {
      pan.handlers.onBegin?.({});
      pan.handlers.onUpdate?.({x: LEFT_X, translationY: -FRAME_HEIGHT * 10});
    });
    expect(mockCommands.setScreenBrightness).toHaveBeenLastCalledWith(1);

    await act(async () => {
      pan.handlers.onBegin?.({});
      pan.handlers.onUpdate?.({x: RIGHT_X, translationY: -FRAME_HEIGHT * 10});
    });
    expect(mockCommands.setVolume).toHaveBeenLastCalledWith(100);

    await act(async () => {
      pan.handlers.onBegin?.({});
      pan.handlers.onUpdate?.({x: RIGHT_X, translationY: FRAME_HEIGHT * 10});
    });
    expect(mockCommands.setVolume).toHaveBeenLastCalledWith(0);
  });

  it('re-shows the chrome after any interaction', async () => {
    await renderGestures();
    const pan = gestureOfKind('Pan');
    await act(async () => {
      pan.handlers.onUpdate?.({x: RIGHT_X, translationY: DRAG_UP_10PCT});
      pan.handlers.onFinalize?.({});
    });
    expect(mockKick).toHaveBeenCalled();
  });
});

// ─── DOUBLE-TAP — seek ±10s ──────────────────────────────────────────────

describe('double tap', () => {
  it('seeks back 10s on the left half', async () => {
    await renderGestures();
    const doubleTap = gestureOfKind('Tap', 0);
    expect(doubleTap.log).toContain('numberOfTaps=2');
    await act(async () => {
      doubleTap.handlers.onEnd?.({x: LEFT_X});
    });
    expect(mockCommands.seekBy).toHaveBeenCalledWith(-10_000);
    expect(onGesture).toHaveBeenCalledWith('rewind10');
  });

  it('seeks forward 10s on the right half', async () => {
    await renderGestures();
    const doubleTap = gestureOfKind('Tap', 0);
    await act(async () => {
      doubleTap.handlers.onEnd?.({x: RIGHT_X});
    });
    expect(mockCommands.seekBy).toHaveBeenCalledWith(10_000);
    expect(onGesture).toHaveBeenCalledWith('forward10');
  });
});

// ─── LONG-PRESS — 2× while held ──────────────────────────────────────────

describe('long press', () => {
  it('drops to 2x on start and restores the previous speed on release', async () => {
    await renderGestures();
    const longPress = gestureOfKind('LongPress');
    await act(async () => {
      longPress.handlers.onStart?.({});
    });
    expect(mockCommands.setSpeed).toHaveBeenLastCalledWith(2);
    expect(onGesture).toHaveBeenCalledWith('longPress2x');

    await act(async () => {
      longPress.handlers.onFinalize?.({});
    });
    expect(mockCommands.setSpeed).toHaveBeenLastCalledWith(1);
  });

  it('restores the speed that was playing, not a hardcoded 1', async () => {
    mockTransportState.speed = 1.5;
    await renderGestures();
    const longPress = gestureOfKind('LongPress');
    await act(async () => {
      longPress.handlers.onStart?.({});
      longPress.handlers.onFinalize?.({});
    });
    expect(mockCommands.setSpeed).toHaveBeenLastCalledWith(1.5);
  });

  /**
   * `styles.speedBadge` has NO fill — the "2×" is painted straight
   * onto the video, a dark surface in BOTH themes. It therefore
   * cannot use `text.inverse` (near-black in both palettes, i.e.
   * invisible in both) and must take the on-media pair instead.
   * The two volume/brightness pills are the opposite case: they carry
   * a `background.floating` fill that flips with the theme, so their
   * inverse ink is correct and must stay.
   */
  it('paints the 2x badge with an on-media colour, not text.inverse', async () => {
    await renderGestures();
    const longPress = gestureOfKind('LongPress');
    await act(async () => {
      longPress.handlers.onStart?.({});
    });

    // The badge is `accessibilityElementsHidden` (it is a redundant
    // visual echo of the speed change), so RNTL hides it from queries
    // unless the test opts in.
    const HIDDEN = {includeHiddenElements: true} as const;
    const badge = screen.getByTestId('speed-preview-badge', HIDDEN);
    const badgeText = within(badge).getByText('2×', HIDDEN);
    expect(flattenStyle(badgeText.props.style).color).toBe(
      darkTokens.colors.text.onMediaSoft,
    );
    expect(flattenStyle(badgeText.props.style).color).not.toBe(
      darkTokens.colors.text.inverse,
    );
  });
});

// ─── SINGLE-TAP — chrome toggle ──────────────────────────────────────────

describe('single tap', () => {
  it('toggles the chrome', async () => {
    await renderGestures();
    const singleTap = gestureOfKind('Tap', 1);
    expect(singleTap.log).toContain('numberOfTaps=1');
    await act(async () => {
      singleTap.handlers.onEnd?.({});
    });
    expect(mockToggle).toHaveBeenCalled();
    expect(onGesture).toHaveBeenCalledWith('singleTap');
  });
});

// ─── PiP gating ──────────────────────────────────────────────────────────

describe('PiP gating', () => {
  it('disables every gesture while the player is in PiP', async () => {
    mockPresentationMode.value = 'pip';
    await renderGestures();
    for (const rec of leafGestures()) {
      expect(rec.log).toContain('enabled=false');
    }
  });

  it('enables every gesture while expanded', async () => {
    await renderGestures();
    for (const rec of leafGestures()) {
      expect(rec.log).toContain('enabled=true');
    }
  });
});
