import React, {useMemo, useCallback, useState} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {PlaylistDetailScreenProps} from '../../navigation/types';

type Props = PlaylistDetailScreenProps;

interface PlaylistItem {
  id: string;
  title: string;
  duration: string;
  fileSize: string;
  color: string;
}

const INITIAL_ITEMS: PlaylistItem[] = [
  {
    id: '1',
    title: 'Introduction to the Track',
    duration: '3:24',
    fileSize: '12.5 MB',
    color: '#C9A84C',
  },
  {
    id: '2',
    title: 'Main Theme — Extended Mix',
    duration: '5:12',
    fileSize: '22.1 MB',
    color: '#4CAF50',
  },
  {
    id: '3',
    title: 'Ambient Interlude',
    duration: '2:08',
    fileSize: '8.3 MB',
    color: '#42A5F5',
  },
  {
    id: '4',
    title: 'Bass Drop Session',
    duration: '4:37',
    fileSize: '18.9 MB',
    color: '#EF5350',
  },
  {
    id: '5',
    title: 'Outro — Fade Away',
    duration: '1:55',
    fileSize: '6.7 MB',
    color: '#AB47BC',
  },
];

const THUMBNAIL_SIZE = 48;

export const PlaylistDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const {playlistName} = route.params;

  const [items, setItems] = useState<PlaylistItem[]>(INITIAL_ITEMS);

  const handleAdd = useCallback(() => {
    Alert.alert(
      'Add to Playlist',
      'Video picking flow would open here.',
    );
  }, []);

  const handlePlay = useCallback((item: PlaylistItem) => {
    Alert.alert('Now Playing', `Playing "${item.title}"`);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleLongPress = useCallback(
    (item: PlaylistItem) => {
      Alert.alert(
        'Remove Item',
        `Remove "${item.title}" from this playlist?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => handleRemove(item.id),
          },
        ],
      );
    },
    [handleRemove],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
        },
        backButton: {
          paddingRight: 16,
          paddingVertical: 4,
        },
        headerTitle: {
          flex: 1,
          flexShrink: 1,
        },
        addButton: {
          paddingLeft: 16,
          paddingVertical: 4,
        },
        emptyContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        },
        listContent: {
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20,
        },
        itemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        thumbnail: {
          width: THUMBNAIL_SIZE,
          height: THUMBNAIL_SIZE,
          borderRadius: THUMBNAIL_SIZE / 2,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        },
        thumbnailText: {
          color: colors.text.primary,
          fontWeight: '700',
          fontSize: 18,
        },
        itemInfo: {
          flex: 1,
          marginRight: 12,
        },
        itemMeta: {
          flexDirection: 'row',
          marginTop: 2,
          gap: 12,
        },
        playButton: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.accent.goldDim,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }),
    [colors, insets],
  );

  const renderItem = useCallback(
    ({item}: {item: PlaylistItem}) => (
      <TouchableOpacity
        style={styles.itemRow}
        activeOpacity={0.7}
        onPress={() => handlePlay(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}>
        <View style={[styles.thumbnail, {backgroundColor: item.color}]}>
          <AppText style={styles.thumbnailText}>
            {item.title.charAt(0).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.itemInfo}>
          <AppText variant="body2" color="primary" numberOfLines={1}>
            {item.title}
          </AppText>
          <View style={styles.itemMeta}>
            <AppText variant="caption" color="secondary">
              {item.duration}
            </AppText>
            <AppText variant="caption" color="tertiary">
              {item.fileSize}
            </AppText>
          </View>
        </View>
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => handlePlay(item)}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <AppText
            style={{color: colors.accent.gold, fontSize: 14, fontWeight: '700'}}>
            {'>'}
          </AppText>
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [styles, handlePlay, handleLongPress, colors],
  );

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <AppText
          variant="body1"
          color="secondary"
          style={{textAlign: 'center'}}>
          This playlist is empty. Add videos to get started.
        </AppText>
      </View>
    ),
    [styles],
  );

  const keyExtractor = useCallback((item: PlaylistItem) => item.id, []);

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={
          isDark
            ? [colors.background.primary, colors.background.elevated]
            : [colors.background.primary, colors.background.elevated]
        }
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <AppText variant="body1" color="accent">
            {'< Back'}
          </AppText>
        </TouchableOpacity>
        <AppText
          variant="h2"
          color="primary"
          style={styles.headerTitle}
          numberOfLines={1}>
          {playlistName}
        </AppText>
        <TouchableOpacity
          onPress={handleAdd}
          style={styles.addButton}>
          <AppText variant="body1" color="accent">
            Add
          </AppText>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          items.length === 0 ? styles.listContent : styles.listContent
        }
        ListEmptyComponent={ListEmptyComponent}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        getItemLayout={(_data, index) => ({
          length: 66,
          offset: 66 * index,
          index,
        })}
      />
    </View>
  );
};
