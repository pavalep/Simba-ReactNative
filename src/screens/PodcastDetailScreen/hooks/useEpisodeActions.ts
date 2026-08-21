// ─── Podcast Detail — Episode Interactions ────────────────────────────
// Owns everything the episodes list can do: tap-to-play (35.2), long-press
// action sheet state (35.6) and the playlist-sheet item. Keeps the screen
// component free of sheet state and dispatch plumbing.

import {useState, useCallback} from 'react';
import type {PodcastResult, PodcastEpisodeResult} from '../../../types/api';
import type {PodcastDetailScreenProps} from '../../../navigation/types';
import {useAppDispatch} from '../../../store';
import {addToQueue, prependToQueue} from '../../../store/slices/playerSlice';
import {useBookmarks} from '../../../features/bookmarks';
import {useToast} from '../../../components/feedback/Toast';
import {shareContent} from '../../../services/shareService';
import {PlaylistSheet} from '../../../components/sheets/PlaylistSheet/PlaylistSheet';
import {usePlaybackCommands} from '../../../modules/playback';
import text from '../related/textContent.json';

type Navigation = PodcastDetailScreenProps['navigation'];
type SheetItem = React.ComponentProps<typeof PlaylistSheet>['currentItem'] | null;

interface Options {
  podcast: PodcastResult | null;
  navigation: Navigation;
}

export function useEpisodeActions({podcast, navigation}: Options) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const {add: addBookmark} = useBookmarks();
  const {openPlayer} = usePlaybackCommands();

  // 35.6: episode long-press actions
  const [menuEpisode, setMenuEpisode] = useState<PodcastEpisodeResult | null>(
    null,
  );
  const [episodeMenuVisible, setEpisodeMenuVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<SheetItem>(null);

  // 35.2: play an episode with art + origin metadata
  const handleEpisodePress = useCallback(
    (episode: PodcastEpisodeResult) => {
      openPlayer({
        uri: episode.enclosureUrl,
        title: episode.title,
        duration: episode.duration || 0,
        artworkUri: episode.image || podcast?.image || undefined,
        source: 'api',
        provider: 'podcastIndex',
        type: 'podcast',
        mediaType: 'audio',
      });
    },
    [openPlayer, podcast],
  );

  // 35.6: long-press → play next / queue / playlist / bookmark / share
  const handleEpisodeLongPress = useCallback(
    (episode: PodcastEpisodeResult) => {
      setMenuEpisode(episode);
      setEpisodeMenuVisible(true);
    },
    [],
  );

  const handleEpisodeMenuSelect = useCallback(
    (value: string | number) => {
      const ep = menuEpisode;
      if (!ep) return;
      const art = ep.image || podcast?.image || undefined;
      const source = 'api' as const;
      const provider = 'podcastIndex' as const;
      switch (value) {
        case 'play-next':
          dispatch(
            prependToQueue({
              uri: ep.enclosureUrl,
              title: ep.title,
              duration: ep.duration,
              source,
              provider,
              type: 'podcast',
              mediaType: 'audio',
            }),
          );
          toast.show(text.actions.playingNext);
          break;
        case 'add-queue':
          dispatch(
            addToQueue({
              uri: ep.enclosureUrl,
              title: ep.title,
              duration: ep.duration,
              source,
              provider,
              type: 'podcast',
              mediaType: 'audio',
            }),
          );
          toast.show(text.actions.addedToQueue);
          break;
        case 'add-playlist':
          setSheetItem({
            fileUri: ep.enclosureUrl,
            title: ep.title,
            duration: ep.duration,
            artist: podcast?.author,
            thumbnailPath: art,
            source,
            provider,
            type: 'podcast',
            mediaType: 'audio',
          });
          break;
        case 'bookmark':
          addBookmark({
            fileUri: ep.enclosureUrl,
            title: ep.title,
            position: 0,
            duration: ep.duration,
            label: '',
            thumbnailPath: art,
            mediaType: 'audio',
            source,
            provider,
            type: 'podcast',
          });
          toast.show(text.actions.bookmarked);
          break;
        case 'share':
          shareContent({
            route: 'SongScreen',
            params: {
              fileUri: ep.enclosureUrl,
              fileTitle: ep.title,
              source,
              provider,
              type: 'podcast',
              mediaType: 'audio',
            },
            title: ep.title,
            subtitle: podcast?.author,
          });
          break;
      }
      setMenuEpisode(null);
    },
    [menuEpisode, podcast, dispatch, toast, addBookmark],
  );

  return {
    menuEpisode,
    episodeMenuVisible,
    setEpisodeMenuVisible,
    sheetItem,
    setSheetItem,
    handleEpisodePress,
    handleEpisodeLongPress,
    handleEpisodeMenuSelect,
  };
}
