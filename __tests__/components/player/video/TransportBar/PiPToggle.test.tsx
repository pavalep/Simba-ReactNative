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

const mockEnterPip = jest.fn();
const mockTransport: {
  state: {canEnterPip: boolean};
  commands: {enterPip?: () => void};
} = {
  state: {canEnterPip: false},
  commands: {enterPip: mockEnterPip},
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

describe('PiPToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    fireEvent.press(getByLabelText('Enter Picture-in-Picture'));
    expect(mockEnterPip).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the lib does not expose enterPip', async () => {
    mockTransport.state.canEnterPip = true;
    mockTransport.commands = {}; // simulate a lib without enterPip
    const {getByLabelText} = await render(<PiPToggle />);
    expect(() =>
      fireEvent.press(getByLabelText('Enter Picture-in-Picture')),
    ).not.toThrow();
  });
});
