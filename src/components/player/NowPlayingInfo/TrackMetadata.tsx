import React from 'react';
import {View, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import type {TrackMetadata as TrackMetadataType} from '../../../services/metadataService';

interface TrackMetadataProps {
  metadata: TrackMetadataType;
}

export const TrackMetadata: React.FC<TrackMetadataProps> = ({metadata}) => {
  const {colors} = useTheme();

  return (
    <View style={styles.container}>
      {/* ── Album art ── */}
      <View style={[styles.artWrapper, {borderColor: colors.border.subtle}]}>
        {metadata.albumArtUri ? (
          <FastImage
            source={{
              uri: metadata.albumArtUri,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable,
            }}
            style={styles.artImage}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={[styles.artFallback, {backgroundColor: colors.background.elevated}]} />
        )}
      </View>

      {/* ── Text rows ── */}
      <AppText variant="h2" numberOfLines={1} style={styles.title}>
        {metadata.title || 'Unknown Track'}
      </AppText>

      {metadata.artist ? (
        <AppText variant="body1" color="secondary" numberOfLines={1}>
          {metadata.artist}
        </AppText>
      ) : null}

      {metadata.album ? (
        <AppText variant="caption" color="tertiary" numberOfLines={1}>
          {metadata.album}
          {metadata.year > 0 ? `  ·  ${metadata.year}` : ''}
        </AppText>
      ) : null}

      {/* ── Genre / track number row ── */}
      {(metadata.genre || metadata.trackNumber > 0) && (
        <View style={styles.chips}>
          {metadata.genre ? (
            <View style={[styles.chip, {backgroundColor: colors.background.elevated}]}>
              <AppText variant="caption" color="tertiary">
                {metadata.genre}
              </AppText>
            </View>
          ) : null}
          {metadata.trackNumber > 0 ? (
            <View style={[styles.chip, {backgroundColor: colors.background.elevated}]}>
              <AppText variant="caption" color="tertiary">
                Track {metadata.trackNumber}
              </AppText>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  artWrapper: {
    width: 220,
    height: 220,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.lg,
    elevation: 8,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
  artFallback: {
    width: '100%',
    height: '100%',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
