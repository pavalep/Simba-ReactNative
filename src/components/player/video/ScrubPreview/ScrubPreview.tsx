/**
 * V19 W3.5 Phase 3.5.2 — `ScrubPreview` (Netflix-style tooltip).
 *
 * Renders a centered timestamp pill (and an optional thumbnail
 * when keyframes are available) above the progress thumb while
 * the user is actively scrubbing. Visible only when
 * `visible === true` (the TransportBar flips this on touch-down
 * and off on touch-up).
 *
 * Geometry:
 *   - Positioned absolutely inside the scrub track's parent.
 *   - The pill is centered on the thumb's x-coordinate
 *     (`centerX` prop) but clamped to the bar's horizontal
 *     extent (`barWidth` prop) so it never overflows the
 *     rounded bar corners.
 *   - Sits above the thumb (negative top offset so it floats
 *     like a tooltip).
 *
 * Pointer events:
 *   - `pointerEvents="none"` — the preview MUST NOT steal the
 *     seek gesture. The TransportBar's PanResponder owns the
 *     touch stream end-to-end.
 *
 * Thumbnail fallback:
 *   - When `keyframeSample?.uri` is empty (lib-side sampler not
 *     yet wired, OR sampling failed), the pill renders
 *     timestamp-only. The spec explicitly forbids loading
 *     spinners or placeholder rectangles for missing thumbs.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.7 + TRACKER Phase 3.5.2.
 */

import * as React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import {radius, spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {findClosestKeyframe, type KeyframeSample} from '../../../../infrastructure/player/useKeyframes';
import {formatMsAsClock} from '../../../../infrastructure/player';

export interface ScrubPreviewProps {
  /** Whether the user is actively seeking. */
  visible: boolean;
  /** Scrubbed position in milliseconds (formatted as clock). */
  positionMs: number;
  /** Centered on the thumb's x-coordinate (in the parent's coords). */
  centerX: number;
  /** Width of the bar (in the parent's coords); clamps pill edges. */
  barWidth: number;
  /** Available keyframes for the current file. */
  keyframes: ReadonlyArray<KeyframeSample>;
}

const PILL_HEIGHT = 48;
const THUMBNAIL_HEIGHT = 64;
const THUMBNAIL_WIDTH = 96;
const PILL_GAP_ABOVE_THUMB = 12;

export const ScrubPreview: React.FC<ScrubPreviewProps> = ({
  visible,
  positionMs,
  centerX,
  barWidth,
  keyframes,
}) => {
  const {colors} = useTheme();

  if (!visible) return null;

  const closest = findClosestKeyframe(keyframes, positionMs);
  const hasThumbnail = !!(closest && closest.uri);
  const totalWidth = hasThumbnail ? THUMBNAIL_WIDTH : 0;
  const totalHeight =
    (hasThumbnail ? THUMBNAIL_HEIGHT : 0) +
    (hasThumbnail ? PILL_GAP_ABOVE_THUMB : 0) +
    PILL_HEIGHT;

  // Clamp the left edge so the pill + thumbnail never overflow
  // the bar's horizontal extent.
  const desiredLeft = centerX - totalWidth / 2;
  const minLeft = 0;
  const maxLeft = Math.max(0, barWidth - totalWidth);
  const left = Math.max(minLeft, Math.min(maxLeft, desiredLeft));

  return (
    <View
      testID="scrub-preview"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.container, {left, top: -totalHeight - 4, width: totalWidth}]}
    >
      {hasThumbnail ? (
        <Image
          testID="scrub-preview-thumbnail"
          source={{uri: closest!.uri}}
          style={[
            styles.thumbnail,
            {borderColor: colors.border.emphasis},
          ]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View
        testID="scrub-preview-pill"
        style={[
          styles.pill,
          {
            backgroundColor: colors.background.surfaceDark,
            borderColor: colors.border.emphasis,
          },
        ]}
      >
        <AppText
          variant="caption"
          color="primary"
          style={styles.timestamp}
        >
          {formatMsAsClock(positionMs)}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  thumbnail: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: PILL_GAP_ABOVE_THUMB,
  },
  pill: {
    minWidth: 64,
    height: PILL_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timestamp: {
    fontVariant: ['tabular-nums'],
  },
});

export default ScrubPreview;
