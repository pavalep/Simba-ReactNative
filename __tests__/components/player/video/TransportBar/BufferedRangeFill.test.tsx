/// <reference types="node" />
/**
 * `BufferedRangeFill` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 2.2,
 * plus the shipping-precedent review of 2026-10-20.
 *
 * Covers:
 *   - renders nothing when there are no segments
 *   - renders nothing when width or duration is invalid
 *   - rendered width = (end - start) / duration * parentWidth
 *   - rendered left = start / duration * parentWidth
 *   - ONE view per buffered island (the segment map)
 *   - a sub-pixel island is still drawn (the 2 px floor)
 *   - an island is never painted past the right edge of the track
 *   - an inverted range paints nothing rather than a 2 px sliver
 *   - paints with the theme's `seekTrack.buffered` token (no raw hex)
 *   - the buffered tone sits BETWEEN the empty rail and the played fill
 *   - re-renders when the segments mutate
 */

import * as React from 'react';
import {render} from '@testing-library/react-native';
// RNTL 14's queries return `TestInstance` (from `test-renderer`), not
// the older `react-test-renderer` `ReactTestInstance`.
import type {TestInstance} from 'test-renderer';
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

/** Pull the flattened style object out of a rendered node. */
function styleOf(node: TestInstance): Record<string, unknown> {
  const style = Array.isArray(node.props.style)
    ? (node.props.style as unknown[]).flat(Infinity)
    : [node.props.style];
  return Object.assign(
    {},
    ...style.filter(Boolean),
  ) as Record<string, unknown>;
}

/** The alpha of an `rgba(...)` colour, or 1 for an opaque one. */
function alpha(value: string): number {
  const match = /rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/.exec(value);
  return match ? Number(match[1]) : 1;
}

