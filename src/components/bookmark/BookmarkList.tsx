import React, {useMemo} from 'react';
import {View, FlatList, StyleSheet, SectionList} from 'react-native';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {AppText} from '../core/AppText/AppText';
import {SvgIcon} from '../utility/SvgIcon';
import {BookmarkItem} from './BookmarkItem';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';
import type {Bookmark} from '../../store/slices/bookmarkSlice';

interface Props {
  bookmarks: Bookmark[];
  onPress: (item: Bookmark) => void;
  onDelete: (id: string) => void;
  grouped?: boolean;
}

interface Section {
  title: string;
  data: Bookmark[];
  mediaType: 'video' | 'audio';
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${secs}`;
}

export const BookmarkList: React.FC<Props> = ({
  bookmarks,
  onPress,
  onDelete,
  grouped = false,
}) => {
  const {colors} = useTheme();
  const {styles: entranceStyles} = useAnimatedEntrance(bookmarks.length, {
    staggerDelay: 50,
    direction: 'right',
    duration: 300,
  });

  const sections: Section[] = useMemo(() => {
    if (!grouped) return [];
    const map = new Map<string, Bookmark[]>();
    for (const b of bookmarks) {
      const key = b.fileUri;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return Array.from(map.entries())
      .map(([uri, items]) => ({
        title: items[0]?.title || uri.split('/').pop() || uri,
        data: items.sort((a, b) => a.position - b.position),
        mediaType: items[0]?.mediaType ?? 'video',
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [bookmarks, grouped]);

  const renderItem = ({item, index}: {item: Bookmark; index: number}) => (
    <BookmarkItem
      item={item}
      onPress={onPress}
      onDelete={onDelete}
      animatedStyle={entranceStyles[index]}
    />
  );

  if (!grouped) {
    return (
      <FlatList
        data={bookmarks}
        keyExtractor={item => item.id}
        renderItem={({item, index}) => (
          <BookmarkItem
            item={item}
            onPress={onPress}
            onDelete={onDelete}
            animatedStyle={entranceStyles[index]}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      renderSectionHeader={({section: {title, data, mediaType}}) => (
        <View
          style={[
            styles.sectionHeader,
            {borderBottomColor: colors.border.subtle},
          ]}>
          <View style={styles.sectionHeaderLeft}>
            <SvgIcon
              name={mediaType === 'audio' ? 'music' : 'video'}
              size={18}
              color={colors.accent.gold}
            />
            <AppText
              variant="body2"
              color="primary"
              numberOfLines={1}
              style={{marginLeft: spacing.sm}}>
              {title}
            </AppText>
          </View>
          <AppText variant="caption" color="secondary">
            {data.length} · {formatTime(data[data.length - 1]?.position ?? 0)}
          </AppText>
        </View>
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xxxl * 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
});
