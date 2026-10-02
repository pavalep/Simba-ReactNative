/**
 * V19 W3 Phase 3.5 — `TransportRow` (5 controls in order).
 *
 * The middle row of the TransportBar. Five controls:
 *
 *   ┌───────────────────────────────────────────────┐
 *   │  ⟲10   ⏮   ▶ / ⏸   ⏭   ⟳10                  │
 *   └───────────────────────────────────────────────┘
 *
 *   - Rewind 10       calls `commands.rewind10()`  (-10s seek)
 *   - Previous        calls `commands.previous()`  (hidden when canGoPrev=false)
 *   - Play / Pause    gold-filled circular button (the primary CTA)
 *   - Next            calls `commands.next()`      (hidden when canGoNext=false)
 *   - Forward 10      calls `commands.forward10()` (+10s seek)
 *
 * Per the W3 spec:
 *   - "Previous / Next disappear when canGoPrev === false /
 *     canGoNext === false — they MUST NOT become dead spacers"
 *     → conditional render (`null` instead of `opacity:0`).
 *   - "Play-Pause is the only filled control, gold-accent"
 *     → the play/pause button gets a gold background.
 *   - "Hit areas ≥ 44 × 44 pt"
 *     → minHeight/minWidth = 44 on every button.
 *   - "accessibilityLabel is state-aware"
 *     → play vs pause vs replay (when finished); labels reflect
 *     the action, not the icon.
 *
 * Colour: the four unfilled icons sit directly on the video, so
 * they use `colors.text.onMediaSoft` (white 80%) — `text.primary`
 * is near-black in light theme and vanished against the frame.
 * Play/Pause keeps `text.inverse` on purpose: its background is
 * the gold fill, and the dark "inverse" ink is the readable
 * pairing on gold in BOTH themes.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.3 + TRACKER Phase 3.5.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {useTransport, useHaptic} from '../../../../infrastructure/player';

const TransportRow: React.FC = () => {
  const {state, commands} = useTransport();
  const {colors} = useTheme();
  // V19 W3.6.13 — light haptic on every chrome tap. Android gets
  // a 10 ms Vibration; iOS is a no-op today (lib doesn't yet expose
  // iOS UIImpactFeedbackGenerator). Future lib-side widening adds
  // `commands.triggerHaptic(intensity)` and the lib branches on iOS.
  const {haptic} = useHaptic();

  const playPauseLabel = state.isEnded
    ? 'Replay from beginning'
    : state.isPlaying
      ? 'Pause'
      : 'Play';
  const playPauseIcon = state.isEnded ? 'replay' : state.isPlaying ? 'pause' : 'play';

  // play/pause is the primary CTA — `medium` haptic.
  const onPlayPause = () => {
    haptic('medium');
    if (state.isEnded) commands.seek(0);
    else commands.togglePlayPause();
  };
  // Skip / chapter operations get `light` haptic (lower-key so a
  // flurry of taps during a seek preview doesn't blare).
  const onRewind = () => {
    haptic('light');
    commands.rewind10();
  };
  const onForward = () => {
    haptic('light');
    commands.forward10();
  };
  const onSkipPrev = () => {
    haptic('light');
    commands.skipPrev();
  };
  const onSkipNext = () => {
    haptic('light');
    commands.next();
  };

  return (
    <View style={styles.row} accessible={false}>
      {/* Rewind 10 */}
      <Pressable
        onPress={onRewind}
        accessibilityRole="button"
        accessibilityLabel="Rewind 10 seconds"
        hitSlop={8}
        style={({pressed}) => [
          styles.button,
          pressed ? {opacity: 0.7} : null,
        ]}
      >
        <SvgIcon name="rewind10" size={28} color={colors.text.onMediaSoft} />
      </Pressable>

      {/* Previous — Apple Music / Spotify smart-prev pattern (W3.6.11).
          - position > thresholdMs (default 3000) → restart current item
          - position ≤ thresholdMs → `commands.previous()`
          Threshold is `useSkipPrevThresholdStore.thresholdMs`
          (MMKV-backed). The raw `commands.previous()` is
          retained for any chrome surface that wants the unsemantic
          skip (e.g. a future "skip album" gesture). */}
      {state.canGoPrev ? (
        <Pressable
          onPress={onSkipPrev}
          accessibilityRole="button"
          accessibilityLabel="Previous track"
          hitSlop={8}
          style={({pressed}) => [
            styles.button,
            pressed ? {opacity: 0.7} : null,
          ]}
        >
          <SvgIcon name="skipBack" size={28} color={colors.text.onMediaSoft} />
        </Pressable>
      ) : null}

      {/* Play / Pause - the only filled control, gold-accent */}
      <Pressable
        onPress={onPlayPause}
        accessibilityRole="button"
        accessibilityLabel={playPauseLabel}
        hitSlop={8}
        style={({pressed}) => [
          styles.button,
          styles.playPauseButton,
          {backgroundColor: colors.accent.gold},
          pressed ? {opacity: 0.85, transform: [{scale: 0.96}]} : null,
        ]}
      >
        <SvgIcon
          name={playPauseIcon}
          size={28}
          color={colors.text.inverse}
        />
      </Pressable>

      {/* Next - hidden when no next entry (NOT a dead spacer) */}
      {state.canGoNext ? (
        <Pressable
          onPress={onSkipNext}
          accessibilityRole="button"
          accessibilityLabel="Next track"
          hitSlop={8}
          style={({pressed}) => [
            styles.button,
            pressed ? {opacity: 0.7} : null,
          ]}
        >
          <SvgIcon name="skipForward" size={28} color={colors.text.onMediaSoft} />
        </Pressable>
      ) : null}

      {/* Forward 10 */}
      <Pressable
        onPress={onForward}
        accessibilityRole="button"
        accessibilityLabel="Forward 10 seconds"
        hitSlop={8}
        style={({pressed}) => [
          styles.button,
          pressed ? {opacity: 0.7} : null,
        ]}
      >
        <SvgIcon name="forward10" size={28} color={colors.text.onMediaSoft} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
  },
  playPauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
});

export default TransportRow;

// Named re-export for callers that prefer named imports (test
// suites, sibling chrome primitives). The default export remains
// the canonical entry — both reference the SAME component.
export {TransportRow};