describe('BufferedRangeFill', () => {
  it('renders nothing when there are no segments', async () => {
    const {toJSON} = await render(
      <BufferedRangeFill segments={[]} width={300} durationMs={300_000} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when width is 0', async () => {
    const {toJSON} = await render(
      <BufferedRangeFill
        segments={[{startMs: 0, endMs: 1000}]}
        width={0}
        durationMs={300_000}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when durationMs is 0', async () => {
    const {toJSON} = await render(
      <BufferedRangeFill
        segments={[{startMs: 0, endMs: 1000}]}
        width={300}
        durationMs={0}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the correct width for a mid-track range', async () => {
    const {getByTestId} = await render(
      <BufferedRangeFill
        segments={[{startMs: 90_000, endMs: 200_000}]}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    const style = styleOf(getByTestId('fill-0', HIDDEN));
    // start = (90_000 / 300_000) * 300 = 90
    // width = ((200_000 - 90_000) / 300_000) * 300 = 110
    expect(style.left).toBe(90);
    expect(style.width).toBe(110);
  });

  it('renders ONE view per buffered island', async () => {
    // The whole point of the segment map: mpv keeps a LIST of cached
    // regions, and the one the user seeked to used to be invisible
    // because only the first range was painted.
    const {getAllByTestId} = await render(
      <BufferedRangeFill
        segments={[
          {startMs: 0, endMs: 60_000},
          {startMs: 200_000, endMs: 260_000},
          {startMs: 280_000, endMs: 300_000},
        ]}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    const fills = getAllByTestId(/^fill-\d+$/, HIDDEN);
    expect(fills).toHaveLength(3);

    // Each island keeps its own position.
    expect(styleOf(fills[0]).left).toBe(0);
    expect(styleOf(fills[1]).left).toBe(200);
    expect(styleOf(fills[2]).left).toBe(280);
    expect(styleOf(fills[0]).width).toBe(60);
    expect(styleOf(fills[1]).width).toBe(60);
    expect(styleOf(fills[2]).width).toBe(20);
  });

  it('draws a sub-pixel island at the 2 px floor', async () => {
    // hls.js's rule: a range narrower than 2 px renders as a smudge, so
    // it is drawn at the floor. Without this a freshly-created island is
    // invisible, which is the "islands do not show up" symptom.
    const {getByTestId} = await render(
      <BufferedRangeFill
        segments={[{startMs: 100_000, endMs: 100_100}]}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    const style = styleOf(getByTestId('fill-0', HIDDEN));
    // 100 ms of 300_000 ms over 300 px is 0.1 px.
    expect(style.width).toBe(2);
  });

  it('never paints an island past the right edge of the track', async () => {
    const {getByTestId} = await render(
      <BufferedRangeFill
        segments={[{startMs: 299_000, endMs: 300_000}]}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    const style = styleOf(getByTestId('fill-0', HIDDEN));
    expect(Number(style.left) + Number(style.width)).toBeLessThanOrEqual(300);
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
        segments={[{startMs: 0, endMs: 1000}]}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    const {darkTokens} = jest.requireActual(
      '../../../../../src/theme/tokens',
    );
    expect(styleOf(getByTestId('fill-0', HIDDEN)).backgroundColor).toBe(
      darkTokens.colors.background.seekTrack.buffered,
    );
  });

  it('paints a buffered tone that sits BETWEEN the empty rail and the played fill', async () => {
    // The one-hue ladder every shipping player uses (ExoPlayer 20/80/100,
    // YouTube 20/40/100, Shaka 30/54/100, Video.js 50/75/100, Plex amber
    // at 30% against an opaque amber played fill). If the buffered tone
    // collapses onto either neighbour the rail stops being readable as
    // three distinct states.
    const {darkTokens} = jest.requireActual(
      '../../../../../src/theme/tokens',
    );
    const {empty, buffered, played} = darkTokens.colors.background.seekTrack;
    expect(empty).not.toBe(buffered);
    expect(buffered).not.toBe(played);
    expect(alpha(buffered)).toBeGreaterThan(alpha(empty));
    // The played fill is OPAQUE, so its alpha is 1 — the buffered tone
    // must be below that.
    expect(alpha(buffered)).toBeLessThan(alpha(played));
  });

  it('uses the SAME hue for the buffered and the played fill', async () => {
    // Plex's pattern: the buffered fill is the brand colour at a reduced
    // alpha, not a neutral grey. A grey next to a gold played fill reads
    // as unrelated chrome rather than "the same thing, not yet played".
    const {darkTokens} = jest.requireActual(
      '../../../../../src/theme/tokens',
    );
    const {buffered, played} = darkTokens.colors.background.seekTrack;
    const hueOf = (value: string): string[] => {
      const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
      if (hex) {
        return [hex[1], hex[2], hex[3]].map(part =>
          String(parseInt(part, 16)),
        );
      }
      return value
        .replace(/^rgba?\(/, '')
        .replace(/\)$/, '')
        .split(',')
        .slice(0, 3)
        .map(part => part.trim());
    };
    const [br, bg, bb] = hueOf(buffered);
    const [pr, pg, pb] = hueOf(played);
    expect(br).toBe(pr);
    expect(bg).toBe(pg);
    expect(bb).toBe(pb);
  });

  it('paints nothing for an inverted range rather than a sliver', async () => {
    // Defensive — `deriveBufferedSegments` already drops inverted
    // ranges, so this can only be a data error. Painting 2 px would
    // claim buffer that is not there.
    const {getByTestId} = await render(
      <BufferedRangeFill
        segments={[{startMs: 200_000, endMs: 100_000}]}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    expect(styleOf(getByTestId('fill-0', HIDDEN)).width).toBe(0);
  });

  it('re-renders when the segments mutate', async () => {
    const first = await render(
      <BufferedRangeFill
        segments={[{startMs: 0, endMs: 60_000}]}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    await first.rerender(
      <BufferedRangeFill
        segments={[{startMs: 90_000, endMs: 200_000}]}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    expect(styleOf(first.getByTestId('fill-0', HIDDEN)).width).toBe(110);
  });
});
