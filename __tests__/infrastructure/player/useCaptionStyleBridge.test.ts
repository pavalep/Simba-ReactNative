/// <reference types="node" />
/**
 * `useCaptionStyleBridge` — the single owner of caption rendering style.
 *
 * Before this hook the caption preference was written to MMKV and shown
 * in the `CaptionCustomizer` UI, and mpv was never told: every caption
 * control was inert. So the thing worth pinning is that the setting
 * actually reaches mpv, and that it keeps reaching it — `sub-*` are
 * mpv *options*, and a `loadfile` re-establishes them, so a one-shot push
 * would apply the preference to the first track in a queue and never
 * again.
 *
 * The mapping is asserted as a pure function (no player needed) and the
 * push is asserted through a mocked `setProperty`.
 */

import {
  captionSettingsToMpvProps,
  toMpvColor,
  useCaptionStyleBridge,
  type CaptionPalette,
} from '../../../src/infrastructure/player/useCaptionStyleBridge';
import {renderHook} from '@testing-library/react-native';
import {
  borderToMpvBorderSize,
  positionToMpvAlign,
  type CaptionSettings,
} from '../../../src/state/useCaptionSettingsStore';

const mockSetProperty = jest.fn();
const mockCommands = {setProperty: mockSetProperty};
const mockTransport: {state: {title: string}} = {state: {title: 'track-a'}};
let mockSettings: CaptionSettings;

jest.mock('../../../src/infrastructure/player/useTransport', () => ({
  useTransport: () => ({commands: mockCommands, state: mockTransport.state}),
}));

jest.mock('../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {primary: '#EDEDED'},
      border: {subtle: '#1A1A1C'},
    },
  }),
}));

jest.mock('../../../src/state/useCaptionSettingsStore', () => {
  const actual = jest.requireActual(
    '../../../src/state/useCaptionSettingsStore',
  );
  return {
    ...actual,
    useCaptionSettingsStore: (selector: (s: unknown) => unknown) =>
      selector(mockSettings),
  };
});

const PALETTE: CaptionPalette = {text: '#FFFFFF', border: '#000000'};

const SETTINGS: CaptionSettings = {
  fontSize: 'medium',
  backgroundOpacity: 'fifty',
  position: 'bottom',
  border: 'thin',
};

/** Flatten to a lookup so assertions read as `sub-…` → value. */
const asMap = (props: ReadonlyArray<[string, string | number]>) =>
  Object.fromEntries(props);

describe('toMpvColor', () => {
  it('appends an opaque alpha to a 6-digit hex', () => {
    expect(toMpvColor('#EDEDED')).toBe('#EDEDEDFF');
  });

  it('expands the 3-digit shorthand', () => {
    expect(toMpvColor('#FFF')).toBe('#FFFFFFFF');
  });

  it('honours an explicit alpha', () => {
    expect(toMpvColor('#EDEDED', '80')).toBe('#EDEDED80');
  });

  it('does not double up an alpha that is already present', () => {
    // mpv would read this as an 8-digit colour with the wrong alpha, so
    // the pass-through case matters more than it looks.
    expect(toMpvColor('#EDEDEDFF')).toBe('#EDEDEDFF');
  });
});

describe('captionSettingsToMpvProps', () => {
  it('maps every V19 setting onto an mpv property', () => {
    const map = asMap(captionSettingsToMpvProps(SETTINGS, PALETTE));

    expect(map['sub-font-size']).toBe(24);
    expect(map['sub-back-color']).toBe('#00000080');
    expect(map['sub-border-size']).toBe(2);
    expect(map['sub-color']).toBe(PALETTE.text);
    expect(map['sub-border-color']).toBe(PALETTE.border);
  });

  it('keeps sub-pos and sub-align in agreement', () => {
    // These two move different things: sub-pos places the caption BOX,
    // sub-align decides which edge the text hangs off. Setting one
    // without the other puts the text on the wrong edge of its own box,
    // so a position change has to move both.
    const bottom = asMap(captionSettingsToMpvProps(SETTINGS, PALETTE));
    expect(bottom['sub-pos']).toBe(95);
    expect(bottom['sub-align']).toBe(10);

    const top = asMap(
      captionSettingsToMpvProps({...SETTINGS, position: 'top'}, PALETTE),
    );
    expect(top['sub-pos']).toBe(5);
    expect(top['sub-align']).toBe(0);
  });

  it('maps each font size to a larger pixel value', () => {
    const size = (v: CaptionSettings['fontSize']) =>
      asMap(captionSettingsToMpvProps({...SETTINGS, fontSize: v}, PALETTE))[
        'sub-font-size'
      ];

    expect(size('small')).toBeLessThan(size('medium') as number);
    expect(size('medium')).toBeLessThan(size('large') as number);
    expect(size('large')).toBeLessThan(size('extra-large') as number);
  });

  it('maps "no outline" to a border size of 0', () => {
    const map = asMap(
      captionSettingsToMpvProps({...SETTINGS, border: 'none'}, PALETTE),
    );
    expect(map['sub-border-size']).toBe(0);
    expect(borderToMpvBorderSize('none')).toBe(0);
  });

  it('gives "top" the top anchor and "bottom" the default anchor', () => {
    // mpv's own default is 10, so bottom spends no change at all.
    expect(positionToMpvAlign('top')).toBe(0);
    expect(positionToMpvAlign('bottom')).toBe(10);
  });
});

describe('useCaptionStyleBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransport.state = {title: 'track-a'};
    mockSettings = {...SETTINGS};
  });

  it('pushes every property to mpv on mount', async () => {
    await renderHook(() => useCaptionStyleBridge());

    const names = mockSetProperty.mock.calls.map(c => c[0]);
    expect(names).toEqual(
      expect.arrayContaining([
        'sub-font-size',
        'sub-back-color',
        'sub-pos',
        'sub-align',
        'sub-border-size',
        'sub-border-color',
        'sub-color',
      ]),
    );
  });

  it('re-pushes when a setting changes', async () => {
    const {rerender} = await renderHook(() => useCaptionStyleBridge());
    mockSetProperty.mockClear();

    mockSettings = {...SETTINGS, fontSize: 'large'};
    await rerender({});

    expect(mockSetProperty).toHaveBeenCalledWith('sub-font-size', 32);
  });

  it('re-pushes on a media change, so a queued track keeps the preference', async () => {
    const {rerender} = await renderHook(() => useCaptionStyleBridge());
    mockSetProperty.mockClear();

    mockTransport.state = {title: 'track-b'};
    await rerender({});

    // Nothing about the settings changed, so without the mediaKey in the
    // dependency list this would be the "applies to the first track only"
    // bug.
    expect(mockSetProperty).toHaveBeenCalledWith('sub-font-size', 24);
  });

  it('converts the palette into mpv colour form', async () => {
    await renderHook(() => useCaptionStyleBridge());

    // The theme mock's text.primary is #EDEDED (6-digit) → opaque alpha.
    expect(mockSetProperty).toHaveBeenCalledWith('sub-color', '#EDEDEDFF');
    expect(mockSetProperty).toHaveBeenCalledWith(
      'sub-border-color',
      '#1A1A1CFF',
    );
  });
});
