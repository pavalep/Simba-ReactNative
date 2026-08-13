// ────────────────────────────────────────────────────────
// Simba Player — SongHero Component (Phase 18)
// Artwork + animated waveform background overlay
// ────────────────────────────────────────────────────────

import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import AudioWaveform from '../../../components/player/AudioWaveform/AudioWaveform';

interface SongHeroProps {
  title: string;
  artist: string;
  album: string | null;
  albumArtUri: string;
  onArtistPress: () => void;
  onAlbumPress?: () => void;
}

export const SongHero: React.FC<SongHeroProps> = ({
  title,
  artist,
  album,
  albumArtUri: _albumArtUri,
  onArtistPress,
  onAlbumPress,
}) => {
  const {colors, isDark} = useTheme();

  // Initials letter for placeholder
  const initial = useMemo(() => title.charAt(0).toUpperCase(), [title]);

  return (
    <LinearGradient
      colors={
        isDark
          ? [colors.accent.goldDim, colors.background.primary]
          : [colors.background.warm, colors.background.primary]
      }
      style={styles.root}>
      {/* Animated waveform background */}
      <View style={styles.waveformBg} pointerEvents="none">
        <AudioWaveform
          isPlaying={false}
          color={colors.accent.gold}
          size={120}
          barWidth={6}
          barGap={5}
        />
      </View>

      {/* Artwork */}
      <View
        style={[
          styles.artwork,
          {backgroundColor: colors.accent.goldDim},
          !isDark && [styles.artworkShadow, {shadowColor: colors.shadow}],
        ]}>
        <AppText variant="h1" color="accent" style={styles.artInitial}>
          {initial}
        </AppText>
      </View>

      {/* Track title — v7 hero, Cormorant Garamond Bold */}
      <AppText variant="displaySerif" color="primary" style={styles.title} numberOfLines={2}>
        {title}
      </AppText>

      {/* Artist link */}
      <TouchableOpacity
        onPress={onArtistPress}
        activeOpacity={0.7}
        accessibilityRole="link"
        accessibilityLabel={`View artist ${artist}`}>
        <AppText variant="body1" color="accent">
          {artist}
        </AppText>
      </TouchableOpacity>

      {/* Album link */}
      {album && onAlbumPress && (
        <TouchableOpacity
          onPress={onAlbumPress}
          activeOpacity={0.7}
          style={styles.albumRow}
          accessibilityRole="link"
          accessibilityLabel={`View album ${album}`}>
          <AppText variant="body2" color="tertiary">
            {album}
          </AppText>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  waveformBg: {
    position: 'absolute',
    top: 20,
    opacity: 0.12,
  },
  artwork: {
    width: 160,
    height: 160,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  artInitial: {
    // v8: explicit Inter Bold via family key. The 64px
    // initial letter on the gold disc cover should be clean
    // Bold 700, not fake extra-bold.
    fontFamily: FONT_FAMILY.inter.bold,
    fontSize: 64,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  albumRow: {
    marginTop: 2,
  },
  artworkShadow: {
    shadowOpacity: 0.25,
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 16,
    elevation: 12,
  },
});
