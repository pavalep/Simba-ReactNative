import React, {useRef, useEffect} from 'react';
import {View, StyleSheet, Dimensions, Animated} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../../theme';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

interface AudioGradientBgProps {
  /** URI to the album art image; when empty, renders a gradient fallback. */
  albumArtUri?: string | null;
}

/**
 * Dynamic gradient background that:
 *  - Uses album art (scaled 150%, 0.50 opacity) as the base layer
 *  - Overlays a vertical gradient (transparent → dark)
 *  - Smoothly cross-fades between track changes using Animated (600ms)
 *  - Falls back to dark solid colour when no album art available
 */
export const AudioGradientBg: React.FC<AudioGradientBgProps> = ({albumArtUri}) => {
  const {colors} = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const prevUriRef = useRef<string | null | undefined>(undefined);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (albumArtUri && albumArtUri !== prevUriRef.current) {
      // Cross-fade transition on track change
      opacity.setValue(0);
      animRef.current = Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      });
      animRef.current.start();
    }
    prevUriRef.current = albumArtUri;
    return () => {
      animRef.current?.stop();
    };
  }, [albumArtUri, opacity]);

  if (!albumArtUri) {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          {backgroundColor: colors.background.elevated},
        ]}
      />
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* ── Blurred/scaled background layer with fade transition ── */}
      <Animated.View style={[StyleSheet.absoluteFill, {opacity}]}>
        <FastImage
          source={{
            uri: albumArtUri,
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          }}
          style={styles.blurredBg}
          resizeMode={FastImage.resizeMode.cover}
        />
      </Animated.View>

      {/* ── Gradient overlay ── */}
      <View style={styles.gradientOverlay}>
        <View style={[styles.gradStop, {backgroundColor: 'transparent'}]} />
        <View style={[styles.gradStop, {backgroundColor: colors.background.scrim}]} />
        <View style={[styles.gradStop, {backgroundColor: colors.background.scrimMid}]} />
        <View style={[styles.gradStop, {backgroundColor: colors.background.scrimStrong}]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  blurredBg: {
    position: 'absolute',
    top: -SCREEN_WIDTH * 0.25,
    left: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_HEIGHT * 0.7,
    opacity: 0.50,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.65,
    justifyContent: 'flex-end',
  },
  gradStop: {
    flex: 1,
  },
});
