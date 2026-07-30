// ────────────────────────────────────────────────────────
// Simba Player — ArtistHeader Component (Phase 16.2)
// Large gradient backdrop + initials avatar + name + stats
// ────────────────────────────────────────────────────────

import React, {useMemo} from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';

interface ArtistHeaderProps {
  artistName: string;
  albumCount: number;
  trackCount: number;
  /** Animated scroll value for parallax effect (0 = normal) */
  scrollY?: Animated.Value;
  /** Total height of the parallax region */
  parallaxHeight?: number;
}

const HEADER_HEIGHT = 280;
const AVATAR_SIZE = 88;

export const ArtistHeader: React.FC<ArtistHeaderProps> = ({
  artistName,
  albumCount,
  trackCount,
  scrollY,
  parallaxHeight = HEADER_HEIGHT,
}) => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();

  const initials = useMemo(
    () => artistName.charAt(0).toUpperCase(),
    [artistName],
  );

  // Parallax transforms
  const headerTranslate = useMemo(() => {
    if (!scrollY) return {transform: []};
    return {
      transform: [
        {
          translateY: scrollY.interpolate({
            inputRange: [-parallaxHeight, 0, parallaxHeight],
            outputRange: [parallaxHeight * 0.3, 0, -parallaxHeight * 0.15],
            extrapolate: 'clamp',
          }),
        },
        {
          scale: scrollY.interpolate({
            inputRange: [-parallaxHeight, 0, parallaxHeight],
            outputRange: [1.3, 1, 0.95],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  }, [scrollY, parallaxHeight]);

  const contentOpacity = useMemo(() => {
    if (!scrollY) return 1;
    return scrollY.interpolate({
      inputRange: [0, parallaxHeight * 0.6],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  }, [scrollY, parallaxHeight]);

  const backdropColors = useMemo(
    () =>
      isDark
        ? ['rgba(20,20,22,0.95)', colors.background.primary, colors.background.elevated]
        : ['rgba(240,235,225,0.95)', colors.background.primary, colors.background.elevated],
    [isDark, colors],
  );

  return (
    <Animated.View style={[styles.container, headerTranslate]}>
      {/* Gradient backdrop */}
      <LinearGradient
        colors={backdropColors}
        locations={[0, 0.5, 1]}
        style={[styles.gradient, {height: parallaxHeight}]}
        pointerEvents="none"
      />

      {/* Warm glow */}
      <View
        style={[
          styles.glow,
          {
            backgroundColor: colors.accent.gold,
            opacity: isDark ? 0.2 : 0.1,
          },
        ]}
        pointerEvents="none"
      />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {paddingTop: insets.top + 16},
          {opacity: contentOpacity},
        ]}>
        {/* Initials avatar */}
        <LinearGradient
          colors={[colors.accent.gold, colors.accent.goldDim]}
          style={styles.avatar}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}>
          <AppText
            variant="h1"
            style={[styles.initials, {color: colors.text.primary}]}>
            {initials}
          </AppText>
        </LinearGradient>

        {/* Artist name */}
        <AppText
          variant="display"
          color="primary"
          style={styles.name}
          numberOfLines={2}>
          {artistName}
        </AppText>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <AppText variant="body2" color="accent">
              {albumCount}
            </AppText>
            <AppText variant="caption" color="tertiary">
              {' '}{albumCount === 1 ? 'album' : 'albums'}
            </AppText>
          </View>
          <View style={styles.statDot}>
            <AppText variant="caption" color="tertiary">
              ·
            </AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="body2" color="accent">
              {trackCount}
            </AppText>
            <AppText variant="caption" color="tertiary">
              {' '}{trackCount === 1 ? 'track' : 'tracks'}
            </AppText>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  glow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  initials: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
  },
  name: {
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDot: {
    paddingHorizontal: 4,
  },
});
