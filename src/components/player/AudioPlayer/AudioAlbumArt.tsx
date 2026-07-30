import React, {useRef, useEffect} from 'react';
import {View, StyleSheet, Dimensions, Animated} from 'react-native';
import FastImage from 'react-native-fast-image';
import {AppText} from '../../core/AppText/AppText';
import {useTheme} from '../../../theme';

const ART_SIZE = Math.min(Dimensions.get('window').width - 64, 280);

interface AudioAlbumArtProps {
  albumArtUri?: string | null;
}

/**
 * Premium album art component with:
 *  - FastImage for actual artwork when available
 *  - ♫ icon placeholder fallback
 *  - Cross-fade opacity transition on track change (600ms)
 *  - Subtle spring scale animation on new album art
 */
export const AudioAlbumArt: React.FC<AudioAlbumArtProps> = ({albumArtUri}) => {
  const {colors} = useTheme();
  const fadeOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const prevUriRef = useRef<string | null | undefined>(undefined);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (albumArtUri && albumArtUri !== prevUriRef.current) {
      // Cross-fade + scale on track change
      fadeOpacity.setValue(0);
      scale.setValue(0.92);
      animRef.current = Animated.parallel([
        Animated.timing(fadeOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start();
    } else if (!albumArtUri) {
      fadeOpacity.setValue(1);
      scale.setValue(1);
    }
    prevUriRef.current = albumArtUri;
    return () => {
      animRef.current?.stop();
    };
  }, [albumArtUri, fadeOpacity, scale]);

  if (albumArtUri) {
    return (
      <View style={styles.artContainer}>
        <Animated.View
          style={[
            styles.artFrame,
            {borderColor: colors.border.subtle},
            {opacity: fadeOpacity, transform: [{scale}]},
          ]}>
          <FastImage
            source={{
              uri: albumArtUri,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable,
            }}
            style={[styles.artImage, {backgroundColor: colors.border.subtle}]}
            resizeMode={FastImage.resizeMode.cover}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.artContainer}>
      <Animated.View
        style={[
          styles.artPlaceholder,
          {backgroundColor: colors.border.subtle},
          {opacity: fadeOpacity, transform: [{scale}]},
        ]}>
        <AppText style={[styles.artIcon, {color: colors.text.tertiary}]}>
          {'♫'}
        </AppText>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  artContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  artFrame: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 2,
  },
  artImage: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 12,
  },
  artPlaceholder: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artIcon: {
    fontSize: 64,
  },
});
