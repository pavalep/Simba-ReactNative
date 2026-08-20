// ─── Live TV Favorites Screen ────────────────────────────────────────
// Wave 8: dedicated favorites page reached from the Live TV header heart.
// Same ChannelCard visual contract; long-press menu mirrors the main
// screen, but 'favorite' → force-remove.

import React, {useCallback, useState} from 'react';
import {
  Alert,
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  removeLiveFavorite,
  selectLiveFavoritesByKind,
} from '../../store/slices/liveFavoritesSlice';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {Placeholder} from '../../components/feedback/Placeholder';
import {shareContent} from '../../services/shareService';
import {useBookmarks} from '../../features/bookmarks';
import {useToast} from '../../components/feedback/Toast';
import {useHaptics} from '../../hooks/useHaptics';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet/PlaylistSheet';
import {OptionSheetDialog} from '../../components/core/OptionSheetDialog/OptionSheetDialog';
import {usePlaybackCommands} from '../../modules/playback';
import {
  ChannelCard,
  favToRow,
  type ChannelRow,
} from './components/ChannelCard';

type Props = RootStackScreenProps<'LiveTVFavoritesScreen'>;

export const LiveTVFavoritesScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const haptics = useHaptics();
  const {add: addBookmark} = useBookmarks();
  const {openPlayer} = usePlaybackCommands();

  const favorites = useAppSelector(s =>
    selectLiveFavoritesByKind(s, 'tv'),
  );
  const rows: ChannelRow[] = favorites.map(favToRow);

  const [menuRow, setMenuRow] = useState<ChannelRow | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<
    React.ComponentProps<typeof PlaylistSheet>['currentItem'] | null
  >(null);

  const handleChannelPress = useCallback(
    (row: ChannelRow) => {
      openPlayer({
        uri: row.url,
        title: row.name,
        duration: 0,
        source: 'api',
        type: 'live-tv',
        mediaType: 'video',
        provider: 'iptv',
      });
    },
    [openPlayer],
  );

  const handleLongPress = useCallback((row: ChannelRow) => {
    setMenuRow(row);
    setMenuVisible(true);
  }, []);

  const handleMenuSelect = useCallback(
    (value: string | number) => {
      const row = menuRow;
      if (!row) return;
      switch (value) {
        case 'favorite':
          dispatch(removeLiveFavorite({kind: 'tv', id: row.id}));
          toast.show('Removed from favorites');
          haptics.light();
          break;
        case 'playlist':
          setSheetItem({
            fileUri: row.url,
            title: row.name,
            duration: 0,
            thumbnailPath: row.image || undefined,
            source: 'api',
            type: 'live-tv',
            provider: 'iptv',
            mediaType: 'video',
          });
          break;
        case 'bookmark': {
          const input = {
            fileUri: row.url,
            title: row.name,
            position: 0,
            duration: 0,
            label: '',
            thumbnailPath: row.image || undefined,
            mediaType: 'video' as const,
            type: 'live-tv' as const,
            source: 'api' as const,
            provider: 'iptv',
          };
          const result = addBookmark(input);
          if (result.status === 'requires-confirmation') {
            Alert.alert(
              'Bookmark limit reached',
              `Adding “${row.name}” will remove the oldest bookmark “${result.candidate.title}”. Continue?`,
              [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Remove & Add',
                  style: 'destructive',
                  onPress: () => addBookmark(result.requested, {evictId: result.candidate.id}),
                },
              ],
            );
          } else {
            toast.show('Channel bookmarked');
          }
          break;
        }
        case 'share':
          shareContent({
            route: 'VideoPlayer',
            params: {
              fileUri: row.url,
              fileTitle: row.name,
              source: 'api',
              type: 'live-tv',
              provider: 'iptv',
            },
            title: row.name,
            subtitle: row.subtitle,
          });
          break;
      }
      setMenuRow(null);
    },
    [
      menuRow,
      dispatch,
      addBookmark,
      toast,
      haptics,
    ],
  );

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.primary,
          paddingTop: insets.top,
        },
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Favorite Channels" />

      {rows.length === 0 ? (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="bookmark"
          title="No favorite channels yet."
          message="Long-press any channel on Live TV to save it here."
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <ChannelCard
              row={item}
              isFavorite
              onPress={handleChannelPress}
              onLongPress={handleLongPress}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: spacing.sm,
                backgroundColor: colors.background.primary,
              }}
            />
          )}
          windowSize={5}
          maxToRenderPerBatch={10}
        />
      )}

      <OptionSheetDialog
        visible={menuVisible}
        title={menuRow?.name ?? 'Channel Options'}
        options={[
          {label: 'Remove Favorite', value: 'favorite'},
          {label: 'Add to Playlist', value: 'playlist'},
          {label: 'Bookmark', value: 'bookmark'},
          {label: 'Share', value: 'share'},
        ]}
        selectedValue={null}
        onSelect={handleMenuSelect}
        onClose={() => setMenuVisible(false)}
        colors={colors}
      />
      <PlaylistSheet
        visible={sheetItem !== null}
        onClose={() => setSheetItem(null)}
        currentItem={
          sheetItem ?? {fileUri: '', title: '', duration: 0}
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
