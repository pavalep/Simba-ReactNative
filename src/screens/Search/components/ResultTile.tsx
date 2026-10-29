import React, {useCallback, useMemo, useState} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {HighlightedText} from './HighlightedText';
import {MediaActionsSheet} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useQueueActions} from '../../../components/sheets/MediaActionsSheet/useQueueActions';
import type {SearchResultItem} from '../../../hooks/useSearch';
import {radius} from '../../../theme/tokens';
import {toRenderableImageUri, withCacheToken} from '../../../utils/mediaUri';

interface ResultTileProps {
  item: SearchResultItem;
  tileWidth: number;
  query: string;
  onPress: () => void;
}

export const ResultTile: React.FC<ResultTileProps> = ({
  item,
  tileWidth,
  query,
  onPress,
}) => {
  const {colors} = useTheme();
  const {playNext, addToQueue} = useQueueActions();
  // 58.4/58.5: long-press opens the standard Play Next / Add to Queue menu
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLongPress = useCallback(() => {
    if (!item.fileUri) return;
    setMenuVisible(true);
  }, [item.fileUri]);

  const percent =
    item.duration && item.duration > 0
      ? Math.round(((item.position ?? 0) / item.duration) * 100)
      : 0;

  // The thumbnail is EITHER a remote catalogue URL or a LOCAL captured
  // frame, and the two need different spellings: `file://https://…` names
  // no file at all, so the scheme is only added when one is missing.
  // `MediaRailCard` has always done exactly this; the search tile did
  // not, which is why remote artwork in the search results never
  // rendered.
  const thumbnailUri = useMemo(() => {
    const base = toRenderableImageUri(item.thumbnailPath);
    return base ? withCacheToken(base, item.lastPlayedAt ?? '') : undefined;
  }, [item.thumbnailPath, item.lastPlayedAt]);

  return (
    <>
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.75}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={`Play ${item.title || 'media'}`}
        accessibilityHint="Long press for Play Next and Add to Queue"
        style={[
          styles.resultTile,
          {
            width: tileWidth,
            backgroundColor: colors.background.elevated,
            borderColor: colors.border.subtle,
          },
        ]}>
        <View
          style={[
            styles.resultThumb,
            {backgroundColor: colors.accent.goldDim},
          ]}>
          {thumbnailUri ? (
            <MediaImage
              source={thumbnailUri}
              style={styles.resultThumbImg}
              resizeMode="cover"
            />
          ) : (
            <SvgIcon
              name="music"
              size={28}
              color={colors.text.tertiary}
              style={styles.resultThumbPlaceholder}
            />
          )}
          <View
            style={[
              styles.resultProgressTrack,
              {backgroundColor: colors.text.tertiary},
            ]}>
            <View
              style={[
                styles.resultProgressFill,
                {
                  width: `${percent}%`,
                  backgroundColor: colors.accent.gold,
                },
              ]}
            />
          </View>
        </View>
        <View style={styles.resultTitle}>
          <HighlightedText text={item.title} query={query} style={{fontSize: 12}} />
        </View>
      </TouchableOpacity>

      {/* 58.4/58.5: one menu everywhere — Play Next / Add to Queue */}
      <MediaActionsSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title={item.title}
        actions={
          item.fileUri
            ? [
                {
                  label: 'Play Next',
                  icon: 'skipForward',
                  onPress: () =>
                    playNext({
                      uri: item.fileUri!,
                      title: item.title,
                      duration: item.duration ?? 0,
                      mediaType: item.group === 'videos' ? 'video' : 'audio',
                    }),
                },
                {
                  label: 'Add to Queue',
                  icon: 'list',
                  onPress: () =>
                    addToQueue({
                      uri: item.fileUri!,
                      title: item.title,
                      duration: item.duration ?? 0,
                      mediaType: item.group === 'videos' ? 'video' : 'audio',
                    }),
                },
              ]
            : []
        }
      />
    </>
  );
};

const styles = StyleSheet.create({
  resultTile: {
    borderRadius: radius.sm,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  resultThumb: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  resultThumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultThumbPlaceholder: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    opacity: 0.45,
  },
  resultProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  resultProgressFill: {
    height: '100%',
  },
  resultTitle: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
