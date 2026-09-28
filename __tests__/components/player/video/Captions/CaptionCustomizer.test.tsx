/// <reference types="node" />
/**
 * V19 W3.6 Phase 3.6.2 — `CaptionCustomizer` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.6.2.
 *
 * Covers:
 *   - renders nothing when visible=false
 *   - renders all three groups (Font size / Background / Position)
 *   - tapping an option calls the store setter
 *   - the selected option is gold-highlighted
 *   - tapping the scrim calls onClose WITHOUT changing settings
 */

import * as React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {CaptionCustomizer} from '../../../../../src/components/player/video/Captions/CaptionCustomizer';

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        elevated: '#141416',
        scrimDim: 'rgba(0,0,0,0.45)',
      },
      border: {subtle: '#1A1A1C', emphasis: 'rgba(255,255,255,0.12)'},
      accent: {gold: '#C9A84C', goldSoft: 'rgba(201,168,76,0.10)'},
      text: {primary: '#EDEDED', secondary: '#80EDEDED', tertiary: '#4DEDEDED', accent: '#C9A84C'},
      shadow: '#000000',
    },
    spacing: {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24},
    radius: {md: 12, lg: 16},
    typography: {
      body2: {fontSize: 15, lineHeight: 22},
      caption: {fontSize: 13, lineHeight: 18},
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

const setFontSize = jest.fn();
const setBackgroundOpacity = jest.fn();
const setPosition = jest.fn();

interface MockStore {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  backgroundOpacity: 'none' | 'fifty' | 'solid';
  position: 'bottom' | 'top';
  setFontSize: jest.Mock;
  setBackgroundOpacity: jest.Mock;
  setPosition: jest.Mock;
}

const mockStoreState: MockStore = {
  fontSize: 'medium',
  backgroundOpacity: 'fifty',
  position: 'bottom',
  setFontSize,
  setBackgroundOpacity,
  setPosition,
};

jest.mock('../../../../../src/state/useCaptionSettingsStore', () => ({
  useCaptionSettingsStore: (selector: (s: MockStore) => unknown) =>
    selector(mockStoreState),
}));

describe('CaptionCustomizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.fontSize = 'medium';
    mockStoreState.backgroundOpacity = 'fifty';
    mockStoreState.position = 'bottom';
  });

  it('renders nothing when visible=false', async () => {
    const {toJSON} = await render(
      <CaptionCustomizer visible={false} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders all three group headers + their options', async () => {
    const {getByText, getByLabelText} = await render(
      <CaptionCustomizer visible onClose={jest.fn()} />,
    );
    // Group headers
    expect(getByText('Font size')).toBeTruthy();
    expect(getByText('Background')).toBeTruthy();
    expect(getByText('Position')).toBeTruthy();
    // Sample options
    expect(getByLabelText('Font size: S')).toBeTruthy();
    expect(getByLabelText('Font size: M')).toBeTruthy();
    expect(getByLabelText('Background: 50%')).toBeTruthy();
    expect(getByLabelText('Position: Bottom')).toBeTruthy();
  });

  it('marks the current value as selected (gold accent)', async () => {
    mockStoreState.fontSize = 'large';
    const {getByLabelText} = await render(
      <CaptionCustomizer visible onClose={jest.fn()} />,
    );
    expect(getByLabelText('Font size: L').props.accessibilityState)
      .toEqual({selected: true});
    expect(getByLabelText('Font size: M').props.accessibilityState)
      .toEqual({selected: false});
  });

  it('tapping a font-size option calls setFontSize', async () => {
    const {getByLabelText} = await render(
      <CaptionCustomizer visible onClose={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('Font size: XL'));
    expect(setFontSize).toHaveBeenCalledWith('extra-large');
  });

  it('tapping a background option calls setBackgroundOpacity', async () => {
    const {getByLabelText} = await render(
      <CaptionCustomizer visible onClose={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('Background: Solid'));
    expect(setBackgroundOpacity).toHaveBeenCalledWith('solid');
  });

  it('tapping a position option calls setPosition', async () => {
    const {getByLabelText} = await render(
      <CaptionCustomizer visible onClose={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('Position: Top'));
    expect(setPosition).toHaveBeenCalledWith('top');
  });

  it('tapping the scrim calls onClose WITHOUT changing settings', async () => {
    const onClose = jest.fn();
    const {getByLabelText} = await render(
      <CaptionCustomizer visible onClose={onClose} />,
    );
    fireEvent.press(getByLabelText('Close captions customizer'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(setFontSize).not.toHaveBeenCalled();
    expect(setBackgroundOpacity).not.toHaveBeenCalled();
    expect(setPosition).not.toHaveBeenCalled();
  });
});
