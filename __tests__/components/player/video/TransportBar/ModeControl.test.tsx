/// <reference types="node" />
/**
 * V19 W8.7 — `ModeControl` unit tests.
 *
 * ## What changed, and why the whole shape of this suite changed
 *
 * W8.7 deleted the repeat POPOVER. `ModeControl` used to open a
 * `ModeSheet` listing Off / Repeat one / Repeat all, and the user
 * rejected that pattern outright: *"there is no need for popup, if we
 * click loop icon rotate through each, that is the industry standard"*.
 *
 * The control is now a three-state cycle advanced by a single tap —
 * the shipped behaviour in YouTube, Netflix, Apple TV, Plex and VLC.
 *
 * So these tests no longer assert "tapping opens a menu and picking a
 * row sets the mode". They pin the CYCLE itself: the order, the wrap,
 * the glyph that carries the state, and — explicitly — that no popup is
 * ever rendered. That last one is the load-bearing assertion: it is what
 * stops a future edit from quietly restoring the sheet, which would
 * look like a harmless enhancement and would re-introduce the exact
 * thing the user rejected.
 *
 * The cycle is asserted against the exported `REPEAT_CYCLE` array
 * rather than a hardcoded successor, so re-ordering the cycle is a
 * deliberate, visible change here instead of a silent divergence.
 */

import * as React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {
  ModeControl,
  REPEAT_CYCLE,
  nextRepeatMode,
} from '../../../../../src/components/player/video/TransportBar/ModeControl';

// ── Mocks ────────────────────────────────────────────────────────────

