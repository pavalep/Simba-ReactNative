// ─── Radio Favorites Screen ────────────────────────────────────────────
// The saved stations — the destination of the browse screen's header
// heart.
//
// It used to own a DIFFERENT menu from the browse screen: an
// `OptionSheetDialog` with "Add to Playlist" (which the app's playlist rule
// refuses for radio — `PLAYLIST_ALLOWED_MEDIA_KINDS`: "a lane is not a
// permission", so the sheet it opened listed NO compatible playlist), no
// queue action at all (a saved station could not be queued from the only
// screen a saved station lives on), and a `provider: 'radio'` that named
// the KIND in the slot that names the SOURCE.
//
// It now offers the app's ONE media menu (`MediaActionsSheet`) with what a
// station can actually do, and the queue actions go through the app's ONE
// queue wrapper (`useQueueActions`), which owns the toast and its Undo.
//
// The station's classification comes from `stationQueueItem` — the same
// owner the browse screen uses — so the same station is classified the
// same way from either route.
//
// It used to offer "Bookmark" here as well as on the browse row. It
// offers neither now: a bookmark is a POSITION in a file, and a station
// has none — the bookmark was always position 0, duration 0, and the
// favourites list is already the place a station is saved
// (B16-J-RADIO-BOOKMARK).

import React, {useCallback, useMemo, useState} from 'react';
import {View, FlatList} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import type {RootStackScreenProps} from '../types';
import {
  RadioStationCard,
  favToRow,
  type StationRow,
} from '../components/RadioStationCard';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {useToast} from '../../../components/feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import {
  MediaActionsSheet,
  type MediaAction,
} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useQueueActions} from '../../../hooks/useQueueActions';
import {shareContent} from '../../../services/shareService';

import {resolveStreamType, useResumeAwareLaunch} from '../../../infrastructure/player';
import {useLiveFavoritesStore} from '../../../state';
import {createRadioFavoritesStyles} from '../styles';
import {stationQueueItem} from '../related/stationRow';
import text from '../related/textContent.json';

type Props = RootStackScreenProps<'RadioFavoritesScreen'>;

export const RadioFavoritesScreen: React.FC<Props> = () => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const haptics = useHaptics();
  const {openPlayer} = useResumeAwareLaunch();
  const styles = useMemo(() => createRadioFavoritesStyles(), []);
  // The app's ONE queue wrapper: it owns the queue-store call AND the
  // toast (with its Undo), so this screen never calls the queue store
  // directly and never raises a queue toast by hand.
  const {playNext, addToQueue} = useQueueActions();

  // V23 W24 (2026-11-05) — select the stable array, derive outside the
  // selector. Filtering inside the selector built a NEW array on every call,
  // so zustand's `Object.is` comparison never matched and the store drove an
  // unbounded re-render loop ("Maximum update depth exceeded").
  const allFavorites = useLiveFavoritesStore(s => s.items);
  const favorites = useMemo(
    () => allFavorites.filter(f => f.kind === 'radio'),
    [allFavorites],
  );
  const rows = useMemo<StationRow[]>(() => favorites.map(favToRow), [favorites]);

  const [menuRow, setMenuRow] = useState<StationRow | null>(null);

  const handleStationPress = useCallback(
    (row: StationRow) => {
      openPlayer({
        uri: row.url,
        title: row.name,
        type: resolveStreamType('radio'),
        // The KIND and the LANE — the same pair the browse screen sends,
        // so the same station is labelled the same way from either screen.
        mediaKind: 'radio',
        mediaLane: 'audio',
        ...(row.image ? {thumbnailPath: row.image} : {}),
      });
    },
    [openPlayer],
  );

  const handleLongPress = useCallback((row: StationRow) => {
    setMenuRow(row);
  }, []);

  const menuActions = useMemo<MediaAction[]>(() => {
    if (!menuRow) return [];
    const queueItem = stationQueueItem(menuRow);
    return [
      {
        label: text.menu.playNext,
        icon: 'skipForward',
        onPress: () => playNext(queueItem),
      },
      {
        label: text.menu.addToQueue,
        icon: 'list',
        onPress: () => addToQueue(queueItem),
      },
      {
        label: text.menu.removeFavorite,
        icon: 'heart',
        onPress: () => {
          useLiveFavoritesStore
            .getState()
            .removeLiveFavorite({kind: 'radio', id: menuRow.id});
          toast.show(text.toasts.removedFromFavorites);
          haptics.light();
        },
      },

      {
        label: text.menu.share,
        icon: 'share',
        onPress: () =>
          shareContent({
            // ONE share target for the whole feature, and the params the
            // linking config actually parses. This used to share to
            // `route: 'RadioScreen'`, whose linking config carried only
            // `initialTab` — so the station was lost entirely and the
            // recipient landed on the browse screen with nothing.
            route: 'SongScreen',
            params: {fileUri: menuRow.url, title: menuRow.name, source: 'radio'},
            title: menuRow.name,
            subtitle: menuRow.subtitle,
          }),
      },
    ];
  }, [menuRow, toast, haptics, playNext, addToQueue]);

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title={text.favorites.screenTitle} />

      {rows.length === 0 ? (
        <Placeholder
          variant="empty"
          anchor="top-third"
          icon="heart"
          title={text.favorites.emptyTitle}
          message={text.favorites.emptyMessage}
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
        />
      )}

      <MediaActionsSheet
        visible={menuRow !== null}
        onClose={() => setMenuRow(null)}
        title={menuRow?.name ?? ''}
        subtitle={menuRow?.subtitle}
        actions={menuActions}
      />
    </View>
  );
};
