import React, {useEffect, useRef, useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {useNavigation} from '@react-navigation/native';
import {useAccessibility} from '../../../hooks/useAccessibility';

interface HomeEmptyStateProps {
  onOpenMedia: () => void;
  onBrowseLibrary?: () => void;
}

export const HomeEmptyState: React.FC<HomeEmptyStateProps> = ({
  onOpenMedia,
  onBrowseLibrary,
}) => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();
  const navigation = useNavigation<any>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      // 59.7: reduced motion — static logo, no pulse loop
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim, reduceMotion]);

  const handleBrowseLibrary = () => {
    if (onBrowseLibrary) {
      onBrowseLibrary();
    } else {
      navigation.navigate('MainTabs', {screen: 'LibraryTab'});
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.xxxl,
        },
        logoWrapper: {
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xl,
        },
        aura: {
          position: 'absolute',
          width: 140,
          height: 140,
          borderRadius: 70,
          opacity: 0.45,
        },
        title: {
          marginBottom: spacing.sm,
        },
        subtitle: {
          textAlign: 'center',
          marginBottom: spacing.xxl,
        },
        ctaPrimary: {
          paddingHorizontal: spacing.xxxl,
          paddingVertical: spacing.lg,
          borderRadius: radius.md,
          marginBottom: spacing.md,
        },
        ctaPrimaryText: {
          color: colors.text.inverse,
          fontWeight: '700',
          fontSize: 16,
          letterSpacing: 0.3,
        },
        ctaSecondary: {
          paddingHorizontal: spacing.xxxl,
          paddingVertical: spacing.lg,
          borderRadius: radius.md,
          borderWidth: 1,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.container}>
      {/* ── Animated lion logo with pulse glow ── */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {opacity: pulseAnim},
        ]}>
        <View style={[styles.aura, {backgroundColor: colors.accent.goldGlow}]} />
        {/* v8: brand-ink engraved mark on the empty state (matches
            the Splash / Login engraved treatment). The gold-soft
            aura behind it stays as a soft focus glow. */}
        <SvgIcon name="lion" size={80} color={colors.accent.brandInk} />
      </Animated.View>

      {/* ── Title ── */}
      <AppText variant="displaySans" style={styles.title}>
        Welcome to Simba
      </AppText>

      <AppText variant="body1" color="secondary" style={styles.subtitle}>
        Your media, beautifully organized
      </AppText>

      {/* ── CTA: Open Media File ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpenMedia}
        accessibilityRole="button"
        style={[styles.ctaPrimary, {backgroundColor: colors.accent.gold}]}>
        <AppText style={styles.ctaPrimaryText}>Open Media File</AppText>
      </TouchableOpacity>

      {/* ── CTA: Browse Library ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleBrowseLibrary}
        accessibilityRole="button"
        style={[
          styles.ctaSecondary,
          {borderColor: colors.border.subtle},
        ]}>
        <AppText color="secondary">Browse Library</AppText>
      </TouchableOpacity>
    </View>
  );
};
