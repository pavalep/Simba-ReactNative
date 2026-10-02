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
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.6.
 */

import * as React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {usePlaybackState} from '../../../../infrastructure/player';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';

export const VideoLoadingOverlay: React.FC = () => {
  const {videoState, isBuffering} = usePlaybackState();
  const {colors} = useTheme();

  const visible = videoState === 'preparing' || isBuffering;

  if (!visible) return null;

  const label = videoState === 'preparing' ? 'Preparing video' : 'Buffering';

  return (
    <View
      pointerEvents="none"
      style={styles.container}
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
        size="large"
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
      <AppText
        variant="body1"
        style={[styles.label, {color: colors.text.onMediaMuted}]}
      >
        {label}
      </AppText>
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
