import React from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

interface AlbumArtBackgroundProps {
  /** URI to the album art image; when empty, renders a gradient fallback. */
  albumArtUri: string;
}

/**
 * Dual-layer background treatment:
 *  - Layer 1 (back): album art scaled up to ~150% with reduced opacity.
 *  - Layer 2 (front): a vertical gradient overlay that transitions from
 *    near-solid at the bottom to transparent at the top.
 *  - Fallback: a dark solid colour when no album art is available.
 */
export const AlbumArtBackground: React.FC<AlbumArtBackgroundProps> = ({
  albumArtUri,
}) => {
  const {colors} = useTheme();

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
      {/* ── Blurred/scaled background layer ── */}
      <FastImage
        source={{
          uri: albumArtUri,
          priority: FastImage.priority.high,
          cache: FastImage.cacheControl.immutable,
        }}
        style={styles.blurredBg}
        resizeMode={FastImage.resizeMode.cover}
      />

      {/* ── Gradient overlay ── */}
      <View style={styles.gradientOverlay}>
        <View style={[styles.gradStop, {backgroundColor: 'transparent'}]} />
        <View
          style={[
            styles.gradStop,
            {backgroundColor: 'rgba(10,10,12,0.50)'},
          ]}
        />
        <View
          style={[
            styles.gradStop,
            {backgroundColor: 'rgba(10,10,12,0.78)'},
          ]}
        />
        <View
          style={[
            styles.gradStop,
            {backgroundColor: 'rgba(10,10,12,0.92)'},
          ]}
        />
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
