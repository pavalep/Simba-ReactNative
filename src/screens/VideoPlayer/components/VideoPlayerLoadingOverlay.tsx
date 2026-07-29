import React, {useMemo} from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';


// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerLoadingOverlayProps {
  visible: boolean;
  message?: string;
}

// ─── Component ───────────────────────────────────────────────

export const VideoPlayerLoadingOverlay: React.FC<VideoPlayerLoadingOverlayProps> = ({
  visible,
  message = 'Loading…',
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFill,
          backgroundColor: colors.background.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        },
        content: {
          minWidth: 220,
          paddingHorizontal: 18,
          paddingVertical: 16,
          borderRadius: 14,
          backgroundColor: colors.background.elevated,
          borderWidth: 0.5,
          borderColor: colors.border.subtle,
          alignItems: 'center',
        },
        spinner: {
          marginBottom: 10,
        },
        message: {
          textAlign: 'center',
        },
      }),
    [colors],
  );

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <View style={styles.spinner}>
          <ActivityIndicator size="large" color={colors.accent.gold} />
        </View>
        <AppText variant="body1" color="primary" style={styles.message}>
          {message}
        </AppText>
      </View>
    </View>
  );
};
