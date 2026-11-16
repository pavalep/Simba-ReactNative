// ─── Podcasts — List Row ──────────────────────────────────────────────
// Single-column list row (the brand — no view group on this section):
//
//   [60×60 thumb]  Title (1 line)
//                  Author (secondary)                ›
//
// Three things, and only three: the podcast's own artwork, its title
// and its author. There used to be a fourth — an "{n} ep." badge —
// but the catalogue's two endpoints (`/podcasts/trending` and
// `/search/byterm`) do not send `episodeCount` at all, so the badge
// could never render here.
//
// The thumb falls back to the podcast glyph in goldDim when the feed
// has no image — and while the image is still arriving, or if the load
// fails. Consecutive rows never render as voids.

import React, {useMemo} from 'react';
import {View, TouchableOpacity} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {createPodcastRowStyles} from '../styles';
import type {PodcastResult} from '../../../types/api';

interface Props {
  item: PodcastResult;
  onPress: (item: PodcastResult) => void;
}

export const PodcastRow: React.FC<Props> = React.memo(({item, onPress}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createPodcastRowStyles(colors), [colors]);

  const thumbTile = (
    <View style={styles.thumbPlaceholder} testID="podcast-artwork-placeholder">
      <SvgIcon name="podcastRings" size={22} color={colors.accent.gold} />
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      style={styles.row}>
      {/* Thumb */}
      <View style={styles.thumbWrap}>
        {item.image ? (
          <MediaImage
            source={item.image}
            style={styles.thumbImage}
            resizeMode="cover"
            placeholder={thumbTile}
            accessibilityIgnoresInvertColors
            testID="podcast-artwork-image"
          />
        ) : (
          thumbTile
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <AppText variant="bodySmall" numberOfLines={1} style={styles.title}>
          {item.title}
        </AppText>
        {item.author ? (
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {item.author}
          </AppText>
        ) : null}
      </View>

      <SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
});
