/// <reference types="node" />
/**
 * V19 W3.5 Phase 3.5.2 — `ScrubPreview` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.5.2.
 *
 * Covers:
 *   - renders nothing when visible=false
 *   - renders a timestamp pill when visible (timestamp-only when no keyframes)
 *   - falls back to timestamp-only when keyframes is empty (NO placeholder spinner)
 *   - renders a thumbnail when keyframes are available with a uri
 *   - does NOT render a thumbnail for keyframes without a uri
 *   - clamps the pill+thumbnail to the bar's horizontal extent
 *   - has pointerEvents="none" so it doesn't steal the seek gesture
 *   - uses formatMsAsClock for the timestamp text
 */

import * as React from 'react';
import {render} from '@testing-library/react-native';
import {ScrubPreview} from '../../../../../src/components/player/video/ScrubPreview/ScrubPreview';
import {findClosestKeyframe} from '../../../../../src/infrastructure/player/useKeyframes';

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {surfaceDark: '#0A0A0C', primary: '#0A0A0C', elevated: '#141416', scrimDim: 'rgba(0,0,0,0.45)'},
      border: {subtle: '#1A1A1C', emphasis: 'rgba(255,255,255,0.12)'},
      accent: {gold: '#C9A84C', goldSoft: 'rgba(201,168,76,0.10)'},
      text: {primary: '#EDEDED', secondary: '#80EDEDED', tertiary: '#4DEDEDED'},
      shadow: '#000000',
    },
    spacing: {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24},
    radius: {sm: 8, md: 12, lg: 16},
    typography: {
      caption: {fontSize: 13, lineHeight: 18},
      body2: {fontSize: 15, lineHeight: 22},
    },
  }),
}));

