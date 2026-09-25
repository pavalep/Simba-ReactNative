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

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      border: {
        subtle: '#1A1A1C',
        emphasis: '#3A3A3E',
      },
    },
    spacing: {md: 16, sm: 8, lg: 24},
    typography: {body1: {fontSize: 16}},
  }),
}));

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
    const fill = getByTestId('fill');
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

  it('uses the theme border.emphasis token for the fill color (no raw hex)', async () => {
    const {getByTestId} = await render(
      <BufferedRangeFill
        normalizedWindow={{startMs: 0, endMs: 1000}}
        width={300}
        durationMs={300_000}
        testID="fill"
      />,
    );
    const fill = getByTestId('fill');
    const style = Array.isArray(fill.props.style)
      ? fill.props.style.flat(Infinity)
      : [fill.props.style];
    const bg = style.find(
      (s: object) =>
        (s as {backgroundColor?: string}).backgroundColor !== undefined,
    );
    expect((bg as {backgroundColor: string}).backgroundColor).toBe('#3A3A3E');
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
    const fill = getByTestId('fill');
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
    const fill = first.getByTestId('fill');
    const style = Array.isArray(fill.props.style)
      ? fill.props.style.flat(Infinity)
      : [fill.props.style];
    const width = style.find(
      (s: object) => (s as {width?: number}).width !== undefined,
    );
    expect((width as {width: number}).width).toBe(110);
  });
});
