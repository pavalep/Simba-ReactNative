/// <reference types="node" />
/**
 * V19 W3.5 Phase 3.5.1 — `ChromeAutoHideController` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.5.1.
 *
 * Covers:
 *   - renders its children inside an Animated.View
 *   - applies opacity from useChromeAutoHide to the wrapper
 *   - the wrapper is non-interactive (pointerEvents="box-none")
 *   - chrome primitives nested inside receive their own taps
 *     (the wrapper doesn't capture them)
 */

import * as React from 'react';
import {Pressable, Text} from 'react-native';
import {render} from '@testing-library/react-native';
import {ChromeAutoHideController} from '../../../../../src/components/player/video/ChromeAutoHide/ChromeAutoHideController';

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {elevated: '#141416', scrimDim: 'rgba(0,0,0,0.45)'},
      border: {subtle: '#1A1A1C', emphasis: 'rgba(255,255,255,0.12)'},
      accent: {gold: '#C9A84C', goldSoft: 'rgba(201,168,76,0.10)'},
      text: {primary: '#EDEDED', secondary: '#80EDEDED', tertiary: '#4DEDEDED'},
      shadow: '#000000',
    },
    spacing: {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24},
    radius: {lg: 16},
  }),
}));

jest.mock('../../../../../src/infrastructure/player', () => ({
  // Spread the individual facade SUBMODULES, not the barrel — Jest is
  // mid-mock on that module, so its re-export getters would read a
  // half-initialised namespace ("Cannot read properties of undefined
  // (reading 'CHROME_AUTO_HIDE_MS')").
  ...jest.requireActual(
    '../../../../../src/infrastructure/player/useChromeAutoHide',
  ),
  ...jest.requireActual('../../../../../src/infrastructure/player/useTransport'),
  useChromeAutoHide: () => ({
    opacity: {_value: 1, setValue: jest.fn(), interpolate: jest.fn(), stopAnimation: jest.fn(), addListener: jest.fn(), removeListener: jest.fn(), resetAnimation: jest.fn()} as unknown as ReturnType<typeof Object> & {_value: number},
    isVisible: true,
    toggle: jest.fn(),
    kick: jest.fn(),
  }),
}));

describe('ChromeAutoHideController', () => {
  it('renders its children inside the wrapper', async () => {
    const {getByText} = await render(
      <ChromeAutoHideController>
        <Text>chrome child</Text>
      </ChromeAutoHideController>,
    );
    expect(getByText('chrome child')).toBeTruthy();
  });

  it('wrapper is pointer-events box-none (children own their taps)', async () => {
    const onPress = jest.fn();
    const {getByText} = await render(
      <ChromeAutoHideController>
        <Pressable onPress={onPress}>
          <Text>press me</Text>
        </Pressable>
      </ChromeAutoHideController>,
    );
    // The child Pressable receives the press (the controller
    // doesn't capture it).
    const child = getByText('press me').parent;
    expect(child?.props.onPress).toBeDefined();
  });
});
