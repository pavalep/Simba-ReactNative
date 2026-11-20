// ─── Live TV Favorites Screen ────────────────────────────────────────
//
// The channels the user saved, on their own route.
//
// It draws the SAME row as the browse list (`ChannelCard`), so the two
// surfaces cannot drift: the same artwork plate, the same name and
// caption, and — since the row owns its menu — the same long-press menu.
//
// The menu it opens used to be a `OptionSheetDialog` of its own, offering
// "Remove Favorite / Add to Playlist / Bookmark / Share". "Add to Playlist"
// is GONE: the app's playlist rule refuses live TV
// (`PLAYLIST_ALLOWED_MEDIA_KINDS`), so the action opened a
// `PlaylistSheet` that could only refuse the channel. What replaced it is
// the two actions the row could not do before — Play Next and Add to
// Queue — plus the same favourite and share actions the browse row
// offers. The bookmark action is gone from both: a live channel has no
// position to bookmark (B16-J-RADIO-BOOKMARK).
//
// Its SHARE link used to point at `LiveTVScreen` with `fileUri`/`fileTitle`
// — a path (`tv/:categoryId?`) that parses NEITHER, so the recipient
// landed on the Live TV browser with no channel at all. The share target
// is now the app's ONE target for a channel (`related/channelRow.ts`).

import React, {useCallback, useMemo} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {useResumeAwareLaunch} from '../../../infrastructure/player';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {useLiveTVFavorites} from '../hooks/useLiveTVFavorites';
import {ChannelCard} from './ChannelCard';
import {
  channelLaunchOptions,
  favToRow,
  type ChannelRow,
} from '../related/channelRow';
import text from '../related/textContent.json';
import type {RootStackScreenProps} from '../types';

type Props = RootStackScreenProps<'LiveTVFavoritesScreen'>;

/** A MODULE-level separator. It used to be an inline arrow, which is a
 *  new component type on every render — so the FlatList re-created every
 *  separator on every render. */
const ItemSeparator: React.FC = () => {
  const {colors} = useTheme();
  return (
    <View
      style={{
        height: spacing.sm,
        backgroundColor: colors.background.primary,
      }}
    />
  );
};

export const LiveTVFavoritesScreen: React.FC<Props> = () => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {favorites} = useLiveTVFavorites();
  const {openPlayer} = useResumeAwareLaunch();

  const rows = useMemo<ChannelRow[]>(
    () => favorites.map(favToRow),
    [favorites],
  );

  /**
   * A row tap plays the channel — with the SAME payload the browse list
   * uses (`related/channelRow.ts`). The favourites screen used to launch
   * without the channel's KIND, so the seam defaulted it to the lane and
   * the channel was recorded in Recently Played as a plain video instead
   * of 'live-tv' — and the app HAS a label for it.
   */
  const handleChannelPress = useCallback(
    (row: ChannelRow) => {
      openPlayer(channelLaunchOptions(row));
    },
    [openPlayer],
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
      <InternalHeader title={text.favorites.title} />

      {rows.length === 0 ? (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="bookmark"
          title={text.favorites.emptyTitle}
          message={text.favorites.emptyMessage}
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
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={ItemSeparator}
          windowSize={5}
          maxToRenderPerBatch={10}
        />
      )}
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
