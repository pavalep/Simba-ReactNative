// ────────────────────────────────────────────────────────
// Simba Player — AlbumHero Component (Phase 17.3)
// Blurred full-width bg + crisp centered album art + name/artist
// ────────────────────────────────────────────────────────

import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet, Dimensions, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const ALBUM_ART_SIZE = SCREEN_WIDTH * 0.55;
const HERO_HEIGHT = 400;

interface AlbumHeroProps {
  albumName: string;
  artistName: string;
  /** Animated scroll value for parallax-like effect */
  scrollY?: Animated.Value;
  totalHeight?: number;
  onArtistPress: () => void;
}

export const AlbumHero: React.FC<AlbumHeroProps> = ({
  albumName,
  artistName,
  scrollY,
  totalHeight = HERO_HEIGHT,
  onArtistPress,
}) => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();

  // Parallax transforms for the background
  const bgTransform = useMemo(() => {
    if (!scrollY) return {};
    return {
      transform: [
        {
          translateY: scrollY.interpolate({
            inputRange: [-totalHeight, 0, totalHeight],
            outputRange: [totalHeight * 0.3, 0, -totalHeight * 0.1],
            extrapolate: 'clamp',
          }),
        },
        {
          scale: scrollY.interpolate({
            inputRange: [-totalHeight, 0, totalHeight],
            outputRange: [1.3, 1, 0.97],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  }, [scrollY, totalHeight]);

  const contentOpacity = useMemo(() => {
    if (!scrollY) return 1;
    return scrollY.interpolate({
      inputRange: [0, totalHeight * 0.5],
      outputRange: [1, 0.3],
      extrapolate: 'clamp',
    });
  }, [scrollY, totalHeight]);

  const artScale = useMemo(() => {
    if (!scrollY) return 1;
    return scrollY.interpolate({
      inputRange: [-totalHeight, 0, totalHeight],
      outputRange: [1.15, 1, 0.85],
      extrapolate: 'clamp',
    });
  }, [scrollY, totalHeight]);

  const backdropColors = isDark
    ? [colors.accent.goldDim, colors.background.primary, colors.background.elevated]
    : ['rgba(240,235,225,0.9)', colors.background.primary, colors.background.elevated];

  return (
    <Animated.View style={[styles.container, {height: totalHeight}, bgTransform]}>
      {/* Gradient backdrop */}
      <LinearGradient
        colors={backdropColors}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Warm glow */}
      <View
        style={[
          styles.glow,
          {
            backgroundColor: colors.accent.gold,
            opacity: isDark ? 0.18 : 0.1,
          },
        ]}
        pointerEvents="none"
      />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {paddingTop: insets.top + 40},
          {opacity: contentOpacity},
        ]}>
        {/* Album art placeholder */}
        <Animated.View
          style={[
            styles.artContainer,
            {backgroundColor: colors.accent.goldDim},
            {transform: [{scale: artScale}]},
          ]}>
          <AppText
            variant="h1"
            color="accent"
            style={styles.artInitials}>
            {albumName.charAt(0).toUpperCase()}
          </AppText>
        </Animated.View>

        {/* Album name */}
        <AppText
          variant="h1"
          color="primary"
          style={styles.albumName}
          numberOfLines={2}>
          {albumName}
        </AppText>

        {/* Artist name (tappable link) */}
        <TouchableOpacity onPress={onArtistPress} activeOpacity={0.7}>
          <AppText variant="body2" color="accent" style={styles.artistName}>
            {artistName}
          </AppText>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  artContainer: {
    width: ALBUM_ART_SIZE,
    height: ALBUM_ART_SIZE,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  artInitials: {
    fontSize: 64,
    fontWeight: '700',
  },
  albumName: {
    textAlign: 'center',
    paddingHorizontal: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  artistName: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
