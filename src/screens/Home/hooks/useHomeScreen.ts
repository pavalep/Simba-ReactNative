import {useCallback, useMemo} from 'react';
import {useTheme} from '../../../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CommonActions} from '@react-navigation/native';
import {type HomeScreenProps} from '../../../navigation/types';
import type {RootStackParamList} from '../../../navigation/types';
import {pickMediaFile, classifyPickedMedia} from '../../../services/fileService';
import {useBookmarks} from '../../../features/bookmarks';
import {pinnedAtMs, usePlaylists} from '../../../features/playlists';
import {logger} from '../../../lib/logger';

import {useFollowedPodcasts} from '../../../features/followedPodcasts';

import {useRecentHistory} from '../../../features/recentHistory';
import {resolveStreamType, useResumeAwareLaunch} from '../../../infrastructure/player';
import {MAX_RECENT_HISTORY_ENTRIES} from '../../../state/recentHistoryStore';
import {useConfirmDialog} from '../../../components/core/Dialog';
import {useToast} from '../../../components/feedback/Toast';
import {formatDuration} from '../../../utils/timeAgo';
import type {MediaKind, MediaLane, MediaSource} from '../../../types/media';
import {useAuth} from '../../../hooks/useAuth';
import {useWeather} from '../../../hooks/useWeather';
import type {WeatherCondition} from '../../../components/utility/WeatherIcon';
import type {WeatherSnapshot} from '../../../infrastructure/api/weather/adapter';
import type {HomeSection} from '../types';
import type {WeatherDetail} from '../components/WeatherGreeting/WeatherGreeting.types';
import {useMediaStore} from '../../../state';

// ── Helpers ──

interface GreetingInfo {
  text: string;
  /** Weather condition for the Lottie icon — driven by the live snapshot. */
  condition: WeatherCondition;
  /**
   * Structured weather detail for the ONE weather line under the name.
   * Null when we don't have a snapshot — and then there is no line at
   * all and no chip (V2: a footnote can never compete with the name,
   * and a placeholder for weather that does not exist is a lie).
   */
  weather: WeatherDetail | null;
  /**
   * True only while the very first cold-start fetch is in flight AND
   * we have no cached snapshot to fall back on.
   *
   * V2: it draws NOTHING. The greeting shows the salutation and the
   * name, and the weather arrives when it arrives.
   */
  isFirstLoad: boolean;
}

function greetingTextFromHour(hour: number): string {
  if (hour >= 5 && hour < 12) {return 'Good morning';}
  if (hour >= 12 && hour < 17) {return 'Good afternoon';}
  if (hour >= 17 && hour < 22) {return 'Good evening';}
  return 'Good night';
}

function buildWeather(snapshot: WeatherSnapshot | null): WeatherDetail | null {
  if (!snapshot) {return null;}
  return {
    description: snapshot.description,
    cityName: snapshot.cityName,
    temperatureC: snapshot.temperatureC,
  };
}

function buildGreeting(snapshot: WeatherSnapshot | null, isFirstLoad: boolean): GreetingInfo {
  const hour = new Date().getHours();
  const text = greetingTextFromHour(hour);
  const condition: WeatherCondition = snapshot?.condition ?? 'partlyCloudy';
  const weather = buildWeather(snapshot);
  return {text, condition, weather, isFirstLoad};
}

// W9.5: `isInProgress(item)` used to live here — "position > 30s and
// more than 5s from the end" — with a docblock claiming it drove a
// "time left" badge on the shelf card. It had zero call sites, and no
// such badge existed. Deleted rather than wired: the card expresses
// progress directly (a 0…1 bar plus the elapsed/total line), and a
// second rule deciding what counts as in-progress would have been a
// second answer to a question the card already answers.
//
// P61: extract a first name for the greeting. The auth user carries
// `name` as a single string ("Paval EP", "Sundar Pichai"); we want
// just the first token. Falls back to "there" so the salutation
// stays grammatical when no user is signed in or the name is empty.
function deriveFirstName(authUser: {name?: string} | null | undefined): string {
  if (!authUser?.name) {return 'there';}
  const first = authUser.name.trim().split(/\s+/)[0] ?? '';
  return first.length > 0 ? first : 'there';
}

/**
 * How many playlists Home's playlist shelf shows.
 *
 * The cap lives HERE, next to the order it applies to, rather than at
 * the call site: the shelf and its limit are one decision.
 */