describe('ScrubPreview', () => {
  // The ScrubPreview root is deliberately hidden from screen readers
  // (`accessibilityElementsHidden` + `importantForAccessibility=
  // "no-hide-descendants"`): it is a transient drag affordance, and a
  // VoiceOver cursor parked on it would read a moving timestamp on every
  // pixel of a seek gesture. The seek bar itself owns the position
  // announcement. So every query here opts in via `includeHiddenElements`
  // — correct component behaviour, test-side opt-in.
  const HIDDEN = {includeHiddenElements: true} as const;

  it('renders nothing when visible=false', async () => {
    const {queryByTestId} = await render(
      <ScrubPreview
        visible={false}
        positionMs={60_000}
        centerX={150}
        barWidth={300}
        keyframes={[]}
      />,
    );
    expect(queryByTestId('scrub-preview')).toBeNull();
  });

  it('renders a timestamp pill when visible (timestamp-only)', async () => {
    const {getByText, getByTestId} = await render(
      <ScrubPreview
        visible
        positionMs={60_000}
        centerX={150}
        barWidth={300}
        keyframes={[]}
      />,
    );
    expect(getByText('1:00', HIDDEN)).toBeTruthy();
    expect(getByTestId('scrub-preview-pill', HIDDEN)).toBeTruthy();
  });

  it('formats sub-hour durations as M:SS', async () => {
    const {getByText} = await render(
      <ScrubPreview
        visible
        positionMs={125_000}
        centerX={150}
        barWidth={300}
        keyframes={[]}
      />,
    );
    expect(getByText('2:05', HIDDEN)).toBeTruthy();
  });

  it('formats hour+ durations as H:MM:SS', async () => {
    const {getByText} = await render(
      <ScrubPreview
        visible
        positionMs={3_725_000}
        centerX={150}
        barWidth={300}
        keyframes={[]}
      />,
    );
    expect(getByText('1:02:05', HIDDEN)).toBeTruthy();
  });

  it('renders a thumbnail when a keyframe with uri is available', async () => {
    const {getByText, getByTestId} = await render(
      <ScrubPreview
        visible
        positionMs={60_000}
        centerX={150}
        barWidth={300}
        keyframes={[
          {positionMs: 0, uri: ''},
          {positionMs: 60_000, uri: 'file:///cache/keyframes/60s.jpg'},
        ]}
      />,
    );
    expect(getByText('1:00', HIDDEN)).toBeTruthy();
    expect(getByTestId('scrub-preview-thumbnail', HIDDEN)).toBeTruthy();
    expect(getByTestId('scrub-preview-pill', HIDDEN)).toBeTruthy();
  });

  it('does NOT render a thumbnail for keyframes without a uri', async () => {
    const {queryByTestId} = await render(
      <ScrubPreview
        visible
        positionMs={60_000}
        centerX={150}
        barWidth={300}
        keyframes={[{positionMs: 60_000, uri: ''}]}
      />,
    );
    expect(queryByTestId('scrub-preview-thumbnail', HIDDEN)).toBeNull();
    // Pill still renders.
    expect(queryByTestId('scrub-preview-pill', HIDDEN)).toBeTruthy();
  });

  it('clamps the pill+thumbnail to the bar bounds (left edge)', async () => {
    // A thumbnail is REQUIRED for this to be a clamping test: with no
    // keyframe the pill's total width is 0, so `left` is just `centerX`
    // and there is nothing to overflow. With a 96px thumbnail at
    // centerX=5: desiredLeft = 5 - 48 = -43 → clamped up to 0.
    const {getByTestId} = await render(
      <ScrubPreview
        visible
        positionMs={60_000}
        centerX={5} // near the left edge — would overflow left
        barWidth={300}
        keyframes={[{positionMs: 60_000, uri: 'file:///cache/60.jpg'}]}
      />,
    );
    const container = getByTestId('scrub-preview', HIDDEN);
    const style = Array.isArray(container.props.style)
      ? container.props.style.flat(Infinity)
      : [container.props.style];
    const left = style.find(
      (s: object) => typeof (s as {left?: number}).left === 'number',
    );
    expect((left as {left: number}).left).toBe(0);
  });

  it('tracks centerX exactly when there is no thumbnail (zero width)', async () => {
    // The counterpart to the clamp above: with nothing to lay out, the
    // pill is anchored on centerX rather than pinned to an edge.
    const {getByTestId} = await render(
      <ScrubPreview
        visible
        positionMs={60_000}
        centerX={5}
        barWidth={300}
        keyframes={[]}
      />,
    );
    const container = getByTestId('scrub-preview', HIDDEN);
    const style = Array.isArray(container.props.style)
      ? container.props.style.flat(Infinity)
      : [container.props.style];
    const left = style.find(
      (s: object) => typeof (s as {left?: number}).left === 'number',
    );
    expect((left as {left: number}).left).toBe(5);
  });

  it('clamps the pill+thumbnail to the bar bounds (right edge)', async () => {
    const {getByTestId} = await render(
      <ScrubPreview
        visible
        positionMs={60_000}
        centerX={295} // near the right edge of a 300-wide bar
        barWidth={300}
        keyframes={[{positionMs: 60_000, uri: 'file:///cache/60.jpg'}]}
      />,
    );
    const container = getByTestId('scrub-preview', HIDDEN);
    const style = Array.isArray(container.props.style)
      ? container.props.style.flat(Infinity)
      : [container.props.style];
    const left = style.find(
      (s: object) => typeof (s as {left?: number}).left === 'number',
    );
    // Container width = 96 (thumbnail). maxLeft = 300 - 96 = 204.
    // centerX - 96/2 = 295 - 48 = 247 → clamped to 204.
    expect((left as {left: number}).left).toBeLessThanOrEqual(204);
  });

  it('pointerEvents is none (does not steal the seek gesture)', async () => {
    const {getByTestId} = await render(
      <ScrubPreview
        visible
        positionMs={60_000}
        centerX={150}
        barWidth={300}
        keyframes={[]}
      />,
    );
    expect(getByTestId('scrub-preview', HIDDEN).props.pointerEvents).toBe(
      'none',
    );
  });
});

describe('findClosestKeyframe (pure helper)', () => {
  const samples = [
    {positionMs: 0, uri: 'a'},
    {positionMs: 60_000, uri: 'b'},
    {positionMs: 120_000, uri: 'c'},
    {positionMs: 180_000, uri: 'd'},
  ];

  it('returns null for an empty sample list', () => {
    expect(findClosestKeyframe([], 60_000)).toBeNull();
  });

  it('returns the exact match when the position is on a keyframe', () => {
    expect(findClosestKeyframe(samples, 60_000)).toEqual(samples[1]);
  });

  it('returns the closest sample when the position is between keyframes', () => {
    // 100k is 40k from the 60k sample and 20k from the 120k sample, so
    // the 120k snapshot wins outright. (A target of 90k would be a
    // 30k/30k tie — the linear scan keeps the first on an exact tie.)
    expect(findClosestKeyframe(samples, 100_000)).toEqual(samples[2]);
  });

  it('resolves an exact tie to the earlier sample', () => {
    expect(findClosestKeyframe(samples, 90_000)).toEqual(samples[1]);
  });

  it('returns the boundary sample for positions past the last keyframe', () => {
    expect(findClosestKeyframe(samples, 200_000)).toEqual(samples[3]);
  });

  it('returns the first sample for positions before the first keyframe', () => {
    expect(findClosestKeyframe(samples, -10)).toEqual(samples[0]);
  });
});