jest.mock('../../../../../src/theme', () => {
  const {darkTokens} = jest.requireActual(
    '../../../../../src/theme/tokens',
  );
  return {
    useTheme: () => ({
      colors: darkTokens.colors,
      spacing: {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24},
      radius: {lg: 16},
      typography: darkTokens.typography,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

/**
 * The real `SvgIcon` module path is mocked so the NAME the control asked
 * for is directly queryable. Without this seam the only way to prove the
 * glyph swapped would be to walk react-native-svg internals, and a test
 * that does that stops testing the thing the user actually sees.
 */
jest.mock('../../../../../src/components/utility/SvgIcon', () => {
  const {Text} = jest.requireActual('react-native');
  return {
    SvgIcon: ({name}: {name: string}) => (
      <Text testID={`icon-${name}`}>{name}</Text>
    ),
  };
});

const mockSetRepeatMode = jest.fn();
const mockTransport: {
  state: {repeatMode: 'off' | 'one' | 'all'};
  commands: {setRepeatMode: jest.Mock};
} = {
  state: {repeatMode: 'off'},
  commands: {setRepeatMode: mockSetRepeatMode},
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
        '../../../../../src/infrastructure/player/useReduceMotion',
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
        '../../../../../src/infrastructure/player/useQueueSync',
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
  };
});

// ── Tests ────────────────────────────────────────────────────────────

describe('ModeControl — the repeat cycle (W8.7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransport.state.repeatMode = 'off';
  });

  describe('nextRepeatMode', () => {
    it('advances through every mode in the declared order', () => {
      // The contract, expressed without hardcoding successors: starting
      // from `off`, N presses must visit every mode exactly once before
      // returning home.
      const visited: string[] = [];
      let mode = REPEAT_CYCLE[0];
      for (let i = 0; i < REPEAT_CYCLE.length; i++) {
        mode = nextRepeatMode(mode);
        visited.push(mode);
      }
      expect(visited).toEqual([...REPEAT_CYCLE.slice(1), REPEAT_CYCLE[0]]);
      expect(new Set(visited).size).toBe(REPEAT_CYCLE.length);
    });

    it('wraps the last mode back to the first', () => {
      const last = REPEAT_CYCLE[REPEAT_CYCLE.length - 1];
      expect(nextRepeatMode(last)).toBe(REPEAT_CYCLE[0]);
    });

    it('lands somewhere legal when handed a mode it was not written for', () => {
      // A control can be handed a value from outside its own union (a
      // persisted preference, a future mode). It must still resolve to
      // a real mode rather than throw or return undefined.
      const next = nextRepeatMode(
        'garbage' as unknown as 'off' | 'one' | 'all',
      );
      expect(REPEAT_CYCLE).toContain(next);
    });
  });

  it('one tap advances to the next mode — no picker involved', async () => {
    const {getByLabelText} = await render(<ModeControl />);
    fireEvent.press(getByLabelText('Repeat mode: Off'));
    expect(mockSetRepeatMode).toHaveBeenCalledTimes(1);
    expect(mockSetRepeatMode).toHaveBeenCalledWith(
      nextRepeatMode('off'),
    );
  });

  it.each(['off', 'all', 'one'] as const)(
    'pressing while in "%s" advances to the next mode in the cycle',
    async current => {
      mockTransport.state.repeatMode = current;
      const {getByLabelText} = await render(<ModeControl />);
      fireEvent.press(
        getByLabelText(`Repeat mode: ${labelFor(current)}`),
      );
      expect(mockSetRepeatMode).toHaveBeenCalledWith(
        nextRepeatMode(current),
      );
    },
  );

  it.each([...REPEAT_CYCLE].reverse())(
    'a press from "%s" never re-selects the mode already active',
    async current => {
      // A cycle that could no-op on a press is a broken cycle: the user
      // taps, nothing happens, and the control looks inert — the exact
      // defect class this overhaul exists to remove. Asserted per mode
      // with ONE render each: stacking several render/unmount pairs in a
      // single test wedges RNTL's async cleanup and every later query in
      // that test silently finds nothing.
      mockTransport.state.repeatMode = current;
      const successor = nextRepeatMode(current);
      expect(successor).not.toBe(current);

      const {getByLabelText} = await render(<ModeControl />);
      fireEvent.press(getByLabelText(`Repeat mode: ${labelFor(current)}`));
      expect(mockSetRepeatMode).toHaveBeenCalledWith(successor);
    },
  );

  it('renders NO popup — the sheet pattern stays deleted', async () => {
    const {getByLabelText, queryByLabelText, queryByText} =
      await render(<ModeControl />);
    await fireEvent.press(getByLabelText('Repeat mode: Off'));
    // Nothing that resembles a menu: no option rows, no close button.
    expect(queryByLabelText('Repeat one')).toBeNull();
    expect(queryByLabelText('Repeat all')).toBeNull();
    expect(queryByLabelText('Close repeat mode')).toBeNull();
    expect(queryByText('Repeat one')).toBeNull();
    expect(queryByText('Repeat all')).toBeNull();
  });

  it('draws the repeat-ONE glyph when repeating a single file', async () => {
    // Deleting the popup means the glyph is the ONLY always-visible
    // state signal. If it did not change, "repeat one" and "repeat all"
    // would be indistinguishable at a glance — and colour alone would
    // not be enough (WCAG 1.4.1).
    mockTransport.state.repeatMode = 'one';
    const {getByTestId, queryByTestId} = await render(<ModeControl />);
    expect(getByTestId('icon-repeatOne')).toBeTruthy();
    expect(queryByTestId('icon-repeat')).toBeNull();
  });

  it('draws the plain loop glyph while repeating is off', async () => {
    mockTransport.state.repeatMode = 'off';
    const {getByTestId, queryByTestId} = await render(<ModeControl />);
    expect(getByTestId('icon-repeat')).toBeTruthy();
    expect(queryByTestId('icon-repeatOne')).toBeNull();
  });

  it('off and repeat-all share a glyph, so the switch state is what separates them', async () => {
    // Both are "the queue is looping" to the eye. That is fine — the
    // accessibility tree names the mode, and `accessibilityState.checked`
    // distinguishes on/off. Asserted so the shortcut of relying on the
    // glyph alone cannot be mistaken for coverage.
    mockTransport.state.repeatMode = 'all';
    const {getByTestId, getByLabelText} = await render(<ModeControl />);
    expect(getByTestId('icon-repeat')).toBeTruthy();
    expect(getByLabelText('Repeat mode: Repeat all').props.accessibilityState)
      .toMatchObject({checked: true});
  });

  it('the label names the current mode and the hint says it cycles', async () => {
    const {getByLabelText} = await render(<ModeControl />);
    const control = getByLabelText('Repeat mode: Off');
    expect(control.props.accessibilityHint).toBe(
      'Switches between repeat off, repeat all and repeat one',
    );
    // The hint must not still advertise the deleted picker.
    expect(control.props.accessibilityHint).not.toMatch(/picker|menu/i);
  });

  it('exposes the engaged state as a switch, not just as gold ink', async () => {
    mockTransport.state.repeatMode = 'one';
    const {getByLabelText} = await render(<ModeControl />);
    const control = getByLabelText('Repeat mode: Repeat one');
    expect(control.props.accessibilityRole).toBe('switch');
    expect(control.props.accessibilityState).toMatchObject({checked: true});
  });

  it('reports checked:false for the default "off" mode', async () => {
    const {getByLabelText} = await render(<ModeControl />);
    const control = getByLabelText('Repeat mode: Off');
    expect(control.props.accessibilityState).toMatchObject({checked: false});
  });
});

function labelFor(mode: 'off' | 'one' | 'all'): string {
  return mode === 'off' ? 'Off' : mode === 'one' ? 'Repeat one' : 'Repeat all';
}