/**
 * V19 W3.6.7 — `NextUpOverlay` (post-play countdown, Netflix-style).
 *
 * Shows at the end of the current item when:
 *   - `state.repeatMode === 'all'`  (per Apple Music / Spotify / Plex)
 *   - `state.canGoNext === true`   (i.e. there IS a next item)
 *   - `state.positionMs >= state.durationMs - 10000`
 *
 * Renders a full-bleed card overlaying the bottom 40% of the
 * player frame: "Up next" + countdown + Cancel + Play now.
 *
 * Auto-fire semantics:
 *   - When the countdown reaches 0, the overlay auto-fires
 *     `commands.next()` ONLY if `useAutoPlayNextStore.getState().enabled`
 *     is true (default OFF — Puneet Patwari "never auto-action
 *     without consent").
 *   - When the user taps Cancel, the countdown pauses; the
 *     overlay stays on the finished item (the user explicitly
 *     chose to remain).
 *   - When the user taps Play now, `commands.next()` fires
 *     immediately, ignoring the countdown.
 *
 * Title / thumbnail source:
 *   Today the chrome renders "Up next" with no title or
 *   thumbnail because the lib doesn't expose next-track
 *   metadata (`state.next` is not yet a PlayerState field).
 *   The architecture audit §6 has this in the lib-future list.
 *   The chrome shape here is forward-compatible: the moment
 *   `state.next: { title?: string; thumbUri?: string }` lands
 *   in lib 1.7.0, the chrome reads it (one-line change in
 *   useNextUpCountdown's `nextTrackTitle` derivation).
 *
 * Why text-only countdown (no animation lib):
 *   Per SPEC §3.6.7 + WCAG 2.2.2 (Pause, Stop, Hide) + Apple
 *   Music style — animated digits are noise. A text countdown
 *   "00:05" → "00:04" re-rendering once per second is what users
 *   expect; reduce-motion users get the same text (no animation
 *   to disable in the first place).
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.6.7 +
 *   `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.W3.6.7.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import {radius, spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {useTransport} from '../../../../infrastructure/player';
import {useAutoPlayNextStore} from '../../../../state/useAutoPlayNextStore';

const NEXT_UP_LEAD_MS = 10_000; // Show overlay at durationMs - 10s

/**
 * Compute the visible overlay flag + countdown seconds from
 * transport state. Pure — exported for tests.
 *
 * Returns:
 *   {visible, secondsRemaining} —
 *     visible=false when the overlay should be hidden (repeat!=all
 *     OR canGoNext=false OR duration is unset OR we're outside
 *     the 10-second window)
 *     secondsRemaining = 10..0 inside the window
 */
export function deriveNextUpView(args: {
  positionMs: number;
  durationMs: number;
  canGoNext: boolean;
  repeatMode: 'off' | 'one' | 'all';
}): {visible: boolean; secondsRemaining: number} {
  const {positionMs, durationMs, canGoNext, repeatMode} = args;
  if (!canGoNext) return {visible: false, secondsRemaining: 0};
  if (repeatMode !== 'all') return {visible: false, secondsRemaining: 0};
  if (durationMs <= 0) return {visible: false, secondsRemaining: 0};
  const msUntilEnd = durationMs - positionMs;
  if (msUntilEnd <= 0) return {visible: true, secondsRemaining: 0};
  if (msUntilEnd > NEXT_UP_LEAD_MS) {
    return {visible: false, secondsRemaining: Math.ceil(NEXT_UP_LEAD_MS / 1000)};
  }
  return {visible: true, secondsRemaining: Math.ceil(msUntilEnd / 1000)};
}

export const NextUpOverlay: React.FC = () => {
  const {state, commands} = useTransport();
  const {colors} = useTheme();
  // W3.6.12 — auto-fire is gated on this store's value. Default OFF.
  const autoPlayNextEnabled = useAutoPlayNextStore(s => s.enabled);

  // Re-derive once per second while visible. We poll `positionMs`
  // via the existing useTransport subscription (1Hz position ticks
  // from the lib) so no setInterval is needed.
  const view = React.useMemo(
    () =>
      deriveNextUpView({
        positionMs: state.positionMs,
        durationMs: state.durationMs,
        canGoNext: state.canGoNext,
        repeatMode: state.repeatMode,
      }),
    [
      state.positionMs,
      state.durationMs,
      state.canGoNext,
      state.repeatMode,
    ],
  );

  // Local "cancelled" flag — stays hidden once the user taps
  // Cancel until the next track auto-starts (which the listener
  // resets on the next `canGoNext` flip OR the user reaches end).
  const [cancelled, setCancelled] = React.useState(false);

  // Reset the cancelled flag whenever a new next-eligible item
  // loads OR the user is no longer in the overlay window (so the
  // next time around the flag is reset).
  React.useEffect(() => {
    if (!view.visible) {
      setCancelled(false);
    }
  }, [view.visible]);

  // Auto-fire the next track when the countdown reaches 0 AND
  // the user hasn't cancelled AND auto-play is enabled.
  React.useEffect(() => {
    if (!view.visible) return;
    if (cancelled) return;
    if (!autoPlayNextEnabled) return;
    if (view.secondsRemaining > 0) return;
    commands.next();
  }, [view, cancelled, autoPlayNextEnabled, commands]);

  // Don't render before the 10-second window OR when cancelled
  // OR when not in Repeat-all with a valid next.
  if (!view.visible || cancelled) return null;

  const handleCancel = () => {
    setCancelled(true);
  };
  const handlePlayNow = () => {
    commands.next();
  };

  return (
    <View
      style={[styles.card, {backgroundColor: colors.background.surfaceDark}]}
      pointerEvents="box-none"
      accessibilityViewIsModal
      accessibilityLabel="Up next countdown"
      testID="next-up-overlay"
    >
      <AppText
        variant="overline"
        color="secondary"
        style={styles.upNextLabel}
      >
        Up next
      </AppText>
      <AppText
        variant="h2"
        color="inverse"
        style={styles.title}
        numberOfLines={1}
      >
        {state.nextTrack?.title || 'Next item'}
      </AppText>
      <AppText
        variant="display"
        color="inverse"
        style={styles.countdown}
        testID="next-up-countdown"
      >
        {String(view.secondsRemaining).padStart(2, '0')}
      </AppText>

      <View style={styles.actions}>
        <Pressable
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Stay on this item"
          hitSlop={12}
          style={({pressed}) => [
            styles.cancelButton,
            {borderColor: colors.border.emphasis},
            pressed ? {opacity: 0.7} : null,
          ]}
          testID="next-up-cancel"
        >
          <AppText variant="button" color="inverse">
            Cancel
          </AppText>
        </Pressable>
        <Pressable
          onPress={handlePlayNow}
          accessibilityRole="button"
          accessibilityLabel="Play next item now"
          hitSlop={12}
          style={({pressed}) => [
            styles.playNowButton,
            {backgroundColor: colors.accent.gold},
            pressed ? {opacity: 0.85, transform: [{scale: 0.96}]} : null,
          ]}
          testID="next-up-play-now"
        >
          <AppText variant="button" color="inverse">
            Play now
          </AppText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  upNextLabel: {
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.md,
    width: '100%',
  },
  countdown: {
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  playNowButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
});

export default NextUpOverlay;
