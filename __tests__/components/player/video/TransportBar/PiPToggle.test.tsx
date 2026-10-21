/// <reference types="node" />
/**
 * V19 W3 Phase 3.3 — `PiPToggle` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.3.
 *
 * Covers:
 *   - returns null when canEnterPip === false
 *   - renders when canEnterPip === true
 *   - tap calls commands.enterPip()
 *   - a11y label says "Enter Picture-in-Picture"
 */

import * as React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {PiPToggle} from '../../../../../src/components/player/video/TransportBar/PiPToggle';

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {elevated: '#141416', scrimDim: 'rgba(0,0,0,0.45)'},
      border: {subtle: '#1A1A1C', emphasis: 'rgba(255,255,255,0.12)'},
      accent: {gold: '#C9A84C', goldSoft: 'rgba(201,168,76,0.10)'},
      text: {primary: '#EDEDED', secondary: '#80EDEDED', tertiary: '#4DEDEDED', accent: '#C9A84C'},
      shadow: '#000000',
    },
    spacing: {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24},
    radius: {lg: 16},
    typography: {
      body2: {fontSize: 15, lineHeight: 22},
      caption: {fontSize: 13, lineHeight: 18},
    },
  }),
}));

const mockEnterPip = jest.fn(() => true);
const mockSetPipActive = jest.fn();
const mockTogglePip = jest.fn();
const mockTransport: {
  state: {canEnterPip: boolean};
  // `enterPip` is a REQUIRED member of `TransportCommands` (lib 1.5.x+),
  // so the mock declares it required too — an optional key here would
  // let this suite pass against the very cast the W5 reaudit removed.
  //
  // It returns `boolean` since lib 1.21.0: the native side ANSWERS
  // whether the OS accepted the request, and the chrome follows that
  // answer.
  commands: {enterPip: () => boolean};
} = {
  state: {canEnterPip: false},
  commands: {enterPip: mockEnterPip},
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
    // W6.0: the presentation hook no longer exposes `setMode` — the
    // mode is derived from the host activity, and the only genuinely
    // global presentation fact is whether the PiP window is up. See
    // `src/state/usePresentationStore.ts`.
    usePresentation: () => ({
      setPipActive: mockSetPipActive,
      togglePip: mockTogglePip,
      isPip: false,
      isExpanded: true,
      mode: 'expanded',
    }),
  };
});

describe('PiPToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The default is a SUCCESSFUL entry — the native side's answer.
    mockEnterPip.mockReturnValue(true);
    mockTransport.state.canEnterPip = false;
  });

  it('returns null when canEnterPip is false', async () => {
    const {toJSON} = await render(<PiPToggle />);
    expect(toJSON()).toBeNull();
  });

  it('renders when canEnterPip is true', async () => {
    mockTransport.state.canEnterPip = true;
    const {getByLabelText} = await render(<PiPToggle />);
    expect(getByLabelText('Enter Picture-in-Picture')).toBeTruthy();
  });

  it('tap calls commands.enterPip()', async () => {
    mockTransport.state.canEnterPip = true;
    const {getByLabelText} = await render(<PiPToggle />);
    await fireEvent.press(getByLabelText('Enter Picture-in-Picture'));
    expect(mockEnterPip).toHaveBeenCalledTimes(1);
  });

  it('tap ALSO suppresses the JS chrome (setPipActive(true))', async () => {
    // The W5 reaudit found the button was a complete no-op: the
    // `as unknown as {enterPip?}` cast always read `undefined` and the
    // `|| () => {}` fallback swallowed the press. Assert BOTH halves of
    // the press so a future one-sided regression is caught.
    //
    // W6.0: the second half is `setPipActive(true)`, not
    // `setMode('pip')`. The mode is now DERIVED from the host activity
    // plus this flag, so writing a `mode` was both unnecessary and —
    // because every mounted activity root ran the writer — actively
    // destructive. See `src/state/usePresentationStore.ts`.
    mockTransport.state.canEnterPip = true;
    const {getByLabelText} = await render(<PiPToggle />);
    await fireEvent.press(getByLabelText('Enter Picture-in-Picture'));
    expect(mockEnterPip).toHaveBeenCalledTimes(1);
    expect(mockSetPipActive).toHaveBeenCalledWith(true);
  });

  it('the native window opens BEFORE the chrome is suppressed', async () => {
    // Order matters only for the failure case: if the native call
    // throws, the chrome must not already be gone, or the user is
    // left with a black screen and a floating window.
    const order: string[] = [];
    mockEnterPip.mockImplementationOnce(() => {
      order.push('native');
      return true;
    });
    mockSetPipActive.mockImplementationOnce(() => {
      order.push('chrome');
    });

    mockTransport.state.canEnterPip = true;
    const {getByLabelText} = await render(<PiPToggle />);
    await fireEvent.press(getByLabelText('Enter Picture-in-Picture'));

    expect(order).toEqual(['native', 'chrome']);
  });

  /**
   * A REFUSED PiP request must leave the chrome exactly where it was.
   *
   * The button used to call `setPipActive(true)` unconditionally, on the
   * assumption that the request had worked — but the native side used to
   * swallow every refusal, so a refused request looked identical to a
   * successful one. The app then hid its own chrome for a PiP window
   * that would never exist, and the only thing that brings the chrome
   * back is the PiP-EXIT event, which for a request that never happened
   * never comes.
   *
   * Since lib 1.21.0 the native side ANSWERS, and the chrome follows the
   * answer. `false` must mean "PiP did not happen" — not "hide the
   * chrome anyway".
   */
  it('a REFUSED PiP request does NOT hide the chrome', async () => {
    mockEnterPip.mockReturnValue(false);
    mockTransport.state.canEnterPip = true;
    const {getByLabelText} = await render(<PiPToggle />);

    await fireEvent.press(getByLabelText('Enter Picture-in-Picture'));

    expect(mockEnterPip).toHaveBeenCalledTimes(1);
    expect(mockSetPipActive).toHaveBeenCalledWith(false);
  });

  it('the chrome state is the native answer, not a hard-coded true', async () => {
    // Guards against a regression to `setPipActive(true)` — the exact
    // shape of the defect. Two different native answers, two different
    // chrome states.
    mockTransport.state.canEnterPip = true;
    const {getByLabelText} = await render(<PiPToggle />);

    mockEnterPip.mockReturnValueOnce(true);
    await fireEvent.press(getByLabelText('Enter Picture-in-Picture'));
    expect(mockSetPipActive).toHaveBeenLastCalledWith(true);

    mockEnterPip.mockReturnValueOnce(false);
    await fireEvent.press(getByLabelText('Enter Picture-in-Picture'));
    expect(mockSetPipActive).toHaveBeenLastCalledWith(false);
  });

  it('has no defensive cast that could make enterPip a silent no-op', async () => {
    // `enterPip` is a required member of `TransportCommands`, backed by
    // lib 1.5.x+. A cast + no-op fallback would type-check and render a
    // button that silently does nothing — so guard the source directly.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(
        __dirname,
        '../../../../../src/components/player/video/TransportBar/PiPToggle.tsx',
      ),
      'utf8',
    );
    const code = src
      .split('\n')
      .filter((line: string) => !/^\s*(\*|\/\/)/.test(line))
      .join('\n');
    expect(code).not.toMatch(/as unknown as/);
    expect(code).not.toMatch(/enterPip\s*\?\s*enterPip/);
  });
});
