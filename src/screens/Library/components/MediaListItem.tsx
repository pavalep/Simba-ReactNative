import React, {useCallback, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {AppCard} from '../../../components/core/AppCard/AppCard';
import {MediaContextMenu} from './MediaContextMenu';
import {SvgIconName} from '../../../components/utility/SvgIcon';

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
  /** Optional custom context menu actions — defaults to Play + Add to Playlist + Add to Queue + Info */
  contextMenuActions?: Array<{
    label: string;
    icon: SvgIconName;
    onPress: () => void;
  }>;
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
    contextMenuActions,
  }) => {
    const {colors} = useTheme();
    const [menuVisible, setMenuVisible] = useState(false);

    const showSelectionIndicator = selectionMode && isSelected;

    const handleLongPress = useCallback(() => {
      if (onLongPress) {
        onLongPress(id);
      } else {
        setMenuVisible(true);
      }
    }, [id, onLongPress]);

    const defaultActions = contextMenuActions ?? [
      {
        label: 'Play',
        icon: 'play' as const,
        onPress: () => onPress(id),
      },
      {
        label: 'Add to Playlist',
        icon: 'listMusic' as const,
        onPress: () => {},
      },
      {
        label: 'Add to Queue',
        icon: 'list' as const,
        onPress: () => {},
      },
      {
        label: 'Info',
        icon: 'headphones' as const,
        onPress: () => {},
      },
    ];

    return (
      <>
        <AppCard
          elevated
          active={showSelectionIndicator}
          onPress={() => onPress(id)}
          onLongPress={handleLongPress}
          style={styles.container}>
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
              color="primary"
              numberOfLines={1}>
              {title}
            </AppText>
            {artist ? (
              <AppText
                variant="caption"
                color="secondary"
                numberOfLines={1}
                style={{marginTop: spacing.xs}}>
                {artist}
              </AppText>
            ) : null}
          </View>
          <View style={styles.right}>
            <AppText variant="caption" color="secondary">
              {formatDuration(duration)}
            </AppText>
          </View>
        </AppCard>

        <MediaContextMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          title={title}
          subtitle={artist}
          actions={defaultActions}
        />
      </>
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
    marginBottom: spacing.xs,
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
