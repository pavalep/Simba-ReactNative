/// <reference types="node" />
/**
 * V19 W2 Phase 2.2 — `BufferedRangeFill` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 2.2.
 *
 * Covers:
 *   - renders nothing when normalizedWindow is null
 *   - renders nothing when width or duration is invalid
 *   - rendered width = (end - start) / duration * parentWidth
 *   - rendered left = start / duration * parentWidth
 *   - re-renders when the window mutates
 *   - uses the theme's `border.emphasis` token (no raw hex)
 */

import * as React from 'react';
import {render} from '@testing-library/react-native';
import {BufferedRangeFill} from '../../../../../src/components/player/video/TransportBar/BufferedRangeFill';

jest.mock('../../../../../src/theme', () => {
  // Built from the REAL palette rather than a hand-written stub.
  //
  // W8.7: this suite used to carry its own two-colour `colors` object,
  // so adding a token to the theme could not break it — and in fact did
  // not, until the component started reading `background.seekTrack` and
  // the stub had no `background` at all. A partial stub cannot fail when
  // the contract it is standing in for grows, which is the one thing a
  // theme mock has to be able to do.
  const {darkTokens} = jest.requireActual(
    '../../../../../src/theme/tokens',
  );
  return {
    useTheme: () => ({
      colors: darkTokens.colors,
      spacing: {md: 16, sm: 8, lg: 24},
      typography: darkTokens.typography,
    }),
  };
});

/**
 * The fill span is `accessibilityElementsHidden` — correct: it is
 * decorative and must stay out of the accessibility tree. RNTL 14
 * therefore excludes it from queries by default, so a test that
 * asserts on it must opt in explicitly.
 */
const HIDDEN = {includeHiddenElements: true} as const;

describe('BufferedRangeFill', () => {
  it('renders nothing when normalizedWindow is null', async () => {
    const {toJSON} = await render(
      <BufferedRangeFill
        normalizedWindow={null}
        width={300}
        durationMs={300_000}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when width is 0', async () => {
    const {toJSON} = await render(
      <BufferedRangeFill
        normalizedWindow={{startMs: 0, endMs: 1000}}
        width={0}
        durationMs={300_000}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when durationMs is 0', async () => {
    const {toJSON} = await render(
      <BufferedRangeFill
        normalizedWindow={{startMs: 0, endMs: 1000}}
        width={300}
        durationMs={0}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the correct width for a mid-track range', async () => {
    const {getByTestId} = await render(
      <BufferedRangeFill
        normalizedWindow={{startMs: 90_000, endMs: 200_000}}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    const fill = getByTestId('fill', HIDDEN);
    const style = Array.isArray(fill.props.style)
      ? fill.props.style.flat(Infinity)
      : [fill.props.style];
    // start = (90_000 / 300_000) * 300 = 90
    // width = ((200_000 - 90_000) / 300_000) * 300 = 110
    const left = style.find(
      (s: object) => (s as {left?: number}).left !== undefined,
    );
    const width = style.find(
      (s: object) => (s as {width?: number}).width !== undefined,
    );
    expect((left as {left: number}).left).toBe(90);
    expect((width as {width: number}).width).toBe(110);
  });

  it('paints with the theme seek-track token, not a raw hex', async () => {
    // W8.7: this was `colors.border.emphasis`, which in the dark palette
    // is `rgba(255,255,255,0.12)` — indistinguishable from nothing on a
    // 4 px rail over video, which is why the buffered range could not be
    // seen at all. The assertion is against the THEME value rather than
    // a literal, so it fails if the component ever goes back to
    // hardcoding a colour, and it follows the palette if the token moves.
    const {getByTestId} = await render(
      <BufferedRangeFill
        normalizedWindow={{startMs: 0, endMs: 1000}}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    const fill = getByTestId('fill', HIDDEN);
    const style = Array.isArray(fill.props.style)
      ? fill.props.style.flat(Infinity)
      : [fill.props.style];
    const bg = style.find(
      (s: object) =>
        (s as {backgroundColor?: string}).backgroundColor !== undefined,
    );
    const {darkTokens} = jest.requireActual(
      '../../../../../src/theme/tokens',
    );
    expect((bg as {backgroundColor: string}).backgroundColor).toBe(
      darkTokens.colors.background.seekTrack.buffered,
    );
  });

  it('paints a buffered range that is visibly LIGHTER than the empty rail', async () => {
    // The whole point of the two-band rail. If these two ever collapse to
    // the same value, the buffered range stops being readable as a
    // separate state — which is the defect W8.7 was opened for.
    const {darkTokens} = jest.requireActual(
      '../../../../../src/theme/tokens',
    );
    const {empty, buffered} = darkTokens.colors.background.seekTrack;
    expect(empty).not.toBe(buffered);
    const alpha = (value: string) =>
      Number(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/.exec(value)?.[1] ?? '1');
    expect(alpha(buffered)).toBeGreaterThan(alpha(empty));
  });

  it('clamps the fill width to 0 when end < start', async () => {
    // Defensive — should never happen in production but the spec
    // asks for at most 1px slop, so this is a no-flake guard.
    const {getByTestId} = await render(
      <BufferedRangeFill
        normalizedWindow={{startMs: 200_000, endMs: 100_000}}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    const fill = getByTestId('fill', HIDDEN);
    const style = Array.isArray(fill.props.style)
      ? fill.props.style.flat(Infinity)
      : [fill.props.style];
    const width = style.find(
      (s: object) => (s as {width?: number}).width !== undefined,
    );
    expect((width as {width: number}).width).toBe(0);
  });

  it('re-renders when normalizedWindow mutates', async () => {
    const first = await render(
      <BufferedRangeFill
        normalizedWindow={{startMs: 0, endMs: 60_000}}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    await first.rerender(
      <BufferedRangeFill
        normalizedWindow={{startMs: 90_000, endMs: 200_000}}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    const fill = first.getByTestId('fill', HIDDEN);
    const style = Array.isArray(fill.props.style)
      ? fill.props.style.flat(Infinity)
      : [fill.props.style];
    const width = style.find(
      (s: object) => (s as {width?: number}).width !== undefined,
    );
    expect((width as {width: number}).width).toBe(110);
  });
});
