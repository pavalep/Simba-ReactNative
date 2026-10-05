/// <reference types="node" />
/**
 * V19 W7.3 — `VolumeControl`: the player's audio surface.
 *
 * Source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md` §3.2.
 *
 * The defect: the player had NO audio control at all. `TransportState`
 * carried `volume` and `isMuted` and nothing read them — a volume you
 * could only change by dragging an invisible strip, with no on-screen
 * level and no mute.
 *
 * ## The two assertions this file exists for
 *
 * 1. `the mute glyph really mutes`. A previous draft made the speaker
 *    button labelled "Mute" only reveal a hidden slider, so it never
 *    muted. That is invariant I3 — a control that looks live and does
 *    not do what it says — and it is worse than no control at all. The
 *    label/action match is asserted directly, because the label is the
 *    promise.
 *
 * 2. `mute does not fake itself with setVolume(0)`. `mute` and `volume`
 *    are two different mpv properties. A mute written as a volume write
 *    destroys the level the user had chosen, and the unmute then has to
 *    invent one — which is why players that fake it either come back
 *    silent or come back at 100%. Every other assertion here could pass
 *    against such an implementation; this one cannot.
 */

import * as React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {VolumeControl} from '../../../../../src/components/player/video/TransportBar/VolumeControl';

const mockHaptic = jest.fn();
const mockSetVolume = jest.fn();
const mockSetMuted = jest.fn();
const mockTransport: {
  state: {volume: number; isMuted: boolean};
  commands: {
    setVolume: (v: number) => void;
    setMuted: (m: boolean) => void;
  };
} = {
  state: {volume: 60, isMuted: false},
  commands: {
    setVolume: mockSetVolume,
    setMuted: mockSetMuted,
  },
};

jest.mock('../../../../../src/infrastructure/player', () => {
  const actual = {
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useHaptic',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useTransport',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useReduceMotion',
    ),
  };
  return {
    ...actual,
    useTransport: () => mockTransport,
    useHaptic: () => ({haptic: mockHaptic, isSupported: true}),
  };
});

jest.mock('../../../../../src/theme', () => {
  const actual = jest.requireActual('../../../../../src/theme/tokens');
  const tokens = actual.darkTokens;
  return {
    useTheme: () => ({
      theme: 'dark',
      tokens,
      colors: tokens.colors,
      spacing: tokens.spacing,
      typography: tokens.typography,
      radius: tokens.radius,
      legacy: actual.legacyFromTokens(tokens),
    }),
  };
});

// The slider is a real native component; a host-element stand-in keeps
// its props assertable (`value`, `onValueChange`, …).
jest.mock('@react-native-community/slider', () => 'Slider');

