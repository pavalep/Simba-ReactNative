import React, {useEffect, useMemo, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../../components/utility/SvgIcon/SvgIcon';
import {useTheme} from '../../../../theme';

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
          padding: 16,
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.10)',
          backgroundColor: 'rgba(18,18,22,0.94)',
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 8,
        },
        upNext: {
          marginBottom: 4,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        },
        title: {
          marginBottom: 12,
          fontSize: 14,
          fontWeight: '600',
          lineHeight: 20,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        nextBtn: {
          flex: 1,
          height: 44,
          borderRadius: 12,
          backgroundColor: colors.accent.gold,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
        },
        nextLabel: {
          color: colors.text.inverse,
          fontWeight: '700',
          fontSize: 14,
          letterSpacing: 0.3,
        },
        cancelBtn: {
          width: 44,
          height: 44,
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.14)',
          backgroundColor: 'rgba(255,255,255,0.08)',
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
      <AppText style={styles.upNext} color="tertiary">
        Up Next in {countdown}s
      </AppText>
      <AppText color="primary" numberOfLines={2} style={styles.title}>
        {title}
      </AppText>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel={`Play next video ${title}`}
          activeOpacity={0.8}>
          <SvgIcon name="skipForward" size={16} color={colors.text.inverse} />
          <AppText style={styles.nextLabel}>
            Next
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel auto play"
          activeOpacity={0.7}>
          <SvgIcon name="close" size={18} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default VideoPlayerAutoAdvanceCard;
