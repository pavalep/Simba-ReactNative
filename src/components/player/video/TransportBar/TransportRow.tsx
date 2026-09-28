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
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.3 + TRACKER Phase 3.5.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {useTransport} from '../../../../infrastructure/player';

const REWIND_MS = -10_000;
const FORWARD_MS = 10_000;

export const TransportRow: React.FC = () => {
  const {state, commands} = useTransport();
  const {colors} = useTheme();

  const playPauseLabel = state.isEnded
    ? 'Replay from beginning'
    : state.isPlaying
      ? 'Pause'
      : 'Play';
  const playPauseIcon = state.isEnded ? 'replay' : state.isPlaying ? 'pause' : 'play';

  const onRewind = () => commands.step(REWIND_MS);
  const onForward = () => commands.step(FORWARD_MS);

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
        <SvgIcon name="rewind10" size={28} color={colors.text.primary} />
      </Pressable>

      {/* Previous — hidden when no previous entry (NOT a dead spacer) */}
      {state.canGoPrev ? (
        <Pressable
          onPress={() => commands.previous()}
          accessibilityRole="button"
          accessibilityLabel="Previous track"
          hitSlop={8}
          style={({pressed}) => [
            styles.button,
            pressed ? {opacity: 0.7} : null,
          ]}
        >
          <SvgIcon name="skipBack" size={28} color={colors.text.primary} />
        </Pressable>
      ) : null}

      {/* Play / Pause — the only filled control, gold-accent */}
      <Pressable
        onPress={() =>
          state.isEnded ? commands.seek(0) : commands.togglePlayPause()
        }
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

      {/* Next — hidden when no next entry (NOT a dead spacer) */}
      {state.canGoNext ? (
        <Pressable
          onPress={() => commands.next()}
          accessibilityRole="button"
          accessibilityLabel="Next track"
          hitSlop={8}
          style={({pressed}) => [
            styles.button,
            pressed ? {opacity: 0.7} : null,
          ]}
        >
          <SvgIcon name="skipForward" size={28} color={colors.text.primary} />
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
        <SvgIcon name="forward10" size={28} color={colors.text.primary} />
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
