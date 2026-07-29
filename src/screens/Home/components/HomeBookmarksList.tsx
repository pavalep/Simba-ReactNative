import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import type {BookmarkEntry} from '../../../store/slices/sessionSlice';

interface Props {
  items: BookmarkEntry[];
  onPress: (item: BookmarkEntry) => void;
  onRemove: (id: string) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

export const HomeBookmarksList: React.FC<Props> = ({items, onPress, onRemove}) => {
  const {colors} = useTheme();
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <AppText variant="h3" color="primary">Bookmarks</AppText>
          <AppText variant="caption" color="secondary">Saved moments, ready when you are</AppText>
        </View>
        <SvgIcon name="bookmark" size={22} color={colors.accent.gold} />
      </View>
      <View style={styles.list}>
        {items.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.row, {borderBottomColor: colors.border.subtle}]}
            onPress={() => onPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`Play ${item.title} at ${formatTime(item.position)}`}>
            <View style={[styles.thumb, {backgroundColor: colors.background.elevated}]}>
              {item.thumbnailPath ? (
                <FastImage source={{uri: item.thumbnailPath}} style={StyleSheet.absoluteFill} resizeMode={FastImage.resizeMode.cover} />
              ) : (
                <SvgIcon name={item.mediaType === 'audio' ? 'music' : 'video'} size={22} color={colors.text.tertiary} />
              )}
            </View>
            <View style={styles.info}>
              <AppText variant="body2" color="primary" numberOfLines={1}>{item.title}</AppText>
              <AppText variant="caption" color="secondary">{formatTime(item.position)} · {new Date(item.createdAt).toLocaleDateString()}</AppText>
            </View>
            <TouchableOpacity
              style={styles.remove}
              onPress={() => onRemove(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove bookmark for ${item.title}`}>
              <SvgIcon name="close" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {marginHorizontal: spacing.sm, marginBottom: spacing.xxl, padding: spacing.md},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md},
  list: {borderRadius: 14, overflow: 'hidden'},
  row: {minHeight: 76, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 10},
  thumb: {width: 92, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  info: {flex: 1, marginHorizontal: spacing.md, gap: 4},
  remove: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
});

