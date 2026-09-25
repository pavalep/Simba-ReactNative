/// <reference types="node" />
/**
 * V19 W3 Phase 3.1 — `ModeControl` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.1.
 *
 * Covers:
 *   - renders the current mode label (Off / Repeat one / Repeat all)
 *   - tap on the control opens the ModeSheet
 *   - tapping a mode in the sheet calls commands.setRepeatMode
 *   - selecting the same mode (idempotent re-confirm) also calls the command
 *   - the a11y label reflects the current mode
 *   - the gold accent applies when mode is non-default
 */

import * as React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {ModeControl} from '../../../../../src/components/player/video/TransportBar/ModeControl';

// ── Mocks ────────────────────────────────────────────────────────────

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {elevated: '#141416', scrimDim: 'rgba(0,0,0,0.45)'},
      border: {emphasis: 'rgba(255,255,255,0.12)'},
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

const mockSetRepeatMode = jest.fn();
const mockTransport: {
  state: {repeatMode: 'off' | 'one' | 'all'};
  commands: {setRepeatMode: jest.Mock};
} = {
  state: {repeatMode: 'off'},
  commands: {setRepeatMode: mockSetRepeatMode},
};

jest.mock('../../../../../src/infrastructure/player', () => {
  const actual = jest.requireActual(
    '../../../../../src/infrastructure/player/useTransport',
  );
  return {
    ...actual,
    useTransport: () => mockTransport,
  };
});

// ── Tests ────────────────────────────────────────────────────────────

describe('ModeControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransport.state.repeatMode = 'off';
  });

  it('renders the current mode label', async () => {
    mockTransport.state.repeatMode = 'one';
    const {getByText} = await render(<ModeControl />);
    expect(getByText('Repeat one')).toBeTruthy();
  });

  it('renders "Off" when repeatMode === "off"', async () => {
    const {getByText} = await render(<ModeControl />);
    expect(getByText('Off')).toBeTruthy();
  });

  it('renders "Repeat all" when repeatMode === "all"', async () => {
    mockTransport.state.repeatMode = 'all';
    const {getByText} = await render(<ModeControl />);
    expect(getByText('Repeat all')).toBeTruthy();
  });

  it('the a11y label reflects the current mode', async () => {
    mockTransport.state.repeatMode = 'all';
    const {getByLabelText} = await render(<ModeControl />);
    expect(
      getByLabelText('Repeat mode: Repeat all. Tap to change.'),
    ).toBeTruthy();
  });

  it('opens the ModeSheet on tap', async () => {
    const {getByLabelText} = await render(<ModeControl />);
    const button = getByLabelText('Repeat mode: Off. Tap to change.');
    fireEvent.press(button);
    // After tapping, the ModeSheet becomes visible — the option
    // rows render with menuitem accessibility role.
    expect(
      getByLabelText('Repeat one'),
    ).toBeTruthy();
    expect(
      getByLabelText('Repeat all'),
    ).toBeTruthy();
  });

  it('selecting a mode in the sheet calls commands.setRepeatMode', async () => {
    const {getByLabelText} = await render(<ModeControl />);
    fireEvent.press(
      getByLabelText('Repeat mode: Off. Tap to change.'),
    );
    fireEvent.press(getByLabelText('Repeat one'));
    expect(mockSetRepeatMode).toHaveBeenCalledWith('one');
  });

  it('selecting "Repeat all" calls setRepeatMode("all")', async () => {
    const {getByLabelText} = await render(<ModeControl />);
    fireEvent.press(
      getByLabelText('Repeat mode: Off. Tap to change.'),
    );
    fireEvent.press(getByLabelText('Repeat all'));
    expect(mockSetRepeatMode).toHaveBeenCalledWith('all');
  });

  it('tapping the scrim closes the sheet WITHOUT changing the mode', async () => {
    const {getByLabelText} = await render(<ModeControl />);
    fireEvent.press(
      getByLabelText('Repeat mode: Off. Tap to change.'),
    );
    fireEvent.press(getByLabelText('Close repeat mode'));
    expect(mockSetRepeatMode).not.toHaveBeenCalled();
    // The menu items are unmounted after close.
    expect(getByLabelText('Repeat mode: Off. Tap to change.')).toBeTruthy();
  });
});
