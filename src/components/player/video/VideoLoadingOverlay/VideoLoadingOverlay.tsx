/**
 * V19 W1 Phase 1.2 — `VideoLoadingOverlay` (restrained spinner).
 *
 * Visible only when `videoState ∈ {'preparing', 'connecting'}` OR
 * `transport.isBuffering === true`. Renders a small spinner + concise
 * label. NEVER a fake percentage, NEVER a full-page card.
 *
 * Label derivation:
 *   - `preparing`   → "Preparing video"
 *   - `connecting`  → "Connecting"
 *   - `buffering`   → "Buffering"
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
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <ActivityIndicator
        size="large"
        color={colors.text.primary}
        accessibilityElementsHidden
      />
      <AppText
        variant="body1"
        style={[styles.label, {color: colors.text.secondary}]}
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
