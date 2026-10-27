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
 * is a real retry target. Rendering a Retry button that cannot retry
 * is the exact defect class this project already forbids elsewhere:
 * `PiPToggle` returns `null` when unsupported, the audio-description
 * selector returns `null` rather than ship an "AD not available" stub,
 * and `BufferedRangeFill` renders nothing instead of a zero-width
 * placeholder. The overlay follows the same rule.
 *
 * ## Where the retry target comes from
 *
 * It used to come from `VideoController.getState().currentItem` — and
 * that was ALWAYS null. `currentItem` is only set by
 * `controller.loadFile()`, and `loadFile` has ZERO call sites: the
 * LIB loads the file, not the controller. So the gate was a
 * permanent `false`, the Retry button never rendered, and a load
 * failure was a dead end — the user saw an error and could do
 * nothing about it.
 *
 * The real target is the app's own now-playing session
 * (`useNowPlayingStore`), which is written by the launch seam that
 * started this playback and therefore knows exactly what is playing.
 * Retrying re-launches that session through the same seam
 * (`useResumeAwareLaunch().openPlayer`), so the retry inherits the
 * resume policy, the session record, and the in-window loader —
 * one launch authority, no second path.
 *
 * The retry is explicit: no auto-retry loop.
 *
 * ## It lives on the PICTURE, not in the expanded chrome
 *
 * This overlay used to be mounted inside `ExpandedChrome`, which only
 * renders when the player is expanded. A video that failed to load
 * while the player sat in the DOCK — which is where a cold-start
 * video starts, because `videoPresentation` begins at `'mini'` —
 * showed a black square and no error at all. It is now a sibling of
 * `<VideoSurface>` inside the picture's box, so the failure is shown
 * wherever the picture is.
 *
 * ## Two shapes, because the dock slot is 44 pt
 *
 * The dock's video slot is a fixed 44×44 square. A card with two
 * buttons does not fit in it, and a button smaller than 44 pt is
 * below the touch-target floor. So in the dock the overlay shows the
 * error TITLE only — the state is communicated, and the actions are
 * one tap away (tapping the dock expands the player, where the full
 * card is). The dock shape is `pointerEvents="none"`, so the
 * tap-to-expand still lands.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.5 + §9.4 + `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 1.3.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {
  classifyError,
  usePlaybackState,
  usePresentation,
  useResumeAwareLaunch,
  useTransport,
} from '../../../../infrastructure/player';
import {useNowPlayingStore} from '../../../../state/nowPlayingStore';
import {useTheme} from '../../../../theme';
import {spacing, radius} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';

export const VideoErrorOverlay: React.FC = () => {
  const {videoState, error: rawError} = usePlaybackState();
  const {commands} = useTransport();
  const {isMini} = usePresentation();
  const {openPlayer} = useResumeAwareLaunch();
  const session = useNowPlayingStore(s => s.current);
  const {colors} = useTheme();

  // Classify the REAL failure. `classifyError` is total — it never
  // throws and never returns undefined — so this is safe to call
  // before the early return.
  const classified = React.useMemo(
    () => classifyError(rawError),
    [rawError],
  );

  if (videoState !== 'error') return null;

  // Retry is only honest when there is something to retry: a session
  // the app recorded for a VIDEO. An audio session cannot be retried
  // from here (the audio chrome owns that), and no session at all
  // means there is nothing to re-launch.
  const canRetry = session !== null && session.streamType === 'video';

  const handleRetry = () => {
    if (!session) return;
    // A video launch records the session SYNCHRONOUSLY and resolves
    // `true`; the load itself is mpv's business and a failure comes
    // back as mpv's own error event, which this overlay re-renders
    // from. So there is no rejected promise to handle here.
    //
    // `startPositionMs` is the position the session BEGAN at, passed
    // explicitly so the resume policy does not ask the user again
    // about a position they already answered.
    openPlayer({
      uri: session.uri,
      title: session.title,
      type: 'video',
      startPositionMs: session.startPositionMs,
      ...(session.type ? {mediaKind: session.type} : {}),
      ...(session.mediaLane ? {mediaLane: session.mediaLane} : {}),
      ...(session.provider ? {provider: session.provider} : {}),
      ...(session.thumbnailPath ? {thumbnailPath: session.thumbnailPath} : {}),
    });
  };

  if (isMini) {
    // The dock shape: the title only. 44×44 has no room for a card,
    // and a sub-44 pt button is below the touch-target floor.
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.miniScrim,
          {backgroundColor: colors.background.surfaceDark},
        ]}
        // The z-order of this overlay is load-bearing: it must sit ABOVE
        // the video's gesture layer, or its buttons stop receiving
        // touches. See `VideoPlayer.tsx`.
        testID="video-error-overlay"
        // The dock shape must not swallow the tap that expands the
        // player — the actions live on the expanded card.
        pointerEvents="none"
        accessibilityRole="alert"
        accessibilityLabel={classified.title}
      >
        <AppText
          variant="caption"
          numberOfLines={3}
          style={[styles.miniTitle, {color: colors.text.onMediaSoft}]}
        >
          {classified.title}
        </AppText>
      </View>
    );
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.scrim,
        {backgroundColor: colors.background.surfaceDark},
      ]}
      // The z-order of this overlay is load-bearing: it must sit ABOVE
      // the video's gesture layer, or its buttons stop receiving
      // touches. See `VideoPlayer.tsx`.
      testID="video-error-overlay"
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
              onPress={handleRetry}
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
  /** The dock shape: no card, no buttons — the title alone. */
  miniScrim: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  miniTitle: {
    textAlign: 'center',
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