describe('VolumeControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransport.state.volume = 60;
    mockTransport.state.isMuted = false;
  });

  // ── The label/action promise ────────────────────────────────────────

  // This is the test that caught the real defect. A control whose label
  // is "Mute" and whose handler reveals a panel is lying; the label is
  // the promise the user acts on.
  it('the mute glyph really mutes', async () => {
    const {getByLabelText} = await render(<VolumeControl />);
    await act(async () => {
      fireEvent.press(getByLabelText('Mute'));
    });
    expect(mockSetMuted).toHaveBeenCalledWith(true);
  });

  it('the unmute glyph really unmutes', async () => {
    mockTransport.state.isMuted = true;
    const {getByLabelText} = await render(<VolumeControl />);
    await act(async () => {
      fireEvent.press(getByLabelText('Unmute'));
    });
    expect(mockSetMuted).toHaveBeenCalledWith(false);
  });

  it('mutes without changing the level', async () => {
    // The user asked for silence, not for their chosen volume to be
    // overwritten — that is what makes the unmute recoverable.
    const {getByLabelText} = await render(<VolumeControl />);
    await act(async () => {
      fireEvent.press(getByLabelText('Mute'));
    });
    expect(mockSetVolume).not.toHaveBeenCalled();
  });

  // ── The second invariant: mute is not a volume write ────────────────

  it('mute does not fake itself with setVolume(0)', async () => {
    // Mutation check: replacing `commands.setMuted(true)` with
    // `commands.setVolume(0)` fails this test immediately.
    const {getByLabelText} = await render(<VolumeControl />);
    await act(async () => {
      fireEvent.press(getByLabelText('Mute'));
    });
    expect(mockSetVolume).not.toHaveBeenCalled();
  });

  // ── Glyph + label reflect the real state ────────────────────────────

  it('offers "Mute" when audible and "Unmute" when muted', async () => {
    const first = await render(<VolumeControl />);
    expect(first.getByLabelText('Mute')).toBeTruthy();
    expect(() => first.getByLabelText('Unmute')).toThrow();
    // RNTL 14: `unmount` is async and MUST be awaited. A floating
    // promise leaves the teardown pending, and the next test renders
    // into a tree that is still being torn down — which surfaces as
    // every later test in the file failing to find elements that the
    // component demonstrably renders.
    await first.unmount();

    mockTransport.state.isMuted = true;
    const second = await render(<VolumeControl />);
    expect(second.getByLabelText('Unmute')).toBeTruthy();
    expect(() => second.getByLabelText('Mute')).toThrow();
    await second.unmount();
  });

  // The mute glyph must not be hidden from assistive tech in the resting
  // state. An earlier draft put `no-hide-descendants` on the container to
  // suppress a collapsed slider, which also hid the button — so the
  // control could not be reached at all.
  it('the toggle is always reachable by a screen reader', async () => {
    const {getByLabelText} = await render(<VolumeControl />);
    expect(getByLabelText('Mute')).toBeTruthy();
  });

  it('does not hide its own descendants from the accessibility tree', async () => {
    const {getByTestId} = await render(<VolumeControl />);
    expect(
      getByTestId('volume-toggle').parent?.props?.importantForAccessibility,
    ).not.toBe('no-hide-descendants');
  });

  // ── The slider is persistent, not hidden behind a second tap ────────

  it('the slider is visible at rest, not behind a second tap', async () => {
    // Huawei Video / Tencent Video / Apple TV all keep a volume slider in
    // the transport band. A control the user must discover before they
    // can adjust anything is worse than a few pixels of permanent chrome.
    const {getByTestId} = await render(<VolumeControl />);
    expect(getByTestId('volume-slider')).toBeTruthy();
  });

  it('seeds the slider from the live volume', async () => {
    mockTransport.state.volume = 37;
    const {getByTestId} = await render(<VolumeControl />);
    expect(getByTestId('volume-slider').props.value).toBe(37);
  });

  // While muted the slider must READ as silent, or the drag appears to
  // do nothing until the user happens to move it.
  it('a muted slider reads 0, not the underlying volume', async () => {
    mockTransport.state.isMuted = true;
    mockTransport.state.volume = 80;
    const {getByTestId} = await render(<VolumeControl />);
    expect(getByTestId('volume-slider').props.value).toBe(0);
  });

  // Dragging a muted slider up is an implicit unmute in every player the
  // user has ever used. Treating it as anything else leaves them dragging
  // a control that appears to do nothing.
  it('dragging a muted slider up unmutes and applies the new level', async () => {
    mockTransport.state.isMuted = true;
    const {getByTestId} = await render(<VolumeControl />);
    await act(async () => {
      fireEvent(getByTestId('volume-slider'), 'valueChange', 45);
    });
    expect(mockSetMuted).toHaveBeenCalledWith(false);
    expect(mockSetVolume).toHaveBeenCalledWith(45);
  });

  // Dragging a muted slider while it is ALREADY at 0 must NOT unmute —
  // there is nothing to unmute to yet, and the state is unchanged.
  it('dragging a muted slider that stays at 0 does not unmute', async () => {
    mockTransport.state.isMuted = true;
    mockTransport.state.volume = 0;
    const {getByTestId} = await render(<VolumeControl />);
    await act(async () => {
      fireEvent(getByTestId('volume-slider'), 'valueChange', 0);
    });
    expect(mockSetMuted).not.toHaveBeenCalled();
  });

  it('dragging an audible slider does not touch the mute state', async () => {
    const {getByTestId} = await render(<VolumeControl />);
    await act(async () => {
      fireEvent(getByTestId('volume-slider'), 'valueChange', 70);
    });
    expect(mockSetVolume).toHaveBeenCalledWith(70);
    expect(mockSetMuted).not.toHaveBeenCalled();
  });

  it('announces the level, not just the control name', async () => {
    mockTransport.state.volume = 42;
    const {getByTestId} = await render(<VolumeControl />);
    const node = getByTestId('volume-slider');
    expect(node.props.accessibilityLabel).toBe('Volume');
    expect(node.props.accessibilityValue).toMatchObject({now: 42});
  });

  it('gives the slider a 0-100 range with an integer step', async () => {
    const {getByTestId} = await render(<VolumeControl />);
    const node = getByTestId('volume-slider');
    expect(node.props.minimumValue).toBe(0);
    expect(node.props.maximumValue).toBe(100);
    // An integer step keeps the facade's clamp and mpv's value space
    // aligned; a fractional drag would push 43.7 into a 0-100 property.
    expect(node.props.step).toBe(1);
  });
});
