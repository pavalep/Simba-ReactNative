// ─── Music — TrackCard ───────────────────────────────────────────────
// Horizontal row card: 52px thumb + title/artist/album + duration.
// The row IS the play action — the whole card is one TouchableOpacity —
// so there is no second play button inside it.
//
// The artwork follows the house artwork contract: the thumb shows the
// surface's OWN tile (a goldDim plate with the music glyph on it) until
// the image decodes, and the tile is dropped the moment it does. It used
// to be a bare glyph at `opacity: 0.4` over the background, which came
// out at about 6 % gold — the same invisible hole the Podcasts wave
// closed on the podcast row.

import React, {useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {createTrackCardStyles} from '../styles';
import type {JamendoTrackResult} from '../../../types/api';

interface TrackCardProps {
  item: JamendoTrackResult;
  onPress: (item: JamendoTrackResult) => void;
}

/**
 * The duration, in the app's one format.
 *
 * The seconds are FLOORED: `Math.round` produced `3:60` for a 179.7 s
 * track, and the detail screen's own formatter floored while this one
 * rounded — so the same track was drawn two different ways, and the two
 * disagreed on the empty case too.
 */
export function formatDuration(duration: number): string {
  if (!duration || duration <= 0) return '--:--';
  const m = Math.floor(duration / 60);
  const s = Math.floor(duration % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const TrackCard: React.FC<TrackCardProps> = React.memo(
  ({item, onPress}) => {
    const {colors} = useTheme();
    const styles = useMemo(() => createTrackCardStyles(colors), [colors]);

    // The thumb's tile — what the user sees while the artwork is on the
    // wire, and what stays if it never arrives. The same tile is the
    // fallback for a track that carries no artwork at all, so "no
    // artwork" and "artwork still arriving" are one picture.
    const thumbTile = (
      <View style={styles.thumbPlaceholder} testID="music-artwork-placeholder">
        <SvgIcon name="music" size={22} color={colors.accent.gold} />
      </View>
    );

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}${item.artistName ? `, ${item.artistName}` : ''}`}
        style={[
          styles.trackCard,
          {backgroundColor: colors.background.elevated},
        ]}>
        <View
          style={[
            styles.thumbWrap,
            {backgroundColor: colors.background.primary},
          ]}>
          {item.imageUrl ? (
            <MediaImage
              source={item.imageUrl}
              style={styles.thumbImage}
              resizeMode="cover"
              placeholder={thumbTile}
              accessibilityIgnoresInvertColors
              testID="music-artwork-image"
            />
          ) : (
            thumbTile
          )}
        </View>

        <View style={styles.trackInfo}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.trackName}>
            {item.name}
          </AppText>
          {item.artistName ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {item.artistName}
            </AppText>
          ) : null}
          {item.albumName ? (
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {item.albumName}
            </AppText>
          ) : null}
        </View>

        <View style={styles.trackRight}>
          <AppText variant="caption" color="tertiary">
            {formatDuration(item.duration)}
          </AppText>
        </View>
      </TouchableOpacity>
    );
  },
);
