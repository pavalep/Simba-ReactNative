import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';

interface MediaListItemProps {
  id: string;
  title: string;
  duration: number;
  artist?: string;
  thumbnailPath?: string;
  isSelected?: boolean;
  selectionMode?: boolean;
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

const THUMBNAIL_SIZE = 48;

const MediaListItem: React.FC<MediaListItemProps> = React.memo(
  ({
    id,
    title,
    duration,
    artist,
    isSelected,
    selectionMode,
    onPress,
    onLongPress,
  }) => {
    const {colors} = useTheme();

    const showSelectionIndicator = selectionMode && isSelected;

    return (
      <TouchableOpacity
        style={[styles.container, {backgroundColor: colors.background.primary}]}
        activeOpacity={0.7}
        onPress={() => onPress(id)}
        onLongPress={onLongPress ? () => onLongPress(id) : undefined}
        delayLongPress={400}>
        {showSelectionIndicator ? (
          <View
            style={[
              styles.selectionCircle,
              {
                backgroundColor: colors.accent.gold,
                borderColor: colors.accent.gold,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.thumbnail,
              {backgroundColor: colors.accent.goldDim},
            ]}>
            <AppText
              variant="body2"
              style={[styles.thumbnailText, {color: colors.text.primary}]}>
              {title.charAt(0).toUpperCase()}
            </AppText>
          </View>
        )}
        <View style={styles.content}>
          <AppText
            variant="body2"
            numberOfLines={1}
            style={{color: colors.text.primary}}>
            {title}
          </AppText>
          {artist ? (
            <AppText
              variant="caption"
              numberOfLines={1}
              style={{color: colors.text.secondary, marginTop: spacing.xs}}>
              {artist}
            </AppText>
          ) : null}
        </View>
        <View style={styles.right}>
          <AppText
            variant="caption"
            style={{color: colors.text.secondary}}>
            {formatDuration(duration)}
          </AppText>
        </View>
      </TouchableOpacity>
    );
  },
);

export const ITEM_HEIGHT = 66;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: THUMBNAIL_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  thumbnailText: {
    fontWeight: '700',
  },
  selectionCircle: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: THUMBNAIL_SIZE / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  right: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
});

export default MediaListItem;
