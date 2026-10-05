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
import {fireEvent, render} from '@testing-library/react-native';
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
    // W7.5 — the MOTION half. Separate from `opacity` so the two chrome
    // bands can travel in OPPOSITE directions off one shared value
    // (the header rises, the transport bar falls). `interpolate` is a
    // real pass-through here so the controller's `progress.interpolate`
    // call resolves and its output range can be asserted below.
    progress: {
      _value: 0,
      setValue: jest.fn(),
      stopAnimation: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      resetAnimation: jest.fn(),
      interpolate: (config: {outputRange: [number, number]}) => config.outputRange,
    } as unknown as ReturnType<typeof Object> & {_value: number},
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
    const {getByText, getByTestId} = await render(
      <ChromeAutoHideController testID="chrome-wrapper">
        <Pressable onPress={onPress}>
          <Text>press me</Text>
        </Pressable>
      </ChromeAutoHideController>,
    );
    // The wrapper is a pure pass-through: it never captures a tap, so a
    // hidden (opacity 0) chrome still lets the tap reach the surface
    // underneath.
    expect(getByTestId('chrome-wrapper').props.pointerEvents).toBe('box-none');
    // ...and the child really does own the press.
    fireEvent.press(getByText('press me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // ── W7.5 — the chrome MOVES as well as fades ────────────────────────

  /**
   * Read the `translateY` output range off the wrapper's transform.
   * The mocked `progress.interpolate` returns its own `outputRange`, so
   * this reads back the SIGN and MAGNITUDE the controller asked for.
   */
  const travelRangeOf = (node: {props: {style?: unknown}}): number[] => {
    const style = Array.isArray(node.props.style)
      ? node.props.style.flat(Infinity)
      : [node.props.style];
    const merged = Object.assign({}, ...(style.filter(Boolean) as object[]));
    const transform = (merged as {transform?: Array<{translateY?: unknown}>})
      .transform;
    return transform?.[0]?.translateY as number[];
  };

  // A pure opacity transition reads as two static images
  // cross-dissolving, not as an element leaving the screen — which is a
  // large part of why the chrome felt inert even when it worked.
  it('travels as it hides, not only fades', async () => {
    const {getByTestId} = await render(
      <ChromeAutoHideController testID="chrome-wrapper">
        <Text>chrome child</Text>
      </ChromeAutoHideController>,
    );
    const range = travelRangeOf(getByTestId('chrome-wrapper'));
    // Starts at rest (0) and ends displaced.
    expect(range[0]).toBe(0);
    expect(Math.abs(range[1])).toBeGreaterThan(0);
  });

  // The travel is signed per edge: the header rises as it hides and the
  // transport bar falls, because a bar that exits toward the screen
  // edge it belongs to looks intentional and one that exits the wrong
  // way looks like it drifted. Both still read the SAME shared value,
  // which is what keeps the two bands in sync.
  it('the top band rises while the bottom band falls', async () => {
    const top = await render(
      <ChromeAutoHideController testID="top-band" edge="top">
        <Text>header</Text>
      </ChromeAutoHideController>,
    );
    const topRange = travelRangeOf(top.getByTestId('top-band'));
    await top.unmount();

    const bottom = await render(
      <ChromeAutoHideController testID="bottom-band" edge="bottom">
        <Text>transport</Text>
      </ChromeAutoHideController>,
    );
    const bottomRange = travelRangeOf(bottom.getByTestId('bottom-band'));
    await bottom.unmount();

    expect(Math.sign(topRange[1])).toBe(-1);
    expect(Math.sign(bottomRange[1])).toBe(1);
    // Same magnitude, opposite direction — one value, two edges.
    expect(Math.abs(topRange[1])).toBe(Math.abs(bottomRange[1]));
  });

  it('travels only a few pixels — a large slide reads as lag, not polish', async () => {
    const {getByTestId} = await render(
      <ChromeAutoHideController testID="chrome-wrapper">
        <Text>chrome child</Text>
      </ChromeAutoHideController>,
    );
    const range = travelRangeOf(getByTestId('chrome-wrapper'));
    // On a 24 dp phone, anything past ~16 dp stops reading as polish.
    expect(Math.abs(range[1])).toBeLessThanOrEqual(16);
  });
});
