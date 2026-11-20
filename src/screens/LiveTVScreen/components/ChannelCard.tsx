// ─── Channel Card ─────────────────────────────────────────────────────
//
// The Live TV row: a 56×56 logo, the channel's name, its category·country
// caption, a heart when the channel is a favourite, and a play glyph.
//
// THE ROW'S MENU
// --------------
// A LONG PRESS opens the app's ONE media menu (`MediaActionsSheet`), and
// the queue actions go through the app's ONE queue wrapper
// (`useQueueActions`) — so the toast and its Undo fire exactly as they do
// on every other row in the app.
//
// The menu it opens is DIFFERENT from the one this row used to open:
//
//   OLD: Remove Favorite / Add to Favorites / Add to Playlist / Bookmark /
//        Share
//   NEW: Play Next / Add to Queue / (Add to Favorites | Remove Favorite) /
//        Share
//
// "Add to Playlist" is GONE, and it had to go: the app's playlist rule
// refuses live TV (`PLAYLIST_ALLOWED_MEDIA_KINDS` in
// `src/types/playlist.ts` — "Radio, live TV, audiobooks, archives, and
// other live/specialized content stay outside the playlist domain even
// when their playback lane happens to match - a lane is not a
// permission"), so the action opened a `PlaylistSheet` that could only
// ever refuse the channel.
//
// What replaced it is what the row could NOT do at all: a channel IS a
// playable stream URL, so it can be played next and queued — the same two
// actions the Music, Movies and Radio rows offer.
//
// "Bookmark" is GONE too, and for the reason the Radio browse row gave
// it: a bookmark is a POSITION in a file, and a live channel has none —
// the bookmark it wrote was always position 0, duration 0. The
// favourites list is the live surface's own save action, so the
// bookmark was a second, emptier copy of it (B16-J-RADIO-BOOKMARK).
//
// The menu lives HERE, in the row, because the row is what owns it: the
// browse list and the favourites list draw the same card, so both get the
// same menu and neither can drift from the other.

import React, {useCallback, useMemo, useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {
  MediaActionsSheet,
  type MediaAction,
} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useQueueActions} from '../../../hooks/useQueueActions';

import {useToast} from '../../../components/feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import {shareContent} from '../../../services/shareService';
import {channelQueueItem, channelShareTarget} from '../related/channelRow';
import {useLiveTVFavoriteActions} from '../hooks/useLiveTVFavorites';
import {createChannelCardStyles} from '../styles';
import text from '../related/textContent.json';
import type {ChannelRow} from '../related/channelRow';

interface ChannelCardProps {
  row: ChannelRow;
  isFavorite: boolean;
  onPress: (row: ChannelRow) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = React.memo(
  ({row, isFavorite, onPress}) => {
    const {colors} = useTheme();
    const styles = useMemo(() => createChannelCardStyles(colors), [colors]);
    const toast = useToast();
    const haptics = useHaptics();
    // The app's ONE queue wrapper: it owns the queue-store call AND the
    // toast (with its Undo), so this screen never calls the queue store
    // directly.
    const {playNext, addToQueue} = useQueueActions();
      const {addFavorite, removeFavorite} = useLiveTVFavoriteActions();
    const [menuVisible, setMenuVisible] = useState(false);

    const handleMenuPress = useCallback(() => {
      setMenuVisible(true);
    }, []);

    const handleMenuClose = useCallback(() => {
      setMenuVisible(false);
    }, []);

    const handleToggleFavorite = useCallback(() => {
      if (isFavorite) {
        removeFavorite(row.id);
        toast.show(text.toasts.removedFromFavorites);
      } else {
        addFavorite(row);
        toast.show(text.toasts.savedToFavorites);
      }
      haptics.light();
    }, [addFavorite, haptics, isFavorite, removeFavorite, row, toast]);


    const handleShare = useCallback(() => {
      shareContent(channelShareTarget(row));
    }, [row]);

    const actions = useMemo<MediaAction[]>(
      () => [
        {
          label: text.menu.playNext,
          icon: 'skipForward',
          onPress: () => playNext(channelQueueItem(row)),
        },
        {
          label: text.menu.addToQueue,
          icon: 'list',
          onPress: () => addToQueue(channelQueueItem(row)),
        },
        {
          label: isFavorite ? text.menu.removeFavorite : text.menu.addFavorite,
          icon: 'heart',
          onPress: handleToggleFavorite,
        },

        {
          label: text.menu.share,
          icon: 'share',
          onPress: handleShare,
        },
      ],
      [
        addToQueue,
        handleShare,
        handleToggleFavorite,
        isFavorite,
        playNext,
        row,
      ],
    );

    // The thumb's tile — what the user sees while the logo is on the
    // wire, and what stays if it never arrives.
    const thumbTile = (
      <View style={styles.thumbTile} testID="livetv-artwork-placeholder">
        <SvgIcon name="video" size={22} color={colors.accent.gold} />
      </View>
    );

    return (
      <>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onPress(row)}
          onLongPress={handleMenuPress}
          delayLongPress={400}
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite
              ? text.row.favoriteSuffix.replace('{name}', row.name)
              : row.name
          }
          accessibilityHint={text.row.longPressHint}
          style={[
            styles.card,
            {backgroundColor: colors.background.elevated},
          ]}>
          <View
            style={[
              styles.thumb,
              {backgroundColor: colors.border.subtle},
            ]}>
            {row.image ? (
              <MediaImage
                source={row.image}
                style={styles.thumb}
                resizeMode="contain"
                placeholder={thumbTile}
                testID="livetv-artwork-placeholder"
              />
            ) : (
              thumbTile
            )}
          </View>

          <View style={styles.info}>
            <AppText
              variant="bodySmall"
              numberOfLines={1}
              style={styles.name}>
              {row.name}
            </AppText>
            {row.subtitle ? (
              <AppText
                variant="caption"
                color="secondary"
                numberOfLines={1}>
                {row.subtitle}
              </AppText>
            ) : null}
          </View>

          {isFavorite ? (
            <SvgIcon name="heart" size={16} color={colors.accent.gold} />
          ) : null}

          <View style={styles.playButton}>
            <SvgIcon name="play" size={16} color={colors.accent.gold} />
          </View>
        </TouchableOpacity>

        {/* The app's ONE media menu — the same sheet every other
            catalogue row opens on a long press. */}
        <MediaActionsSheet
          visible={menuVisible}
          onClose={handleMenuClose}
          title={row.name}
          subtitle={row.subtitle}
          actions={actions}
        />
      </>
    );
  },
);
