import React, {useEffect, useMemo, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {formatDuration} from '../../../utils/timeAgo';

// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerResumeOverlayProps {
  /** Saved playback position in seconds to resume from */
  position: number;
  onResume: () => void;
  onStartOver: () => void;
}

// ─── Component ───────────────────────────────────────────────

/**
 * 31.2 Netflix-style resume choice: when a saved position exists, ask the
 * user "Resume from MM:SS" or "Start Over" instead of silently auto-seeking.
 */
export const VideoPlayerResumeOverlay: React.FC<VideoPlayerResumeOverlayProps> = ({
  position,
  onResume,
  onStartOver,
}) => {
  const {colors} = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateAnim]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...StyleSheet.absoluteFill,
          zIndex: 40,
          justifyContent: 'flex-end',
        },
        scrim: {
          ...StyleSheet.absoluteFill,
          backgroundColor: colors.background.scrimDim,
        },
        card: {
          marginHorizontal: 16,
          marginBottom: 130,
          padding: 18,
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.surfaceDark,
        },
        title: {
          marginBottom: 4,
        },
        caption: {
          marginBottom: 14,
        },
        row: {
          flexDirection: 'row',
          gap: 10,
        },
        resumeBtn: {
          flex: 1,
          height: 48,
          borderRadius: 12,
          backgroundColor: colors.accent.gold,
          alignItems: 'center',
          justifyContent: 'center',
        },
        resumeLabel: {
          color: colors.text.inverse,
          fontWeight: '700',
        },
        startOverBtn: {
          flex: 1,
          height: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border.subtle,
          backgroundColor: colors.border.subtle,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors],
  );

  return (
    <Animated.View
      style={[styles.container, {opacity: fadeAnim, transform: [{translateY: translateAnim}]}]}>
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.card}>
        <AppText variant="h3" color="primary" style={styles.title}>
          Welcome back
        </AppText>
        <AppText variant="body2" color="secondary" style={styles.caption}>
          Resume from {formatDuration(position)}?
        </AppText>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.resumeBtn}
            onPress={onResume}
            accessibilityRole="button"
            accessibilityLabel={`Resume from ${formatDuration(position)}`}
            activeOpacity={0.8}>
            <AppText variant="body1" style={styles.resumeLabel}>
              Resume
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.startOverBtn}
            onPress={onStartOver}
            accessibilityRole="button"
            accessibilityLabel="Start over from the beginning"
            activeOpacity={0.7}>
            <AppText variant="body1" color="primary">
              Start Over
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export default VideoPlayerResumeOverlay;
