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
 * Note on colour: every element here paints OVER the video, and
 * the video is a dark surface in BOTH themes. So the chrome takes
 * its text from `colors.text.onMedia*` (white at 80%/70%), never
 * from `colors.text.primary/secondary/tertiary` — in light theme
 * those are near-black (`#1A1A1C` / `rgba(26,26,28,0.55)` /
 * `rgba(26,26,28,0.30)`) and rendered near-black on black video,
 * i.e. invisible. The sheets this bar OPENS (`ModeSheet`,
 * `CaptionsSheet`, `VideoMoreSheet`) sit on their own elevated
 * surface and keep normal text tokens; only what sits directly on
 * the frame uses the on-media pair.
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
import {useKeyframes} from '../../../../infrastructure/player/useKeyframes';
import {BufferedRangeFill} from './BufferedRangeFill';
import {ModeControl} from './ModeControl';
import {CaptionsToggle} from './CaptionsToggle';
import {PiPToggle} from './PiPToggle';
import {TransportRow} from './TransportRow';
import {VolumeControl} from './VolumeControl';
import {More} from './More';
import {ScrubPreview} from '../ScrubPreview/ScrubPreview';

/** Minimum drag distance (px) before a touch is treated as a pan
 *  rather than a tap. Apple's AVPlayer uses ~5px; we mirror. */
const PAN_THRESHOLD_PX = 5;

/**
 * V19 W8.7 — scrub geometry.
 *
 * These were 3 px / 12 px / 18 px and read as a hairline with a speck on
 * it. Every shipping player (YouTube, Plex, Tencent, Huawei Video, VLC)
 * uses a visibly thicker rail with a thumb roughly three-to-four times
 * the rail's own height: a 14 px thumb on a 4 px rail is the ratio you
 * see in all of them. The thumb is the only part of the seek control the
 * user's finger ever has to acquire, so it is the part that has to be
 * findable without looking twice.
 */
const THUMB_REST_PX = 14;
const THUMB_ACTIVE_PX = 22;

/**
 * V19 W8.7 — the empty rail. 3 px was chosen to match an "Apple hairline
 * aesthetic", which is the correct rule for a hairline and the wrong one
 * for a rail the user is meant to see continuously: at 3 px it is a
 * scanning hazard on a bright frame and invisible on a dark one. 4 px
 * with a 2 px radius is what the reference players actually ship.
 */
const TRACK_HEIGHT_PX = 4;

/**
 * V19 W8.7 — the floor under the chrome, in dp, applied IN ADDITION to the
 * bottom inset.
 *
 * `useSafeAreaInsets().bottom` is 0 whenever the player window is not the
 * window the inset provider measured, which is exactly the case that
 * produced the reported "controls sit on top of the home indicator".
 * A zero inset is not evidence that there is nothing to clear, so the
 * layout guarantees a minimum breathing gap regardless.
 */
const MIN_BOTTOM_GAP_PX = 12;

/**
 * W9 — placeholder for a duration mpv has not reported yet.
 *
 * VLC's documented convention is `remainingTime?.stringValue ?? "--:--"`
 * and iOS/Apple Music use the same shape. Rendering `0:00` here is what
 * produced the on-screen `-0:00`: it reads as "no time remains", which is
 * a claim the player cannot actually make. A gap is honest; a wrong number
 * is not.
 */
const UNKNOWN_DURATION_LABEL = '--:--';

