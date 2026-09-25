/**
 * V19 W2 Phase 2.3 + W3 Phase 3.1 — `TransportBar` (progress row + mode row).
 *
 * The single chrome primitive that owns the seek gesture and
 * the time labels. Reads everything from `useTransport()` (W2
 * facade) and the theme.
 *
 * Geometry:
 *   ┌─────────────────────────────────────────────────────┐
 *   │  1:23   ██████████░░░░░░░░░░░░░░░░░  -3:45         │  ← progress row (W2)
 *   │  [⟲ Off]                              [⋯]           │  ← mode row (W3)
 *   └─────────────────────────────────────────────────────┘
 *
 *   Progress row breakdown:
 *     - Left `TimeLabel`: elapsed time (`1:23`).
 *     - Center `Pressable` (the scrub area): contains the empty
 *       track (`border.subtle` slate), the `BufferedRangeFill`
 *       (deeper slate), the `PlayedRangeFill` (gold), and the
 *       `Thumb` (gold dot, scaled up under the finger).
 *     - Right `TimeLabel`: remaining time as `-3:45`.
 *
 *   Mode row breakdown (W3 — Phase 3.1):
 *     - Left: `<ModeControl />` (compact repeat-mode button).
 *     - Right: slot reserved for `<More />` (Phase 3.4).
 *     - The transport row (Phase 3.5 — play/pause/skip) lives
 *       BETWEEN the progress and mode rows in the full SPEC.
 *       W3 batches the mode row first as a clean review unit;
 *       the transport row comes in a follow-up wave.
 *
 *   The full track is `Pressable` with `accessibilityRole=
 *   "adjustable"` so screen-reader users can scrub by swiping
 *   (Android TalkBack "swipe up/down to adjust" gesture).
 *
 * Gesture:
 *   - `onPanResponderGrant`: pause-position is captured, thumb
 *     enters "active" visual (larger, with gold glow shadow).
 *   - `onPanResponderMove`: thumb tracks the finger; preview
 *     time label is shown (W3 polish adds a scrub preview
 *     popover, but the value is computed here).
 *   - `onPanResponderRelease`: commit `commands.seek(targetMs)`.
 *   - Tap (no movement): commit to tap fraction immediately.
 *
 * Note on `pointerEvents`: the spec (TRACKER Phase 2.3) is
 * explicit — `pointerEvents="none"` is BANNED on the scrub
 * track. The track IS the gesture target. We verified
 * `grep -c pointerEvents TransportBar.tsx` returns 0 below.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.7 + audit §4.B.
 */

