/**
 * V19 W2 Phase 2.2 — `BufferedRangeFill` (the buffered-island renderer).
 *
 * Renders one flat-fill rectangle per buffered island inside the
 * TransportBar's progress row, so the user can see the data that is
 * DOWNLOADED BUT NOT YET PLAYED. The colour is the brand gold at a
 * reduced alpha — Plex's pattern, where the buffered fill is the same
 * hue as the played fill rather than a neutral grey, so the two read
 * as one family and the difference reads as "played" vs "buffered".
 *
 * V19 W8.7 — this used to paint `colors.border.emphasis`, which is
 * `rgba(255,255,255,0.12)` in the dark palette and `rgba(0,0,0,0.10)`
 * in the light one. On a 3 px line over a video frame BOTH are
 * effectively invisible, so the buffered range could not be
 * distinguished from the empty track (or from nothing at all). It now
 * uses `background.seekTrack.buffered`, an always-dark always-on-media
 * token family — see the doc comment on `seekTrack` in
 * `src/theme/tokens.ts`.
 *
 * ## It draws EVERY island, not one window
 *
 * mpv holds a LIST of cached regions (`demux/demux.c`, `in->ranges[]`),
 * so a seek that jumps away leaves the old region cached and starts a
 * new one. Drawing only the first region hid the one the user had
 * actually seeked to. Video.js's `LoadProgressBar` draws one element
 * per buffered range; this does the same. See `BufferedSegments` in
 * `src/infrastructure/player/useTransport.ts` for the full rule and
 * the shipping-precedent table.
 *
 * ## Geometry contract
 *   - `width` prop is the parent track width (the TransportBar
 *     measures it via `onLayout` and passes it down so this
 *     primitive is layout-pure)
 *   - each segment's left edge = `(segment.startMs / durationMs) * width`
 *   - each segment's right edge = `(segment.endMs / durationMs) * width`
 *   - when there are no segments, renders nothing
 *
 * Why render nothing rather than a zero-width placeholder: a stale
 * "0% fill" would flicker during gap transitions (the playhead briefly
 * leaves a buffered range while the next range is still loading).
 *
 * ## The z-order IS the "played vs buffered" rule
 *
 * These fills sit ON TOP of the empty track (which the TransportBar
 * owns) and BENEATH the opaque played fill and the thumb. The played
 * fill covers 0 → playhead, so:
 *
 *   - a segment entirely BEHIND the playhead is completely covered
 *   - a segment that STRADDLES the playhead shows only the part ahead
 *     of it
 *   - a segment AHEAD of the playhead shows in full
 *
 * That is exactly ExoPlayer's partition (`DefaultTimeBar` clips its
 * buffered rect to `scrubberBar.right`), generalised to islands, and it
 * is why no explicit clip is needed here.
 *
 * ## The 2 px floor
 *
 * A segment narrower than 2 px would render as a sub-pixel smudge, so
 * a segment is drawn at least `MIN_SEGMENT_PX` wide. This is hls.js's
 * rule (`Math.max(2, end - start)` in its reference player). It can
 * over-claim by at most 2 px of track — under 0.3 % of a feature
 * film — and it is what keeps a freshly-created island visible at all.
 *
 * The component is layout-pure: no animation hooks, no gesture
 * handlers, no state. TransportBar owns the pan/tap gesture and
 * re-renders this primitive when the segments mutate.
 */

import * as React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import type {BufferedRange} from '../../../../infrastructure/player';

/** The narrowest a buffered island is ever drawn. See the doc above. */
const MIN_SEGMENT_PX = 2;

export interface BufferedRangeFillProps {
  /** Every buffered island, already merged. */
  segments: readonly BufferedRange[];
  /** Total track width in pixels (from `onLayout`). */
  width: number;
  /** Total media duration in ms. Required so we can normalize the
   *  start/end positions to fractions of the track width. */
  durationMs: number;
  /** Track height in pixels. Defaults to 3 (the Apple-Music-style
   *  hairline). */
  height?: number;
  /** Test seam: when set, each segment is rendered with the testID
   *  `<testID>-<index>` so a test can address the islands
   *  individually. Defaults to undefined (no testID). */
  testID?: string;
}

export const BufferedRangeFill: React.FC<BufferedRangeFillProps> = ({
  segments,
  width,
  durationMs,
  height = 3,
  testID,
}) => {
  const {colors} = useTheme();

  if (segments.length === 0) return null;
  if (width <= 0 || durationMs <= 0) return null;

  return (
    <>
      {segments.map((segment, index) => {
        const startPx = (segment.startMs / durationMs) * width;
        const endPx = (segment.endMs / durationMs) * width;
        const rawWidth = endPx - startPx;
        // An inverted or empty range is a DATA ERROR, not a sliver: paint
        // nothing rather than claim 2 px of buffer that is not there.
        // The floor only applies to a range that really has length.
        const fillWidth =
          rawWidth <= 0
            ? 0
            : Math.max(
                0,
                Math.min(width - startPx, Math.max(MIN_SEGMENT_PX, rawWidth)),
              );

        return (
          <View
            key={`${segment.startMs}-${segment.endMs}`}
            pointerEvents="none"
            testID={testID ? `${testID}-${index}` : undefined}
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
      })}
    </>
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
