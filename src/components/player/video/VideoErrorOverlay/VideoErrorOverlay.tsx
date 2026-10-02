/**
 * V19 W1 Phase 1.3 — `VideoErrorOverlay` (terminal-only).
 *
 * Visible only when `videoState === 'error'`. Renders a dark scrim
 * with: error title + human message from the REAL classifier, and
 * the recovery actions that can actually be performed right now.
 *
 * **W5 reaudit — three jugaad stubs removed here:**
 *
 *   1. `const kind: StreamError['kind'] = 'network'` was HARDCODED.
 *      Every failure — codec, expired, blocked, seek-past-end —
 *      rendered as "Connection problem / Check your connection and
 *      try again." The 5-category classifier now exists (W5 Phase
 *      5.3, `classifyError`), and the raw lib error is exposed by
 *      `usePlaybackState()`, so the overlay classifies the REAL
 *      failure and renders the copy the classifier prescribes.
 *
 *   2. Retry called `openPlayer({uri: '', title: '', type: 'video'})`
 *      — an EMPTY URI. That cannot re-load the failed item; it just
 *      asks the lib to open nothing. Removed.
 *
 *   3. Close was an explicit no-op ("No-op here — placeholder"),
 *      leaving a visible button that did nothing. Now calls the real
 *      `commands.close()` (lib `stop()` + `clear()`).
 *
 * **The no-inert-control rule.** Retry is rendered ONLY when there
 * is a real retry target — a loaded item on the `VideoController`.
 * Rendering a Retry button that cannot retry is the exact defect
 * class this project already forbids elsewhere: `PiPToggle` returns
 * `null` when unsupported, `AudioDescriptionTrackSelector` returns
 * `null` rather than ship an "AD not available" stub, and
 * `BufferedRangeFill` renders nothing instead of a zero-width
 * placeholder. The overlay follows the same rule.
 *
 * Retry MUST remain an explicit user action — no auto-retry loop.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.5 + §9.4 + `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 1.3.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {
  classifyError,
  usePlaybackState,
  useTransport,
  useVideoController,
} from '../../../../infrastructure/player';
import {useTheme} from '../../../../theme';
import {spacing, radius} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';

export const VideoErrorOverlay: React.FC = () => {
  const {videoState, error: rawError} = usePlaybackState();
  const {commands} = useTransport();
  const {controller} = useVideoController();
  const {colors} = useTheme();

  // Classify the REAL failure. `classifyError` is total — it never
  // throws and never returns undefined — so this is safe to call
  // before the early return.
  const classified = React.useMemo(
    () => classifyError(rawError),
    [rawError],
  );

  if (videoState !== 'error') return null;

  // Retry is only honest when there is something to retry. The
  // controller caches the URI it last loaded, so a non-null
  // `currentItem` means `controller.retry()` has a real target.
  const canRetry = controller.getState().currentItem !== null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.scrim,
        {backgroundColor: colors.background.surfaceDark},
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.card}>
        {/* On-media tokens: the scrim above is filled with
            `background.surfaceDark` (near-black in BOTH themes), so
            light theme's near-black `text.primary`/`text.secondary`
            rendered this card invisible over the video. */}
        <AppText variant="h3" style={[styles.title, {color: colors.text.onMediaSoft}]}>
          {classified.title}
        </AppText>
        <AppText variant="body1" style={[styles.message, {color: colors.text.onMediaMuted}]}>
          {classified.message}
        </AppText>
        <View style={styles.actions}>
          {canRetry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading"
              onPress={() => {
                // Real retry: re-issues the cached URI through the
                // same loadFile path (and applies the codec
                // software-decode recovery when the classifier asked
                // for it). No empty-URI launch.
                controller.retry().catch(() => {
                  // The controller already classifies and stores any
                  // failure; the overlay re-renders from that state.
                  // Swallow here only to avoid an unhandled rejection
                  // — the error surface is the controller's.
                });
              }}
              style={({pressed}) => [
                styles.actionButton,
                {
                  backgroundColor: colors.accent.gold,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                variant="button"
                // `text.inverse` stays here on purpose: the button is
                // filled gold, and the dark "inverse" ink is the
                // readable pairing on gold in BOTH themes.
                style={[styles.actionLabel, {color: colors.text.inverse}]}
              >
                Retry
              </AppText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close player"
            onPress={() => {
              // Real close: releases the native session and clears
              // the queue (lib `stop()` + `clear()`).
              commands.close();
            }}
            style={({pressed}) => [
              styles.actionButton,
              canRetry ? styles.secondary : styles.primaryOnly,
              {
                borderColor: colors.border.emphasis,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              variant="button"
              style={[styles.actionLabel, {color: colors.text.onMediaSoft}]}
            >
              Close
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    minWidth: 120,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  /** When Retry is hidden, Close becomes the single primary action. */
  primaryOnly: {
    borderWidth: 1,
  },
  actionLabel: {
    textAlign: 'center',
  },
});

export default VideoErrorOverlay;
