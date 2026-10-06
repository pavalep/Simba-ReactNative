/**
 * V19 W2 Phase 2.2 — `BufferedRangeFill` (the buffered-range renderer).
 *
 * Renders a flat-fill rectangle inside the TransportBar's progress
 * row, showing the contiguous buffered range that contains the
 * playhead — visibly lighter than the played fill (gold) and
 * clearly lighter than the empty track.
 *
 * V19 W8.7 — this used to paint `colors.border.emphasis`, which is
 * `rgba(255,255,255,0.12)` in the dark palette and `rgba(0,0,0,0.10)`
 * in the light one. On a 3 px line over a video frame BOTH are
 * effectively invisible, so the buffered range could not be
 * distinguished from the empty track (or from nothing at all). It now
 * uses `background.seekTrack.buffered`, an always-dark always-dark-on-
 * media token family — see the doc comment on `seekTrack` in
 * `src/theme/tokens.ts`.
 *
 * Geometry contract:
 *   - `width` prop is the parent track width (the TransportBar
 *     measures it via `onLayout` and passes it down so this
 *     primitive is layout-pure)
 *   - left edge = `(normalizedWindow.startMs / durationMs) * width`
 *   - right edge = `(normalizedWindow.endMs / durationMs) * width`
 *   - when `normalizedWindow === null`, renders nothing
 *
 * Why null instead of a zero-width placeholder: a stale "0% fill"
 * would flicker during gap transitions (the playhead briefly leaves
 * a buffered range while the next range is still loading). The
 * spec (TRACKER Phase 2.2 §"When normalizedWindow === null") is
 * explicit: render nothing.
 *
 * The component is layout-pure: no animation hooks, no gesture
 * handlers, no state. TransportBar owns the pan/tap gesture and
 * re-renders this primitive when `normalizedWindow` mutates.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.7 + audit §4.B.
 */

import * as React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import type {NormalizedWindow} from '../../../../infrastructure/player';

export interface BufferedRangeFillProps {
  /** The normalized window containing the playhead, or null. */
  normalizedWindow: NormalizedWindow;
  /** Total track width in pixels (from `onLayout`). */
  width: number;
  /** Total media duration in ms. Required so we can normalize the
   *  start/end positions to fractions of the track width. */
  durationMs: number;
  /** Track height in pixels. Defaults to 3 (the Apple-Music-style
   *  hairline). */
  height?: number;
  /** Test seam: when true, renders an absolutely-positioned fill
   *  span at the computed left/right edges with a `testID` for the
   *  unit tests' `getByTestId`. Defaults to undefined (no testID). */
  testID?: string;
}

export const BufferedRangeFill: React.FC<BufferedRangeFillProps> = ({
  normalizedWindow,
  width,
  durationMs,
  height = 3,
  testID,
}) => {
  const {colors} = useTheme();

  if (normalizedWindow === null) return null;
  if (width <= 0 || durationMs <= 0) return null;

  const startPx = (normalizedWindow.startMs / durationMs) * width;
  const endPx = (normalizedWindow.endMs / durationMs) * width;
  const fillWidth = Math.max(0, endPx - startPx);

  // Geometry note: the buffer fill sits ON TOP of the empty track
  // (which the TransportBar owns) and BENEATH the played-fill +
  // thumb. So this View only needs to be the right offset + width;
  // it does not need to clip itself to the track.
  return (
    <View
      pointerEvents="none"
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.fill,
        {
          left: startPx,
          width: fillWidth,
          height,
          backgroundColor: colors.background.seekTrack.buffered,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    // `borderRadius` is half the height so the fill's left/right
    // ends round-match the track. 3px height → 1.5 radius; for
    // taller tracks the caller scales proportionally.
    borderRadius: 9999,
  },
});

export default BufferedRangeFill;
