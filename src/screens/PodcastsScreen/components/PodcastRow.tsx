// ─── Podcasts — List Row ──────────────────────────────────────────────
// Single-column list row (the brand — no view group on this section):
//
//   [60×60 thumb]  Title (1 line)
//                  Author (secondary)
//                  [N ep.]          ›
//
// Thumb falls back to the `music` glyph in goldDim when the feed has no
// image or the load fails — consecutive rows never render as voids.

import React, {useMemo, useState} from 'react';
import {View, TouchableOpacity} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {createPodcastRowStyles} from '../styles';
import text from '../related/textContent.json';
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
          <FastImage
            source={{
              uri: item.image,
              priority: FastImage.priority.normal,
            }}
            style={styles.thumbImage}
            resizeMode={FastImage.resizeMode.cover}
            onError={() => setImageFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <SvgIcon name="music" size={22} color={colors.accent.goldDim} />
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
        {item.episodeCount > 0 && (
          <View style={styles.badge}>
            <AppText variant="caption" style={styles.badgeText}>
              {text.row.episodesCount.replace(
                '{count}',
                String(item.episodeCount),
              )}
            </AppText>
          </View>
        )}
      </View>

      <SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
});