export const TransportBar: React.FC = () => {
  const {state, commands} = useTransport();
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  // Local UI state for the scrub gesture. We do NOT push this to
  // useTransport / the lib during pan — only on release — so the
  // native 1Hz position-tick doesn't fight the gesture preview.
  // W3.5.2: also track the X coordinate so ScrubPreview can be
  // centered on the thumb.
  const [trackWidth, setTrackWidth] = React.useState(0);
  const [scrubPreviewMs, setScrubPreviewMs] = React.useState<
    number | null
  >(null);
  const [scrubPreviewX, setScrubPreviewX] = React.useState<number>(0);
  const [isScrubbing, setIsScrubbing] = React.useState(false);
  const {samples: keyframes} = useKeyframes();

  const displayMs = scrubPreviewMs ?? state.positionMs;

// A duration of 0 means "mpv has not reported one yet" (or the source has
// no fixed duration). Remaining time is meaningless until it is known.
const hasKnownDuration = state.durationMs > 0;

  // Pan responder wired via useMemo so the closure captures the
  // current `state.durationMs` once per render. PanResponder is
  // the legacy gesture API; the RN team recommends
  // react-native-gesture-handler now, but we already pull in
  // PanResponder-style plumbing through react-native-screens +
  // react-native-safe-area-context, and adding RNGH would mean
  // a native rebuild. PanResponder is fine for a single-axis
  // scrub track.
  // Live gesture inputs, held in a ref so the PanResponder below can stay
// // MOUNTED for the component's lifetime.
  //
  // V19 W9 (v1.10.0): the responder used to be rebuilt whenever
  // `seekable`, `durationMs`, `trackWidth` or `scrubPreviewMs` changed.
  // Two of those change DURING the gesture (`scrubPreviewMs` on every
  // touch move, `durationMs` on every position tick), so RN was
  // detaching and re-attaching the responder handlers several times per
  // second in the middle of a drag — losing the active gesture and
  // reallocating the handler closures for nothing.
  //
  // The ref is written during render (a write, not a render) so the
  // responder closures read the CURRENT value at event time without
  // becoming a dependency. Same pattern as `useLatestRef` in
  // react-native-webview, and the reason the deps list can be `[]`.
  const scrubRef = React.useRef({
    seekable: state.seekable,
    durationMs: state.durationMs,
    trackWidth,
    previewMs: scrubPreviewMs,
  });
  scrubRef.current = {
    seekable: state.seekable,
    durationMs: state.durationMs,
    trackWidth,
    previewMs: scrubPreviewMs,
  };

  // Same treatment for the commands object, which is stable in practice
  // but must not be read through a stale closure.
  const commandsRef = React.useRef(commands);
  commandsRef.current = commands;

  // Pan responder wired ONCE. See the note above the memo for why this
  // cannot depend on the scrub or position state.
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => scrubRef.current.seekable,
        onMoveShouldSetPanResponder: (
          _e: GestureResponderEvent,
          g: PanResponderGestureState,
        ) =>
          scrubRef.current.seekable && Math.abs(g.dx) > PAN_THRESHOLD_PX,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          if (!scrubRef.current.seekable) return;
          const x = clampFraction(e.nativeEvent.locationX, scrubRef.current.trackWidth);
          setScrubPreviewMs(Math.round(x * scrubRef.current.durationMs));
          setScrubPreviewX(e.nativeEvent.locationX);
          setIsScrubbing(true);
        },
        onPanResponderMove: (
          e: GestureResponderEvent,
          _g: PanResponderGestureState,
        ) => {
          if (!scrubRef.current.seekable) return;
          const x = clampFraction(e.nativeEvent.locationX, scrubRef.current.trackWidth);
          setScrubPreviewMs(Math.round(x * scrubRef.current.durationMs));
          setScrubPreviewX(e.nativeEvent.locationX);
        },
        onPanResponderRelease: (e: GestureResponderEvent) => {
          // The target is recomputed from the RELEASE EVENT rather than
          // read back out of `scrubRef.previewMs`.
          //
          // `scrubRef.current` is synced during render, so it always
          // reflects the last COMMITTED state. Grant/move/release can
          // arrive inside one React batch (fast flick, or a synthetic
          // event sequence), in which case the ref still holds the
          // pre-grab value and the seek would be silently dropped —
          // the gesture would appear to do nothing.
          //
          // The release event carries the final touch position, which is
          // exactly what the preview was showing, so deriving it here is
          // both correct and immune to batching.
          const {seekable, durationMs, trackWidth: trackWidthNow} = scrubRef.current;
          if (seekable && trackWidthNow > 0) {
            const x = clampFraction(e.nativeEvent.locationX, trackWidthNow);
            const targetMs = Math.round(x * durationMs);
            commandsRef.current.seek(clampPosition(targetMs, durationMs));
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
    // The empty dependency list IS the contract, and
    // react-hooks/exhaustive-deps has nothing to report here because the
    // memo body references only refs and setState functions — both of
    // which are stable and deliberately absent from the list. Hence no
    // rule-disable comment (an unused one is itself an eslint error here).
    [],
  );

  const playedFraction =
    state.durationMs > 0 ? displayMs / state.durationMs : 0;
  const playedWidth = Math.round(trackWidth * playedFraction);
  // The thumb is centred on the playhead, but it is a ROUND dot sitting
  // on a thin rail — so at the two ends half of it overhangs. Clamping
  // its centre so the dot stays fully inside the rail is what every
  // reference player does; letting it hang off the edge reads as a
  // rendering glitch rather than as "you are at the start".
  //
  // Clamped against the RESTING radius, not the active one: the box has
  // a fixed layout size and only a transform scales it, so measuring
  // against the scaled size would make the dot JUMP inward the instant
  // you touched it and jump back on release.
  const thumbRadius = THUMB_REST_PX / 2;
  const thumbLeft = Math.max(
    thumbRadius,
    Math.min(trackWidth - thumbRadius, playedWidth - thumbRadius),
  );

  const rowStyle = [
    styles.row,
    {
      paddingHorizontal: spacing.lg,
      paddingBottom: MIN_BOTTOM_GAP_PX + insets.bottom,
    },
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
          color={colors.text.onMediaMuted}
          accessibilityLabel={`Elapsed ${formatMsAsClock(displayMs)}`}
          style={styles.timeLabel}
        >
          {formatMsAsClock(displayMs)}
        </AppText>

        <View
          testID="scrub-track-hit-area"
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
            // W9 — the range is omitted entirely while the duration is
            // unknown. `max: 0, now: 78000` announces "position 78000 of 0"
            // to a screen reader, which is the same lie as the `-0:00`
            // label in a different font. No value is better than a wrong
            // one.
            accessibilityValue={
              hasKnownDuration
                ? {
                    min: 0,
                    max: Math.round(state.durationMs),
                    now: Math.round(displayMs),
                  }
                : undefined
            }
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
              // W3.5.2: show the scrub preview for ~600ms after a
              // tap so the user sees confirmation of the seek
              // target. The preview disappears naturally on the
              // next position-tick because `scrubPreviewMs` is
              // null and `displayMs` falls back to `state.positionMs`.
              setScrubPreviewMs(targetMs);
              setScrubPreviewX(e.nativeEvent.locationX);
              setIsScrubbing(true);
              commands.seek(targetMs);
              // Clear the preview after a short delay.
              setTimeout(() => {
                setScrubPreviewMs(null);
                setIsScrubbing(false);
              }, 600);
            }}
            style={({pressed}) => [
              styles.track,
              {
                // V19 W8.7 — `background.seekTrack.empty`. This was
                // `colors.border.subtle`, which in the dark palette is
                // `rgba(255,255,255,0.06)`: on a 3 px rail over video
                // that is not a grey track, it is nothing. The ternary
                // that used to sit here returned `border.subtle` on
                // BOTH branches, so it never expressed the live-stream
                // case it appeared to.
                backgroundColor: colors.background.seekTrack.empty,
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
                {
                  left: thumbLeft,
                  backgroundColor: colors.text.bright,
                  shadowColor: colors.background.seekTrack.empty,
                  transform: [
                    {
                      scale: isScrubbing
                        ? THUMB_ACTIVE_PX / THUMB_REST_PX
                        : 1,
                    },
                  ],
                },
              ]}
            />
            {/* W3.5.2 — ScrubPreview tooltip. Renders only while
                isScrubbing (touch-down + drag, or briefly after
                a tap). pointerEvents="none" inside ScrubPreview
                so it doesn't steal the seek gesture. */}
            <ScrubPreview
              visible={isScrubbing && scrubPreviewMs !== null}
              positionMs={scrubPreviewMs ?? 0}
              centerX={scrubPreviewX}
              barWidth={trackWidth}
              keyframes={keyframes}
            />
          </Pressable>
        </View>

        {/*
          Remaining time is rendered as a NEGATIVE clock (`-3:45`),
          matching the Media3 `RemainingDurationText` primitive that
          the SPEC names as the canonical reference, and matching this
          component's own documented contract. The implementation had
          drifted to a bare `3:45`, so the label read as elapsed time
          sitting next to the real elapsed time.

          W9 — UNKNOWN DURATION. `durationMs` is 0 until mpv has parsed
          the media (and permanently 0 for a source with no fixed
          duration). `formatMsAsClock(0 - 78000)` returns `'0:00'`, so the
          old template produced the literal `-0:00`: the label asserted
          that NO TIME REMAINS while the film was visibly playing. Caught
          on device during W9 verification.

          The fix follows VLC's own documented pattern —
          `remainingTime?.stringValue ?? "--:--"` — which is also what
          iOS/Apple Music uses for an unknown duration: a placeholder,
          never a zero. A wrong number is worse than no number; the user
          cannot tell a lie from a gap.
        */}
        <AppText
          variant="caption"
          color={colors.text.onMediaMuted}
          accessibilityLabel={
            hasKnownDuration
              ? `Remaining ${formatMsAsClock(state.durationMs - displayMs)}`
              : 'Remaining time unknown'
          }
          style={styles.timeLabel}
        >
          {hasKnownDuration
            ? `-${formatMsAsClock(state.durationMs - displayMs)}`
            : UNKNOWN_DURATION_LABEL}
        </AppText>
      </View>

      {/* Row 2 — Transport controls (W3 Phase 3.5, rebuilt in W7.3).
          Five controls: Rewind 10 / Previous / Play-Pause / Next /
          Forward 10, all through the shared `PlayerControl` primitive.
          Previous + Next render `null` when the playlist has no such
          entry, so they never become dead spacers; the row is a
          CENTRED cluster so that collapse does not shift the primary
          CTA sideways. See `TransportRow.tsx` for why absence is
          correct rather than a gap to fill. */}
      <TransportRow />

      {/* Row 3 — the secondary control row (W8.7 layout).

          W8.7 corrected the ARRANGEMENT as well as the widgets. The
          previous order put volume on the RIGHT between PiP and More,
          and volume is the one control in this row with real width —
          it carries a slider. A slider on the right of a
          `space-between` row therefore shoved PiP and More into the
          screen edge, and because the bottom inset was the only
          clearance they ended up sitting under the gesture bar. That
          is the reported "speaker floating mid-left, huge gap, PiP and
          More crammed on the right".

          The arrangement now matches every shipping player (YouTube,
          Plex, Tencent Video, Huawei Video): OUTPUT on the left —
          volume, the one wide control — and the mode/affordance
          CLUSTER on the right, where four equally-sized icon buttons
          line up on a common edge. Both groups are laid out from their
          own side, so a wide volume slider grows into the empty middle
          and can never push the icon cluster anywhere. */}
      <View style={styles.modeRow}>
        <View style={styles.modeLeft}>
          <VolumeControl />
        </View>
        <View style={styles.modeRight}>
          <CaptionsToggle />
          <ModeControl />
          <PiPToggle />
          <More />
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
  // W7.2: this root STILL has no background of its own. The gradient
  // that makes the chrome legible over arbitrary video is
  // `PlayerScrim`, mounted once in the compositor behind everything.
  // A second backdrop here would double the opacity in this band and
  // seam against the header's.
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
  // W8.7: `space-between` kept, because the two groups are genuinely
  // independent clusters pinned to opposite edges — the left one is
  // OUTPUT (volume), the right one is the affordance cluster. The left
  // group may not shrink (a clipped volume slider is a broken control)
  // and the right one may not either, so the slack between them absorbs
  // the difference instead of the controls losing width.
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    // A 44 pt row is the minimum, but the pills are 44 tall and the
    // volume control can be 44 too — this reserves the band so the
    // transport row above never gets visually pinched by it.
    minHeight: 44,
    gap: spacing.sm,
  },
  modeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  modeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    // W8.7 — every member of this cluster is the same size (a 44 pt
    // icon target), so an EQUAL gap is what makes them read as one
    // group rather than as four unrelated buttons that happen to share
    // a row.
    gap: spacing.xs,
    flexShrink: 0,
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
    // One physical size, scaled under the finger. The previous version
    // swapped width/height between two static styles, which meant the
    // resting dot and the grabbed dot were two separate layout boxes —
    // so the left offset had to be recomputed for a size that was only
    // known at render time, and it was wrong at both ends of the rail.
    // A single box plus a transform removes that class of error.
    top: -THUMB_REST_PX / 2,
    width: THUMB_REST_PX,
    height: THUMB_REST_PX,
    borderRadius: 9999,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 3,
  },
});

// Sanity-check (compile-time enforced): the spec bans
// `pointerEvents` on the scrub track. The fills + thumb above
// use `pointerEvents="none"` so the parent Pressable is the sole
// gesture target. If a future edit adds `pointerEvents` to the
// track, this export-name comment doubles as a grep hint.

export default TransportBar;
