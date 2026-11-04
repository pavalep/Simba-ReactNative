/// <reference types="node" />
/**
 * V22 W23 (2026-11-03) — `PiPToggle` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.3.
 *
 * ## What changed, and why the contract moved
 *
 * The button used to do the PiP entry ITSELF:
 *
 *     const accepted = commands.enterPip();
 *     setPipActive(accepted);
 *
 * — ask the OS for the window FIRST, then hide the chrome.
 *
 * That order is a defect, and the defect is what the user reported: the
 * PiP window showed the app's full expanded chrome (the header band, the
 * scrub row, the ±10 buttons, the big pause button) scaled down into the
 * small window, and called it "not professional looking at all".
 *
 * **React does not redraw in Picture-in-Picture (the Activity is "paused, but rendering", but RN freezes TWO things with the Activity — Fabric stops applying mount items, so a React commit never reaches the native view tree, and the JS timer manager freezes, so `requestAnimationFrame` never fires).** Whatever its
 * window held at the moment of the transition is what the PiP window
 * keeps showing. Measured on the emulator on 2026-11-03: `pipActive` was
 * already `true` and `isExpanded` already `false`, the chrome was still
 * painted, its buttons were DEAD (tapping pause did not pause) and its
 * clock was FROZEN at 51:09 while the real position was 54:15. A stale
 * surface, not a live one.
 *
 * So the chrome has to be gone, and DRAWN gone, before the OS is asked.
 * The button now asks for that — `requestPip()` — and `usePipEntry()`
 * owns the rest. The button does NOT call `commands.enterPip()`, and
 * these tests say so.
 *
 * Covers:
 *   - returns null when canEnterPip === false
 *   - renders when canEnterPip === true
 *   - tap asks for the window (`requestPip()`)
 *   - tap does NOT enter PiP itself — that is `usePipEntry`'s job
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
const mockRequestPip = jest.fn();
const mockTransport: {
  state: {canEnterPip: boolean};
  // `enterPip` is a REQUIRED member of `TransportCommands` (lib 1.5.x+),
  // so the mock declares it required too — an optional key here would
  // let this suite pass against the very cast the W5 reaudit removed.
  //
  // It returns `boolean` since lib 1.21.0: the native side ANSWERS
  // whether the OS accepted the request.
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
    //
    // W23 (2026-11-03): the button asks for the window through
    // `requestPip()`, which hides the chrome and records the request in
    // one store update. The entry itself belongs to `usePipEntry()`.
    usePresentation: () => ({
      requestPip: mockRequestPip,
      setPipActive: jest.fn(),
      togglePip: jest.fn(),
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

  it('tap asks for the window (requestPip())', async () => {
    mockTransport.state.canEnterPip = true;
    const {getByLabelText} = await render(<PiPToggle />);
    await fireEvent.press(getByLabelText('Enter Picture-in-Picture'));
    expect(mockRequestPip).toHaveBeenCalledTimes(1);
  });

  it('tap does NOT enter PiP itself — that is usePipEntry’s job', async () => {
    // The order is the whole contract: the chrome has to be unmounted,
    // and DRAWN unmounted, before the OS is asked. A button that calls
    // `commands.enterPip()` puts the chrome in the frozen PiP window.
    mockTransport.state.canEnterPip = true;
    const {getByLabelText} = await render(<PiPToggle />);
    await fireEvent.press(getByLabelText('Enter Picture-in-Picture'));
    expect(mockEnterPip).not.toHaveBeenCalled();
  });

  it('has no defensive cast that could make the button a silent no-op', async () => {
    // A cast + no-op fallback would type-check and render a button that
    // silently does nothing — so guard the source directly.
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
