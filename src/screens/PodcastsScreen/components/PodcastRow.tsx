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
// has no image or the load fails — consecutive rows never render as
// voids.

import React, {useMemo, useState} from 'react';
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
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!item.image && !imageFailed;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      style={styles.row}>
      {/* Thumb */}
      <View style={styles.thumbWrap}>
        {showImage ? (
          <MediaImage
            source={item.image}
            style={styles.thumbImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <SvgIcon name="podcastRings" size={22} color={colors.accent.goldDim} />
          </View>
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
