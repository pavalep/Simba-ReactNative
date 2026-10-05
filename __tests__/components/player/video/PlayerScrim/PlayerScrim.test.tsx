/// <reference types="node" />
/**
 * V19 W7.2 — `PlayerScrim`: the one backdrop for the whole player chrome.
 *
 * Source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md` §1.1 / §3.1 and
 * invariant I12 in `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §0.3.
 *
 * The defect: `TransportBar` had NO background at all, so every icon in
 * the transport was drawn straight onto an arbitrary film frame. On a
 * bright frame the white-80% on-media ink washed out; on a dark frame
 * only the gold accent read. That is what made the chrome look like it
 * had *partially* rendered.
 *
 * The rule this suite exists to enforce is subtle and easy to undo: the
 * scrim must be TRANSPARENT through the middle. A gradient that is dark
 * everywhere is just a black slab that happens to be a gradient, and it
 * would dim the picture — the one thing the player exists to show. So
 * the assertions below check the SHAPE of the ramp, not merely that a
 * gradient exists.
 */

import * as React from 'react';
import {render} from '@testing-library/react-native';
import {PlayerScrim, SCRIM_STOPS} from '../../../../../src/components/player/video/PlayerScrim/PlayerScrim';

// `jest.config.js` maps `react-native-linear-gradient` to a host-component
// string, so the gradient renders as `<LinearGradient>` and its
// `colors` / `locations` props are directly assertable. That is what
// makes the SHAPE testable at all — a real native component would show
// nothing in a unit test.
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

const DARK = jest.requireActual('../../../../../src/theme/tokens')
  .darkTokens.colors;

/** The alpha out of an `rgba(r,g,b,a)` string, or NaN if not one. */
function alphaOf(color: string): number {
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (!m) return NaN;
  const parts = m[1].split(',').map(s => Number(s.trim()));
  return parts.length === 4 ? parts[3] : 1;
}

describe('PlayerScrim', () => {
  it('renders', async () => {
    const {getByTestId} = await render(<PlayerScrim />);
    expect(getByTestId('player-scrim')).toBeTruthy();
  });

  // I12: the scrim is a BACKDROP. `VideoSurface` beneath owns the tap
  // that toggles the chrome; an opaque scrim would swallow it, and the
  // user would tap a dead zone that dims the picture and does nothing.
  it('never intercepts touches', async () => {
    const {getByTestId} = await render(<PlayerScrim />);
    expect(getByTestId('player-scrim').props.pointerEvents).toBe('none');
  });

  it('fills the screen it is laid out in', async () => {
    const {getByTestId} = await render(<PlayerScrim />);
    const style = getByTestId('player-scrim').props.style;
    expect(style).toMatchObject({position: 'absolute', top: 0, left: 0});
  });

  // ── The shape of the ramp ───────────────────────────────────────────

  it('is fully transparent at the very top, so the picture is not tinted', async () => {
    const {getByTestId} = await render(<PlayerScrim />);
    const colors: string[] = getByTestId('player-scrim').props.colors;
    expect(alphaOf(colors[0])).toBe(0);
  });

  it('is fully transparent again across the middle of the frame', async () => {
    const {getByTestId} = await render(<PlayerScrim />);
    const colors: string[] = getByTestId('player-scrim').props.colors;
    const locations: number[] = getByTestId('player-scrim').props.locations;

    // The middle band is where the VIDEO is. This single assertion is
    // the whole reason the component exists: a scrim that darkens the
    // middle is a black slab, however many stops it has.
    const middleIndex = locations.findIndex(l => l === 0.62);
    expect(middleIndex).toBeGreaterThan(0);
    expect(alphaOf(colors[middleIndex])).toBe(0);
  });

  it('darkens the header band where the back / title / lock controls sit', async () => {
    const {getByTestId} = await render(<PlayerScrim />);
    const colors: string[] = getByTestId('player-scrim').props.colors;
    expect(alphaOf(colors[1])).toBeGreaterThan(0);
  });

  it('darkens the transport band at least as much as the header band', async () => {
    const {getByTestId} = await render(<PlayerScrim />);
    const colors: string[] = getByTestId('player-scrim').props.colors;
    // The scrub track and the gold thumb need a darker bed than the
    // title text does, or the thumb reads as a smudge rather than a lit
    // element.
    expect(alphaOf(colors[4])).toBeGreaterThanOrEqual(alphaOf(colors[1]));
  });

  it('never exceeds full opacity anywhere — it is a scrim, not a curtain', async () => {
    const {getByTestId} = await render(<PlayerScrim />);
    const colors: string[] = getByTestId('player-scrim').props.colors;
    for (const c of colors) {
      expect(alphaOf(c)).toBeLessThan(1);
    }
  });

  // `LinearGradient` requires both arrays to be the same length and its
  // locations to ascend. A mismatch renders nothing at all, silently.
  it('emits a well-formed ramp: matching lengths, ascending locations, 0..1', async () => {
    const {getByTestId} = await render(<PlayerScrim />);
    const node = getByTestId('player-scrim');
    const colors: string[] = node.props.colors;
    const locations: number[] = node.props.locations;

    expect(colors).toHaveLength(locations.length);
    expect(locations[0]).toBe(0);
    expect(locations[locations.length - 1]).toBe(1);
    for (let i = 1; i < locations.length; i++) {
      expect(locations[i]).toBeGreaterThan(locations[i - 1]);
    }
  });

  // ── Token discipline (I12's second half) ────────────────────────────

  it('derives its alphas from the playerScrim tokens, not raw literals', async () => {
    const {getByTestId} = await render(<PlayerScrim />);
    const colors: string[] = getByTestId('player-scrim').props.colors;
    const allowed = new Set(Object.values(DARK.background.playerScrim));
    for (const c of colors) {
      expect(allowed.has(c)).toBe(true);
    }
  });

  // The scrim only ever sits over a video frame, which is dark in BOTH
  // themes. The near-identical `background.scrim` / `scrimDeep` tokens
  // are the trap: they are theme-dependent, and a light-theme player
  // would put a light scrim over a black film.
  it('uses an always-dark scrim, identical in light and dark themes', () => {
    const tokens = jest.requireActual('../../../../../src/theme/tokens');
    expect(tokens.lightTokens.colors.background.playerScrim).toEqual(
      tokens.darkTokens.colors.background.playerScrim,
    );
  });

  it('declares every band its stops reference', async () => {
    const bands = new Set(SCRIM_STOPS.map(s => s.band));
    for (const band of bands) {
      expect(DARK.background.playerScrim[band]).toBeDefined();
    }
  });
});
