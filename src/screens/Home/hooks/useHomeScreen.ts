import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTheme} from '../../../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../../../store';
import {CommonActions} from '@react-navigation/native';
import {type HomeScreenProps} from '../../../navigation/types';
import type {RootStackParamList} from '../../../navigation/types';
import {pickMediaFile, getMediaType} from '../../../services/fileService';
import {
  selectWeightedFeatured,
  selectBookmarks,
} from '../../../store/slices/sessionSlice';
import {selectAllPlaylists} from '../../../store/slices/playlistSlice';
import {selectAllTracks} from '../../../store/slices/mediaSlice';
import {selectFollowedPodcasts} from '../../../store/slices/followedPodcastsSlice';
import type {FollowedPodcast} from '../../../store/slices/followedPodcastsSlice';
import type {SessionEntry} from '../../../store/slices/sessionSlice';
import {useAuth} from '../../../hooks/useAuth';
import {useWeather} from '../../../hooks/useWeather';
import type {WeatherCondition} from '../../../components/utility/WeatherIcon';
import type {WeatherSnapshot} from '../../../services/api/weatherService';

// ── Types ──

export type HomeSection =
  | {type: 'GREETING'}
  | {type: 'HERO'; data: SessionEntry | null}
  | {type: 'SUBSECTION_TITLE'; label: string; variant?: 'overline' | 'displaySans' | 'displaySerif'}
  | {type: 'SHELF'; title: string; items: any[]; seeAllRoute?: keyof RootStackParamList}
  | {type: 'GENRE'; genres: {name: string; count: number}[]}
  | {type: 'PLAYLISTS'; items: any[]}
  | {type: 'BOOKMARKS'; items: ReturnType<typeof selectBookmarks>}
  | {type: 'MOVIES'}
  | {type: 'FOLLOWED_PODCASTS'; items: FollowedPodcast[]}
  | {type: 'PREFILLED_PODCASTS'}
  | {type: 'PREFILLED_MUSIC'}
  // P36.7: live radio + TV browse shelves
  | {type: 'RADIO'}
  | {type: 'LIVE_TV'}
  // P37.7: audiobooks (LibriVox) + Internet Archive browse shelves
  | {type: 'AUDIOBOOKS'}
  | {type: 'ARCHIVE'}
  // P38.7: TV shows (TVMaze) browse shelf
  | {type: 'SHOWS'};

// ── Helpers ──

interface WeatherDetail {
  description: string;
  cityName: string;
  temperatureC: number;
}

