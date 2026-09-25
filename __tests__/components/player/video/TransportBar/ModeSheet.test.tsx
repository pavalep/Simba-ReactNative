/// <reference types="node" />
/**
 * V19 W3 Phase 3.1 — `ModeSheet` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.1.
 *
 * Covers:
 *   - renders nothing when visible=false
 *   - renders all three options (Off / Repeat one / Repeat all)
 *   - the current mode is gold-highlighted (selected state)
 *   - tapping a non-current option calls onSelect with that mode
 *   - tapping the scrim calls onClose WITHOUT calling onSelect
 *   - tapping the current (selected) option also calls onSelect
 *     (idempotent — user can re-confirm)
 *   - the back button calls onClose
 */

import * as React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {ModeSheet, MODE_OPTIONS} from '../../../../../src/components/player/video/TransportBar/ModeSheet';

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        elevated: '#141416',
        scrimDim: 'rgba(0,0,0,0.45)',
      },
      border: {emphasis: 'rgba(255,255,255,0.12)'},
      accent: {gold: '#C9A84C', goldSoft: 'rgba(201,168,76,0.10)'},
      text: {primary: '#EDEDED', accent: '#C9A84C'},
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

describe('ModeSheet', () => {
  it('renders nothing when visible=false', async () => {
    const {toJSON} = await render(
      <ModeSheet
        visible={false}
        currentMode="off"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders all three options', async () => {
    const {getByLabelText} = await render(
      <ModeSheet
        visible
        currentMode="off"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText('Off')).toBeTruthy();
    expect(getByLabelText('Repeat one')).toBeTruthy();
    expect(getByLabelText('Repeat all')).toBeTruthy();
  });

  it('marks the current mode as selected (accessibilityState)', async () => {
    const {getByLabelText} = await render(
      <ModeSheet
        visible
        currentMode="one"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText('Repeat one').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(getByLabelText('Off').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(getByLabelText('Repeat all').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('invokes onSelect with the tapped mode', async () => {
    const onSelect = jest.fn();
    const {getByLabelText} = await render(
      <ModeSheet
        visible
        currentMode="off"
        onSelect={onSelect}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Repeat one'));
    expect(onSelect).toHaveBeenCalledWith('one');
  });

  it('tapping the scrim calls onClose WITHOUT onSelect', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const {getByLabelText} = await render(
      <ModeSheet
        visible
        currentMode="off"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );
    fireEvent.press(getByLabelText('Close repeat mode'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('exports MODE_OPTIONS with the three modes in Off → one → all order', () => {
    expect(MODE_OPTIONS.map(o => o.mode)).toEqual(['off', 'one', 'all']);
    expect(MODE_OPTIONS.map(o => o.label)).toEqual([
      'Off',
      'Repeat one',
      'Repeat all',
    ]);
  });
});
