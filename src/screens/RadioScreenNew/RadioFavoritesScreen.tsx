// ─── Radio Favorites Screen (v10.1 Wave 7) ─────────────────────────────
// Header-heart destination from the standalone Radio page. Pure Redux:
// lists saved radio favorites, tap to play, long-press for the same
// station menu (remove / playlist / bookmark / share).

import React, {useCallback, useMemo, useState} from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  removeLiveFavorite,
  selectLiveFavoritesByKind,
} from '../../store/slices/liveFavoritesSlice';
import {
  RadioStationCard,
  favToRow,
  type StationRow,
} from './components/RadioStationCard';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {Placeholder} from '../../components/feedback/Placeholder';
import {useToast} from '../../components/feedback/Toast';
import {useHaptics} from '../../hooks/useHaptics';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet/PlaylistSheet';
import {OptionSheetDialog} from '../../components/core/OptionSheetDialog/OptionSheetDialog';
import {shareContent} from '../../services/shareService';
import {useBookmarks} from '../../hooks/useBookmarks';

type Props = RootStackScreenProps<'RadioFavoritesScreen'>;

export const RadioFavoritesScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const haptics = useHaptics();
  const {add: addBookmark} = useBookmarks();
  const dispatch = useAppDispatch();

  const favorites = useAppSelector(s => selectLiveFavoritesByKind(s, 'radio'));
  const rows = useMemo<StationRow[]>(() => favorites.map(favToRow), [favorites]);

  const [menuRow, setMenuRow] = useState<StationRow | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<
    React.ComponentProps<typeof PlaylistSheet>['currentItem'] | null
  >(null);

  const handleStationPress = useCallback(
    (row: StationRow) => {
      navigation.navigate('AudioPlayer', {
        fileUri: row.url,
        fileTitle: row.name,
        artworkUri: row.image || undefined,
        source: 'radio',
      });
    },
    [navigation],
  );

  const handleLongPress = useCallback((row: StationRow) => {
    setMenuRow(row);
    setMenuVisible(true);
  }, []);

  const handleMenuSelect = useCallback(
    (value: string | number) => {
      const row = menuRow;
      if (!row) return;
      switch (value) {
        case 'favorite':
          dispatch(removeLiveFavorite({kind: 'radio', id: row.id}));
          toast.show('Removed from favorites');
          haptics.light();
          break;
        case 'playlist':
          setSheetItem({
            fileUri: row.url,
            title: row.name,
            duration: 0,
            thumbnailPath: row.image || undefined,
            source: 'radio',
            mediaType: 'audio',
          });
          break;
        case 'bookmark':
          addBookmark({
            fileUri: row.url,
            title: row.name,
            position: 0,
            duration: 0,
            label: '',
            thumbnailPath: row.image || undefined,
            mediaType: 'audio',
            source: 'radio',
          });
          toast.show('Station bookmarked');
          break;
        case 'share':
          shareContent({
            route: 'AudioPlayer',
            params: {fileUri: row.url, fileTitle: row.name, source: 'radio'},
            title: row.name,
            subtitle: row.subtitle,
          });
          break;
      }
      setMenuRow(null);
    },
    [menuRow, dispatch, toast, haptics, addBookmark],
  );

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Favorite Stations" />

      {rows.length === 0 ? (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="bookmark"
          title="No favorite stations yet."
          message="Long-press any station to save it here."
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <RadioStationCard
              row={item}
              isFavorite
              onPress={handleStationPress}
              onLongPress={handleLongPress}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={ItemSeparator}
        />
      )}

      <OptionSheetDialog
        visible={menuVisible}
        title={menuRow?.name ?? 'Station Options'}
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
        currentItem={sheetItem ?? {fileUri: '', title: '', duration: 0}}
      />
    </View>
  );
};

const ItemSeparator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: {flex: 1},
  listContent: {padding: spacing.md, paddingBottom: spacing.xxl + 80},
  separator: {height: spacing.sm},
});
