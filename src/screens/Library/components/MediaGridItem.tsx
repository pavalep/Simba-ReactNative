import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {AppCard} from '../../../components/core/AppCard/AppCard';
import {SvgIcon} from '../../../components/utility/SvgIcon';

type MediaType = 'video' | 'audio';

interface MediaGridItemProps {
  id: string;
  title: string;
  duration: number;
  artist?: string;
  mediaType?: MediaType;
  thumbnailPath?: string;
  onPress: (id: string) => void;
  onLongPress?: (id: string) => void;
}

const formatDuration = (ms: number): string => {
  if (ms <= 0) return '--:--';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const GRID_ITEM_GAP = spacing.sm;
export const GRID_COLUMNS = 2;

const MediaGridItem: React.FC<MediaGridItemProps> = React.memo(
  ({id, title, duration, artist, mediaType = 'video', onPress, onLongPress}) => {
    const {colors} = useTheme();

    const aspectRatio = mediaType === 'video' ? 16 / 9 : 1;

    return (
      <AppCard
        elevated
        onPress={() => onPress(id)}
        onLongPress={onLongPress ? () => onLongPress(id) : undefined}
        style={styles.container}>
        {/* ── Thumbnail Area ── */}
        <View
          style={[
            styles.thumbnailWrap,
            {aspectRatio, backgroundColor: colors.accent.goldDim},
          ]}>
          {/* Media type icon */}
          <View style={styles.typeIconWrap}>
            <SvgIcon
              name={mediaType === 'video' ? 'video' : 'music'}
              size={14}
              color={colors.accent.gold}
            />
          </View>

          {/* Duration badge */}
          <View style={[styles.durationBadge, {backgroundColor: 'rgba(0,0,0,0.75)'}]}>
            <AppText variant="caption" color="primary">
              {formatDuration(duration)}
            </AppText>
          </View>
        </View>

        {/* ── Metadata ── */}
        <View style={styles.meta}>
          <AppText variant="bodySmall" color="primary" numberOfLines={2}>
            {title}
          </AppText>
          {artist ? (
            <AppText
              variant="caption"
              color="secondary"
              numberOfLines={1}
              style={styles.artistLabel}>
              {artist}
            </AppText>
          ) : null}
        </View>
      </AppCard>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  thumbnailWrap: {
    width: '100%',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.xs,
  },
  typeIconWrap: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  meta: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  artistLabel: {
    marginTop: 2,
  },
});

export default MediaGridItem;
