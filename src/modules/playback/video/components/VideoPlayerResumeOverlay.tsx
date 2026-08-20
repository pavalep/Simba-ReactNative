import React, {useEffect, useMemo, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {useTheme} from '../../../../theme';
import {formatDuration} from '../../../../utils/timeAgo';

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
          backgroundColor: 'rgba(0,0,0,0.55)',
        },
        card: {
          marginHorizontal: 16,
          marginBottom: 130,
          padding: 20,
          borderRadius: 18,
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.10)',
          backgroundColor: 'rgba(18,18,22,0.96)',
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 8},
          shadowOpacity: 0.5,
          shadowRadius: 24,
          elevation: 12,
        },
        title: {
          marginBottom: 6,
          fontSize: 20,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
        caption: {
          marginBottom: 16,
          fontSize: 14,
          lineHeight: 20,
        },
        row: {
          flexDirection: 'row',
          gap: 10,
        },
        resumeBtn: {
          flex: 1,
          height: 50,
          borderRadius: 14,
          backgroundColor: colors.accent.gold,
          alignItems: 'center',
          justifyContent: 'center',
        },
        resumeLabel: {
          color: colors.text.inverse,
          fontSize: 15,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
        startOverBtn: {
          flex: 1,
          height: 50,
          borderRadius: 14,
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.18)',
          backgroundColor: 'rgba(255,255,255,0.10)',
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
        <AppText color="primary" style={styles.title}>
          Welcome back
        </AppText>
        <AppText color="secondary" style={styles.caption}>
          Resume from {formatDuration(position)}?
        </AppText>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.resumeBtn}
            onPress={onResume}
            accessibilityRole="button"
            accessibilityLabel={`Resume from ${formatDuration(position)}`}
            activeOpacity={0.8}>
            <AppText style={styles.resumeLabel}>
              Resume
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.startOverBtn}
            onPress={onStartOver}
            accessibilityRole="button"
            accessibilityLabel="Start over from the beginning"
            activeOpacity={0.7}>
            <AppText color="primary" style={{fontSize: 15, fontWeight: '600', letterSpacing: 0.3}}>
              Start Over
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export default VideoPlayerResumeOverlay;
