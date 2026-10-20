/**
 * V19 W1 Phase 1.2 — `VideoLoadingOverlay` (restrained spinner).
 *
 * Visible only when `videoState === 'preparing'` OR
 * `isBuffering === true`. Renders a small spinner + concise
 * label. NEVER a fake percentage, NEVER a full-page card.
 *
 * Label derivation:
 *   - `preparing`   → "Preparing video"
 *   - otherwise     → "Buffering" (driven by `isBuffering`)
 *
 * There is deliberately NO 'connecting' state. This docstring used
 * to advertise `videoState ∈ {'preparing', 'connecting'}` and a
 * "Connecting" label, but `'connecting'` has never been a member of
 * the V19 `VideoState` enum and the component never checked for it —
 * a documented capability no code path could produce. Removed
 * rather than left as fiction.
 *
 * No Play/Pause affordance — this overlay is purely informational.
 *
 * ## It lives on the PICTURE, not in the expanded chrome
 *
 * This overlay used to be mounted inside `ExpandedChrome`, which only
 * renders when the player is expanded. A video that was loading (or
 * stalled) in the dock therefore showed NOTHING — the dock showed a
 * black square, which is the same silent-black-screen failure the
 * error overlay had. It is now a sibling of `<VideoSurface>` inside
 * the picture's box, so it covers the picture wherever the picture
 * is: fullscreen AND the 44 pt dock slot.
 *
 * ## Two sizes, because the dock slot is 44 pt
 *
 * The dock's video slot is a fixed 44×44 square. A 36 pt spinner and
 * a "Buffering" caption do not fit in it — they overflow the slot and
 * spill over the mini bar's artwork. So the overlay renders a SMALL
 * spinner with no caption in the dock, and the full spinner + caption
 * when expanded. Same affordance, sized to the box it is in.
 *
 * The caption is dropped rather than shrunk because a 6 pt caption is
 * unreadable; the accessibility label still carries the state
 * ("Loading" on the container), so a screen-reader user is not left
 * with less than a sighted one.
 *
 * ## The spinner is DELAYED
 *
 * The spinner is not shown the instant the player stalls. See
 * `useDelayedVisibility` for the two rules (Video.js's 500 ms onset
 * delay, UX Tigers' 500 ms minimum visible time) and why a spinner
 * that flickers is worse than no spinner.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.6.
 */

import * as React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {usePlaybackState, usePresentation} from '../../../../infrastructure/player';
import {useDelayedVisibility} from '../../../../hooks/useDelayedVisibility';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';

export const VideoLoadingOverlay: React.FC = () => {
  const {videoState, isBuffering} = usePlaybackState();
  const {isMini} = usePresentation();
  const {colors} = useTheme();

  const stalled = videoState === 'preparing' || isBuffering;

  // 500 ms onset, 500 ms minimum visible. Video.js's buffering
  // indicator and UX Tigers' minimum-visible-time, in one hook.
  const visible = useDelayedVisibility(stalled, {
    onsetDelayMs: 500,
    minimumVisibleMs: 500,
  });

  if (!visible) return null;

  const label = videoState === 'preparing' ? 'Preparing video' : 'Buffering';

  return (
    <View
      pointerEvents="none"
      style={styles.container}
      // The z-order of this overlay is load-bearing: it must sit ABOVE
      // the video's gesture layer, or anything interactive under it
      // stops receiving touches. See `VideoPlayer.tsx`.
      testID="video-loading-overlay"
      // `accessible` is what makes this View an accessibility element
      // at all. Without it, iOS VoiceOver skips the node entirely and
      // BOTH `accessibilityRole="progressbar"` and
      // `accessibilityLabel="Loading"` are inert — the overlay would
      // announce nothing while the video is stuck buffering. (The
      // visible caption is still read as its own text node, which is
      // why this went unnoticed: the string appeared, just unlabelled
      // and un-typed.)
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator
        size={isMini ? 'small' : 'large'}
        // On-media token: this overlay is a TRANSPARENT full-bleed
        // view over the video, which is a dark surface in BOTH themes.
        // Light theme's near-black `text.primary` made the spinner
        // invisible against the frame.
        color={colors.text.onMediaSoft}
        // The spinner is decorative — the container above already
        // carries the role and the label, so announcing it separately
        // would double up.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      {isMini ? null : (
        <AppText
          variant="body1"
          style={[styles.label, {color: colors.text.onMediaMuted}]}
        >
          {label}
        </AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  label: {
    marginTop: spacing.md,
    textAlign: 'center',
    // 60% alpha on the secondary text gives a restrained hint of state
    // without dominating the chrome.
    opacity: 0.6,
  },
});

export default VideoLoadingOverlay;