interface GreetingInfo {
  text: string;
  /** Weather condition for the Lottie icon — driven by the live snapshot. */
  condition: WeatherCondition;
  /**
   * Structured weather detail for the right column of the card
   * (v9g: temperature + description/city, separated from the
   * greeting so nothing sits directly under the name). Null when
   * we don't yet have a snapshot — the card renders a loading
   * state in that column.
   */
  weather: WeatherDetail | null;
  /**
   * True only while the very first cold-start fetch is in flight AND
   * we have no cached snapshot to fall back on. P66: the card always
   * renders, and the right column becomes a "Fetching weather…"
   * placeholder when this is true.
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
  // P66: don't blank the weather during the first load — the card
  // handles the loading state itself with a "Fetching weather…"
  // placeholder. We still pass the snapshot's weather if we have
  // one (e.g. a persisted cache from a previous run) so the user
  // sees real data instead of "Fetching" while the fresh fetch
  // runs in the background.
  const weather = buildWeather(snapshot);
  return {text, condition, weather, isFirstLoad};
}

function isInProgress(item: SessionEntry): boolean {
  return item.position > 30 && item.position < item.duration - 5;
}

// P61: extract a first name for the greeting. The auth user carries
// `name` as a single string ("Paval EP", "Sundar Pichai"); we want
// just the first token. Falls back to "there" so the salutation
// stays grammatical when no user is signed in or the name is empty.
function deriveFirstName(authUser: {name?: string} | null | undefined): string {
  if (!authUser?.name) {return 'there';}
  const first = authUser.name.trim().split(/\s+/)[0] ?? '';
  return first.length > 0 ? first : 'there';
}

// ── Hook ──

export function useHomeScreen(navigation: HomeScreenProps['navigation']) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [isSettled, setIsSettled] = useState(false);
  const [hasError, setHasError] = useState(false);
  const dispatch = useAppDispatch();
  const {user} = useAuth();
  const {snapshot: weatherSnapshot, isFirstLoad: weatherFirstLoad} = useWeather();

  useEffect(() => {
    const t = setTimeout(() => setIsSettled(true), 300);
    return () => clearTimeout(t);
  }, []);

  // ── Data from Redux ──
  const recentFiles = useAppSelector(state => state.session.recentFiles);
  const bookmarks = useAppSelector(selectBookmarks);
  const weightedFeatured = useAppSelector(selectWeightedFeatured);
  const playlists = useAppSelector(selectAllPlaylists);
  const allTracks = useAppSelector(selectAllTracks);
  const followedPodcasts = useAppSelector(selectFollowedPodcasts);
  const isScanning = useAppSelector(s => s.media?.isScanning ?? false);

  // ── Derived Data ──
  const genres = useMemo(() => {
    const genreMap = new Map<string, number>();
    allTracks.forEach(t => {
      const g = t.genre?.trim();
      if (g && g !== 'Unknown Genre' && g !== '') {
        genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
      }
    });
    return Array.from(genreMap.entries())
      .map(([name, count]) => ({name, count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [allTracks]);

  // ── Navigation Handlers ──
  const handleOpenMedia = useCallback(async () => {
    try {
      const file = await pickMediaFile();
      if (!file) return;
      const mediaType = getMediaType(file.uri);
      const screen = mediaType === 'audio' ? 'AudioPlayer' : 'VideoPlayer';
      navigation.dispatch(CommonActions.navigate({name: screen, params: {fileUri: file.uri, fileTitle: file.title || 'Untitled'}}));
    } catch {}
  }, [navigation]);

  const handleItemPress = useCallback(
    (item: {mediaType?: string; fileUri: string; title: string; startPosition?: number; position?: number}) => {
      const screen = item.mediaType === 'audio' ? 'AudioPlayer' : 'VideoPlayer';
      navigation.dispatch(CommonActions.navigate({name: screen, params: {fileUri: item.fileUri, fileTitle: item.title, startPosition: item.startPosition ?? item.position}}));
    },
    [navigation],
  );

  const handlePlaylistPress = useCallback(
    (playlistId: string) => {
      navigation.dispatch(CommonActions.navigate({name: 'PlaylistDetail', params: {playlistId}}));
    },
    [navigation],
  );

  const handleGenrePress = useCallback(
    (genre: string) => {
      navigation.navigate('GenreScreen', {genre});
    },
    [navigation],
  );

  const handleSettingsPress = useCallback(
    () => navigation.navigate('Settings', {screen: 'Settings', params: undefined}),
    [navigation],
  );
  const handleSearchPress = useCallback(
    () => navigation.navigate('Search'),
    [navigation],
  );

  const handleSeeAll = useCallback(
    (routeName: keyof RootStackParamList) => {
      navigation.navigate(routeName as any);
    },
    [navigation],
  );

  const handleAvatarPress = useCallback(() => {
    // 42.1: avatar opens the Profile screen (stats, sign out, account)
    navigation.navigate('Profile');
  }, [navigation]);

  const handleBookmarksPress = useCallback(() => {
    navigation.navigate('Bookmarks');
  }, [navigation]);

  // P58: "See All" on the Bookmarks rail navigates to the same
  // Bookmarks screen. Kept as a separate hook return so the rail
  // can use it as `onSeeAll` without coupling to the avatar icon.
  const handleBookmarksSeeAll = handleBookmarksPress;

  // ── Compute Sections ──
  const sections = useMemo((): HomeSection[] => {
    const cw = weightedFeatured.find(isInProgress) ?? weightedFeatured[0] ?? null;

    const realSections: HomeSection[] = [
      {type: 'GREETING'},
      {type: 'HERO', data: cw},

      // P54 + P56: per-user "Your Library" group at the top, separated
      // from the API-backed discover shelves below by a centered rule
      // title. Order is now:
      //     1. Recently Played (always expanded)
      //     2. Bookmarks       (collapsible, auto-expanded when data)
      //     3. Followed Podcasts (collapsible, auto-expanded when data)
      // All three always render — empty-state hints cover the no-data
      // case so the group never disappears.
      // v9f: Cormorant Garamond Italic 18 px at 0.9 gold — readable
      // editorial accent, not a competing heading. v9 (full gold)
      // was attention-seeking; v9b (goldGlow 0.25) was invisible;
      // v9c (0.6) was close; v9d (0.7), v9e (0.8) needed more;
      // v9f (0.9) is approaching full but stays slightly soft.
      {type: 'SUBSECTION_TITLE', label: 'Your Library', variant: 'displaySerif'},
      {
        type: 'SHELF',
        title: 'Recently Played',
        items: recentFiles
          .filter(item => item.fileUri !== cw?.fileUri)
          .slice(0, 10),
        seeAllRoute: 'AllVideosScreen' as keyof RootStackParamList,
      },
      {type: 'BOOKMARKS', items: bookmarks},
      {type: 'FOLLOWED_PODCASTS', items: followedPodcasts},

      // Discover / API-backed rails — grouped under a "Discover" sub-
      // section title so the user can see at a glance which shelves are
      // curated content (above) vs. catalog browse (below). These are
      // not collapsible (per the P56 scope: only the three Your Library
      // rails get the chevron).
      // v9f: same treatment as "Your Library" — Cormorant Italic
      // 18 px at 0.9 gold so both parent-block titles share a
      // single visual voice.
      {type: 'SUBSECTION_TITLE', label: 'Discover', variant: 'displaySerif'},
      {type: 'MOVIES'},
      {type: 'PREFILLED_PODCASTS'},
      {type: 'PREFILLED_MUSIC'},
      // P36.7: live radio + TV browse shelves
      {type: 'RADIO'},
      {type: 'LIVE_TV'},
      // P37.7: audiobooks + Internet Archive browse shelves
      {type: 'AUDIOBOOKS'},
      {type: 'ARCHIVE'},
      // P38.7: TV shows (TVMaze) browse shelf
      {type: 'SHOWS'},
    ];

    // Genre chips
    if (genres.length > 0) {
      realSections.push({type: 'GENRE', genres});
    }

    const pinnedPlaylists = [...playlists]
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
      .slice(0, 3);

    realSections.push({type: 'PLAYLISTS', items: pinnedPlaylists});

    return realSections;
  }, [recentFiles, weightedFeatured, playlists, bookmarks, genres, followedPodcasts]);

  // ── Pull-to-refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>(resolve => setTimeout(resolve, 600));
    setRefreshing(false);
  }, []);

  return {
    colors,
    insets,
    refreshing,
    isSettled,
    hasError,
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
    dispatch,
    user: user ? user : null,
    genres,
    handleOpenMedia,
    handleItemPress,
    handlePlaylistPress,
    handleGenrePress,
    handleSeeAll,
    handleSettingsPress,
    handleSearchPress,
    handleAvatarPress,
    handleBookmarksPress,
    handleBookmarksSeeAll,
    onRefresh,
    setHasError,
  };
}
