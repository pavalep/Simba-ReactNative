// ─── Music — TrackCard ──────────────────────────────────────────────
// Horizontal row card: 52px thumb + title/artist/album + duration +
// play button. Local "image failed" state so a broken thumbnail falls
// back to the music-icon placeholder instead of the broken-image icon.

import React, {useMemo, useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {createTrackCardStyles} from '../styles';
import type {JamendoTrackResult} from '../../../types/api';

interface TrackCardProps {
  item: JamendoTrackResult;
  onPress: (item: JamendoTrackResult) => void;
}

function formatDuration(duration: number): string {
  if (!duration || duration <= 0) return '--:--';
  const m = Math.floor(duration / 60);
  const s = Math.round(duration % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export const TrackCard: React.FC<TrackCardProps> = React.memo(
  ({item, onPress}) => {
    const {colors} = useTheme();
    const styles = useMemo(() => createTrackCardStyles(), []);
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = !!item.imageUrl && !imageFailed;

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
          {showImage ? (
            <FastImage
              source={{
                uri: item.imageUrl,
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

        <View style={styles.trackInfo}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.trackName}>
            {item.name}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {item.artistName}
          </AppText>
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
          <View style={[styles.playButton, {backgroundColor: colors.accent.gold}]}>
            <SvgIcon name="play" size={14} color={colors.text.inverse} />
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);
