import React, {useEffect, useMemo, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';

// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerAutoAdvanceCardProps {
  title: string;
  countdown: number;
  onNext: () => void;
  onCancel: () => void;
}

// ─── Component ───────────────────────────────────────────────

/**
 * 31.3 Netflix-style auto-advance: when a video ends and a next queue item
 * exists, show "Up Next in 5s" with Next / Cancel instead of stopping cold.
 */
export const VideoPlayerAutoAdvanceCard: React.FC<VideoPlayerAutoAdvanceCardProps> = ({
  title,
  countdown,
  onNext,
  onCancel,
}) => {
  const {colors} = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(-16)).current;

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
          position: 'absolute',
          top: 70,
          right: 14,
          zIndex: 30,
          minWidth: 240,
          maxWidth: 300,
          padding: 14,
          borderRadius: 14,
          borderWidth: 0.5,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.surfaceDark,
        },
        upNext: {
          marginBottom: 2,
        },
        title: {
          marginBottom: 10,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        nextBtn: {
          flex: 1,
          height: 44,
          borderRadius: 10,
          backgroundColor: colors.accent.gold,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
        },
        nextLabel: {
          color: colors.text.inverse,
          fontWeight: '700',
        },
        cancelBtn: {
          width: 44,
          height: 44,
          borderRadius: 10,
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
      style={[styles.container, {opacity: fadeAnim, transform: [{translateY: translateAnim}]}]}
      accessibilityLabel={`Up next ${title}. Auto playing in ${countdown} seconds`}
      accessibilityLiveRegion="polite">
      <AppText variant="caption" color="tertiary" style={styles.upNext}>
        Up Next in {countdown}s
      </AppText>
      <AppText variant="body2" color="primary" numberOfLines={2} style={styles.title}>
        {title}
      </AppText>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel={`Play next video ${title}`}
          activeOpacity={0.8}>
          <AppText variant="body2" style={styles.nextLabel}>
            Next
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel auto play"
          activeOpacity={0.7}>
          <AppText variant="body1" color="primary">
            {'✕'}
          </AppText>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default VideoPlayerAutoAdvanceCard;