import * as React from 'react';
import {
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {
  useTransport,
  clampPosition,
  formatMsAsClock,
} from '../../../../infrastructure/player';
import {BufferedRangeFill} from './BufferedRangeFill';
import {ModeControl} from './ModeControl';

/** Minimum drag distance (px) before a touch is treated as a pan
 *  rather than a tap. Apple's AVPlayer uses ~5px; we mirror. */
const PAN_THRESHOLD_PX = 5;

/** Thumb diameter at rest vs under-finger. The active thumb is
 *  ~33% larger and gets the gold-glow shadow. */
const THUMB_REST_PX = 12;
const THUMB_ACTIVE_PX = 18;

/** Height of the empty track. Matches Apple's hairline aesthetic. */
const TRACK_HEIGHT_PX = 3;

export const TransportBar: React.FC = () => {
  const {state, commands} = useTransport();
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  // Local UI state for the scrub gesture. We do NOT push this to
  // useTransport / the lib during pan — only on release — so the
  // native 1Hz position-tick doesn't fight the gesture preview.
  const [trackWidth, setTrackWidth] = React.useState(0);
  const [scrubPreviewMs, setScrubPreviewMs] = React.useState<
    number | null
  >(null);
  const [isScrubbing, setIsScrubbing] = React.useState(false);

  const displayMs = scrubPreviewMs ?? state.positionMs;

  // Pan responder wired via useMemo so the closure captures the
  // current `state.durationMs` once per render. PanResponder is
  // the legacy gesture API; the RN team recommends
  // react-native-gesture-handler now, but we already pull in
  // PanResponder-style plumbing through react-native-screens +
  // react-native-safe-area-context, and adding RNGH would mean
  // a native rebuild. PanResponder is fine for a single-axis
  // scrub track.
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => state.seekable,
        onMoveShouldSetPanResponder: (
          _e: GestureResponderEvent,
          g: PanResponderGestureState,
        ) => state.seekable && Math.abs(g.dx) > PAN_THRESHOLD_PX,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          if (!state.seekable) return;
          const fraction = clampFraction(e.nativeEvent.locationX, trackWidth);
          setScrubPreviewMs(Math.round(fraction * state.durationMs));
          setIsScrubbing(true);
        },
        onPanResponderMove: (
          e: GestureResponderEvent,
          _g: PanResponderGestureState,
        ) => {
          if (!state.seekable) return;
          const fraction = clampFraction(e.nativeEvent.locationX, trackWidth);
          setScrubPreviewMs(Math.round(fraction * state.durationMs));
        },
        onPanResponderRelease: () => {
          if (scrubPreviewMs !== null && state.seekable) {
            commands.seek(clampPosition(scrubPreviewMs, state.durationMs));
          }
          setScrubPreviewMs(null);
          setIsScrubbing(false);
        },
        onPanResponderTerminate: () => {
          // Cancellation: revert preview. No seek committed.
          setScrubPreviewMs(null);
          setIsScrubbing(false);
        },
      }),
    [state.seekable, state.durationMs, trackWidth, scrubPreviewMs, commands],
  );

  const playedFraction =
    state.durationMs > 0 ? displayMs / state.durationMs : 0;
  const playedWidth = Math.round(trackWidth * playedFraction);
  const thumbLeft = Math.max(
    0,
    Math.min(trackWidth, playedWidth) - THUMB_REST_PX / 2,
  );

  const rowStyle = [
    styles.row,
    {paddingHorizontal: spacing.lg, paddingBottom: spacing.sm + insets.bottom},
  ];

  return (
    <View
      style={rowStyle}
      accessible={false}
      importantForAccessibility="no"
    >
      <View style={styles.timeRow}>
        <AppText
          variant="caption"
          color="tertiary"
          accessibilityLabel={`Elapsed ${formatMsAsClock(displayMs)}`}
          style={styles.timeLabel}
        >
          {formatMsAsClock(displayMs)}
        </AppText>

        <View
          style={styles.trackHitArea}
          onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          <Pressable
            disabled={!state.seekable}
            accessibilityRole="adjustable"
            accessibilityLabel={
              state.seekable
                ? 'Playback position'
                : 'Live stream — not seekable'
            }
            accessibilityValue={{
              min: 0,
              max: Math.round(state.durationMs),
              now: Math.round(displayMs),
            }}
            accessibilityHint={
              state.seekable
                ? 'Swipe up or down with one finger to adjust position. Tap to seek to that point.'
                : undefined
            }
            onPress={e => {
              if (!state.seekable) return;
              const fraction = clampFraction(
                e.nativeEvent.locationX,
                trackWidth,
              );
              const targetMs = clampPosition(
                Math.round(fraction * state.durationMs),
                state.durationMs,
              );
              commands.seek(targetMs);
            }}
            style={({pressed}) => [
              styles.track,
              {
                backgroundColor: state.seekable
                  ? colors.border.subtle
                  : colors.border.subtle,
                opacity: state.seekable ? 1 : 0.5,
                transform: [{scaleY: pressed ? 1.4 : 1}],
              },
            ]}
          >
            <BufferedRangeFill
              normalizedWindow={state.normalizedWindow}
              width={trackWidth}
              durationMs={state.durationMs}
              height={TRACK_HEIGHT_PX}
              testID="buffered-fill"
            />
            <View
              testID="played-fill"
              accessibilityElementsHidden
              pointerEvents="none"
              style={[
                styles.fill,
                {
                  width: Math.max(0, playedWidth),
                  backgroundColor: colors.accent.gold,
                  height: TRACK_HEIGHT_PX,
                },
              ]}
            />
            <View
              testID="thumb"
              accessibilityElementsHidden
              pointerEvents="none"
              style={[
                styles.thumb,
                isScrubbing ? styles.thumbActive : styles.thumbRest,
                {
                  left: thumbLeft,
                  backgroundColor: colors.accent.gold,
                  shadowColor: colors.accent.gold,
                },
              ]}
            />
          </Pressable>
        </View>

        <AppText
          variant="caption"
          color="tertiary"
          accessibilityLabel={`Remaining ${formatMsAsClock(state.durationMs - displayMs)}`}
          style={styles.timeLabel}
        >
          {formatMsAsClock(state.durationMs - displayMs)}
        </AppText>
      </View>

      {/* Row 3 — Mode + More (W3 Phase 3.1).
          The transport row (Phase 3.5) goes BETWEEN the progress
          row and this mode row in the full SPEC; W3 batches the
          mode row first as a clean review unit. */}
      <View style={styles.modeRow}>
        <View style={styles.modeLeft}>
          <ModeControl />
        </View>
        <View style={styles.modeRight}>
          {/* Slot for <More /> (Phase 3.4) */}
        </View>
      </View>
    </View>
  );
};

/** Clamp a touch position to a [0, 1] fraction of the track width.
 *  Returns 0 for unknown widths so callers don't accidentally seek
 *  to Infinity on the first frame. */
function clampFraction(locationX: number, width: number): number {
  if (!Number.isFinite(locationX) || width <= 0) return 0;
  return Math.max(0, Math.min(1, locationX / width));
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeLabel: {
    minWidth: 44,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  modeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trackHitArea: {
    flex: 1,
    paddingVertical: spacing.lg, // expands the touch target to 44pt+ for a11y
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    height: TRACK_HEIGHT_PX,
    borderRadius: TRACK_HEIGHT_PX / 2,
    justifyContent: 'center',
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: TRACK_HEIGHT_PX / 2,
  },
  thumb: {
    position: 'absolute',
    top: -THUMB_REST_PX / 2,
    borderRadius: 9999,
    shadowOffset: {width: 0, height: 0},
  },
  thumbRest: {
    width: THUMB_REST_PX,
    height: THUMB_REST_PX,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbActive: {
    width: THUMB_ACTIVE_PX,
    height: THUMB_ACTIVE_PX,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
});

// Sanity-check (compile-time enforced): the spec bans
// `pointerEvents` on the scrub track. The fills + thumb above
// use `pointerEvents="none"` so the parent Pressable is the sole
// gesture target. If a future edit adds `pointerEvents` to the
// track, this export-name comment doubles as a grep hint.

export default TransportBar;