const HOME_PLAYLIST_SHELF_LIMIT = 3;

// ── Hook ──

export function useHomeScreen(navigation: HomeScreenProps['navigation']) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {openPlayer} = useResumeAwareLaunch();
  const {user} = useAuth();
  const {snapshot: weatherSnapshot, isFirstLoad: weatherFirstLoad} = useWeather();

  // ── Data from the stores ──
  const {list: recentFiles, removeRecent} = useRecentHistory();
  const {allBookmarks: bookmarks, remove: removeBookmark} = useBookmarks();
  const {confirm} = useConfirmDialog();
  const toast = useToast();

  const {list: playlists, setPinned: setPlaylistPinned} = usePlaylists();
  const {list: followedPodcasts} = useFollowedPodcasts();
  const isScanning = useMediaStore(s => s.isScanning);

  // ── Navigation Handlers ──
  const handleOpenMedia = useCallback(async () => {
    try {
      const file = await pickMediaFile();
      if (!file) return;

      // The lane comes from the MIME type the picker reported and from
      // the file's NAME — not from the URI.
      //
      // The URI of a picked file is a `content://` URI with no
      // extension (`.../document/audio%3A1000000064`), so the old
      // `getMediaType(file.uri)` could not classify it and fell through
      // to its 'video' default: every picked AUDIO file was launched in
      // the VIDEO lane. The picker already answers the question twice,
      // and both answers are in hand here.
      const mediaType = classifyPickedMedia(file);

      // AWAITED, and its result checked.
      //
      // `openPlayer` is async and it REJECTS when the launch fails. The
      // old call was fire-and-forget, so a rejection never reached the
      // `catch` below — it surfaced as an unhandled rejection instead
      // of the logged warning the comment claimed, and the user saw
      // nothing at all.
      //
      // `false` is the other way it can fail: the lib's own contract is
      // that `false` means "nothing was attempted" (the audio service
      // could not start, or the bridge is in no-op mode). Either way the
      // user picked a file and nothing is playing, so it has to be said
      // out loud.
      const started = await openPlayer({
        uri: file.uri,
        title: file.title || 'Untitled',
        type: resolveStreamType(mediaType),
      });
      if (!started) {
        logger.warn('[useHomeScreen] pick+play did not start', {
          uri: file.uri,
        });
        toast.show('Could not open that file', 'error');
      }
    } catch (e) {
      // V16 Phase 73: the pickMediaFile()/openPlayer() sequence
      // was the most common entry point. The silent swallow was
      // hiding "user picked a file but nothing happened" reports.
      logger.warn('[useHomeScreen] pick+play failed', e);
      // The log is for us. The toast is for the user, who is holding a
      // file they just chose and watching nothing happen.
      toast.show('Could not open that file', 'error');
    }
  }, [openPlayer, toast]);

  const handleItemPress = useCallback(
    (item: {
      mediaType?: MediaLane;
      fileUri: string;
      title: string;
      thumbnailPath?: string;
      position?: number;
      source?: MediaSource;
      type?: MediaKind;
      provider?: string;
      folderId?: string;
    }) => {
      // W9.5 — this handler feeds BOTH library shelves, and it used to
      // pass `startPositionMs: item.startPosition ?? item.position`.
      // `position` is SECONDS and the field is MILLISECONDS, so every
      // shelf tap asked for a ~1000x-too-early seek, and it bypassed the
      // resume policy outright — a user who bookmarked a moment got
      // the raw history position instead. Resume is decided at the
      // seam; a shelf only says WHAT it is.
      const streamType = resolveStreamType(item.type ?? item.mediaType ?? 'video');
      // The lane is what the shelves and the checkpoint writer branch on.
      // It used to be absent entirely, so `normalizeMediaClassification`
      // defaulted it to 'audio' and every film rendered with a music
      // badge. Derive it from the resolved stream type so an item with
      // no stored lane still classifies correctly.
      const lane: MediaLane = item.mediaType ?? (streamType === 'audio' ? 'audio' : 'video');

      openPlayer({
        uri: item.fileUri,
        title: item.title,
        type: streamType,
        mediaKind: item.type,
        mediaLane: lane,
        ...(item.provider ? {provider: item.provider} : {}),
        // The CATALOGUE artwork — deliberately `item.thumbnailPath` and
        // NOT `resolveMediaArtwork(item)`, which would answer with the
        // captured frame.
        //
        // The two are different questions. The card draws the frame
        // because a continue-watching rail sells *where you were*; the
        // launch carries the artwork of the TITLE, because the launch's
        // field becomes the media notification's icon (an album cover,
        // never a still of one moment of a film) AND the history entry's
        // catalogue slot (`recentHistoryStore.ts` writes the session's
        // `thumbnailPath` there). Handing the frame over instead would
        // replace that poster with a local still on the next checkpoint,
        // and the search tile — which draws the catalogue slot — would
        // show the still where it should show the poster (B-026).
        //
        // The history entry ALREADY carries the captured frame, in its
        // own `resumeThumbnailPath` field, written by the checkpoint
        // writer and read by the bookmark the same way
        // (`useBookmarkToggle.ts`). Nothing here needs to move it.
        //
        // An entry whose catalogue slot is `''` is an entry written
        // before the launch carried artwork at all: the slot is filled
        // from the LAUNCH (`usePlaybackCheckpointSync.ts` ← the session),
        // so it was empty because every caller left the field out. The
        // callers that had artwork now hand it over, so the next launch
        // of that file fills the slot — and this line has something to
        // pass.
        ...(item.thumbnailPath ? {thumbnailPath: item.thumbnailPath} : {}),
      });
    },
    [openPlayer],
  );

  const handleRemoveRecent = useCallback(
    async (item: {fileUri: string; title: string}) => {
      // Destructive, so it is confirmed rather than undone. The
      // History screen has always done this with `useConfirmDialog`
      // (`HistoryScreen.tsx:141`); the shelf reuses the same primitive
      // rather than deleting on the first long-press, because a rail
      // is a scrolling surface and a stray long-press is easy.
      const ok = await confirm({
        title: 'Remove from Recently Played?',
        message: `"${item.title}" will leave your history. The file itself is not deleted.`,
        confirmLabel: 'Remove',
        cancelLabel: 'Keep',
        destructive: true,
      });
      if (!ok) return;
      removeRecent(item.fileUri);
      toast.show(`Removed "${item.title}" from Recently Played`, 'success');
    },
    [confirm, removeRecent, toast],
  );

  const handleRemoveBookmark = useCallback(
    async (item: {id: string; title: string; position: number}) => {
      const ok = await confirm({
        title: 'Remove bookmark?',
        message: `The bookmark at ${formatDuration(item.position)} of "${item.title}" will be deleted.`,
        confirmLabel: 'Remove',
        cancelLabel: 'Keep',
        destructive: true,
      });
      if (!ok) return;
      removeBookmark(item.id);
      toast.show('Bookmark removed', 'success');
    },
    [confirm, removeBookmark, toast],
  );

  const handlePlaylistPress = useCallback(
    (playlistId: string) => {
      navigation.dispatch(CommonActions.navigate({name: 'PlaylistDetail', params: {playlistId}}));
    },
    [navigation],
  );

  /**
   * Pin or unpin a playlist from the Home tile.
   *
   * The tile is a BROWSING surface, so it carries no permanent pin
   * button (D-P8) — the long-press menu is the shortcut, and All
   * Playlists keeps the visible 32 px toggle, so the pin is never
   * reachable by gesture alone.
   */
  const handleTogglePin = useCallback(
    (playlistId: string, pinned: boolean) => {
      setPlaylistPinned(playlistId, pinned);
    },
    [setPlaylistPinned],
  );

  const handleSearchPress = useCallback(
    () => navigation.navigate('Search'),
    [navigation],
  );

  const handleSeeAll = useCallback(
    (routeName: keyof RootStackParamList | 'LocalFiles') => {
      if (routeName === 'LocalFiles') {
        navigation.navigate('Library');
        return;
      }
      navigation.dispatch(CommonActions.navigate({name: routeName}));
    },
    [navigation],
  );

  const handleAvatarPress = useCallback(() => {
    // 42.1: avatar opens the Profile screen (stats, sign out, account)
    navigation.navigate('Profile');
  }, [navigation]);

  // P58: "See All" on the Bookmarks rail navigates to the Bookmarks
  // screen. It used to be a second handler (`handleBookmarksPress`)
  // returned alongside this one, because the header once had a
  // bookmark shortcut of its own. The header has not had one since the
  // Bookmarks became a rail, so the second name was a second answer
  // to a question only the rail asks.
  const handleBookmarksSeeAll = useCallback(() => {
    navigation.navigate('Bookmarks');
  }, [navigation]);

  // ── Compute Sections ──
  const sections = useMemo((): HomeSection[] => {
    // The pinned rail's CONTENTS: the pinned playlists only, most
    // recently pinned first — the one order the title can claim, and the
    // same rule the All Playlists page uses (`pinnedAtMs` is the one
    // owner). The unpinned playlists are NOT here; they live behind
    // "See All" → All Playlists.
    const pinnedPlaylists = playlists
      .filter(p => p.pinned)
      .sort((a, b) => pinnedAtMs(b) - pinnedAtMs(a))
      .slice(0, HOME_PLAYLIST_SHELF_LIMIT);

    const libraryRails: HomeSection[] = [
      {
        type: 'SHELF',
        title: 'Recently Played',
        // The cap lives in the store, and the section reads it rather
        // than repeating the number. The rail used to slice to 10 here
        // AND default to rendering 8, so the two limits disagreed and
        // the visible list silently lost two entries.
        items: recentFiles.slice(0, MAX_RECENT_HISTORY_ENTRIES),
        seeAllRoute: 'History',
      },
      // D-P3 + spec §4.6: the rail is titled "Pinned Playlists" and holds
      // ONLY the pinned playlists, so the title is true of every tile in
      // it. It sits here, inside "Your Library", with the other two
      // per-user rails — it used to be pushed AFTER the "Discover" group,
      // which filed a personal shelf under discovery.
      {type: 'PINNED_PLAYLISTS', items: pinnedPlaylists},
      {type: 'BOOKMARKS', items: bookmarks},
      {type: 'FOLLOWED_PODCASTS', items: followedPodcasts},
    ];

    // A RAIL WITH NOTHING IN IT IS NOT DRAWN.
    //
    // `'items' in rail` narrows the union to the four arms that carry
    // items — GREETING, SUBSECTION_TITLE and BROWSE_ALL have none.
    //
    // Netflix's Continue Watching, Plex's Continue Watching, YouTube's
    // History and Spotify's "Jump back in" all lead with the personal,
    // and none of them draws an empty row to get there. A fresh install
    // has no library, so the page starts with Discover — not because
    // Discover moved up, but because there is no library to show.
    const populated = libraryRails.filter(rail => 'items' in rail && rail.items.length > 0);

    const realSections: HomeSection[] = [{type: 'GREETING'}];

    // "Your Library" is a GROUP, and a group with nothing in it is not
    // drawn either — the divider would be a heading over no rails.
    //
    // v9f: Cormorant Garamond Italic 18 px at 0.9 gold — readable
    // editorial accent, not a competing heading. v9 (full gold)
    // was attention-seeking; v9b (goldGlow 0.25) was invisible;
    // v9c (0.6) was close; v9d (0.7), v9e (0.8) needed more;
    // v9f (0.9) is approaching full but stays slightly soft.
    if (populated.length > 0) {
      realSections.push({
        type: 'SUBSECTION_TITLE',
        label: 'Your Library',
        variant: 'displaySerif',
      });
      realSections.push(...populated);
    }

    // Discover / API-backed catalog browse — grouped under a "Discover"
    // sub-section title. v10.2: the 8 separate category rails collapse
    // into ONE "Browse All" rail (one card per top-level section) so
    // the page stays scannable.
    realSections.push(
      {type: 'SUBSECTION_TITLE', label: 'Discover', variant: 'displaySerif'},
      {type: 'BROWSE_ALL'},
    );

    return realSections;
  }, [recentFiles, playlists, bookmarks, followedPodcasts]);

  return {
    colors,
    insets,
    isScanning,
    sections,
    greeting: buildGreeting(weatherSnapshot, weatherFirstLoad),
    /**
     * P61: first name shown in the greeting block ("Good afternoon, Paval").
     * Falls back to "there" when the user isn't signed in or the
     * Google profile has no given name — keeps the salutation readable
     * either way ("Good afternoon, there").
     */
    userFirstName: deriveFirstName(user),
    handleRemoveRecent,
    handleRemoveBookmark,
    user: user ? user : null,
    handleOpenMedia,
    handleItemPress,
    handlePlaylistPress,
    handleTogglePin,
    handleSeeAll,
    handleSearchPress,
    handleAvatarPress,
    handleBookmarksSeeAll,
  };
}
