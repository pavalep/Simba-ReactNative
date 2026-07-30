// ────────────────────────────────────────────────────────
// Simba Player — SongHero Component (Phase 18)
// Artwork + animated waveform background overlay
// ────────────────────────────────────────────────────────

import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
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
  albumArtUri,
  onArtistPress,
  onAlbumPress,
}) => {
  const {colors, isDark} = useTheme();

  // Initials letter for placeholder
  const initial = useMemo(() => title.charAt(0).toUpperCase(), [title]);

  const hasAlbumArt = albumArtUri.length > 0;

  return (
    <LinearGradient
      colors={
        isDark
          ? [colors.accent.goldDim, colors.background.primary]
          : ['#f5e6d0', colors.background.primary]
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
          !isDark && {shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: {width: 0, height: 6}, shadowRadius: 16, elevation: 12},
        ]}>
        <AppText variant="h1" color="accent" style={styles.artInitial}>
          {initial}
        </AppText>
      </View>

      {/* Track title */}
      <AppText variant="h1" color="primary" style={styles.title} numberOfLines={2}>
        {title}
      </AppText>

      {/* Artist link */}
      <TouchableOpacity onPress={onArtistPress} activeOpacity={0.7}>
        <AppText variant="body1" color="accent">
          {artist}
        </AppText>
      </TouchableOpacity>

      {/* Album link */}
      {album && onAlbumPress && (
        <TouchableOpacity onPress={onAlbumPress} activeOpacity={0.7} style={styles.albumRow}>
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
    fontSize: 64,
    fontWeight: '800',
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  albumRow: {
    marginTop: 2,
  },
});
