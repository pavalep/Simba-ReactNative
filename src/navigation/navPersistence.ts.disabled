import AsyncStorage from '@react-native-async-storage/async-storage';
import type {InitialState} from '@react-navigation/native';

/**
 * 57.6: navigation state persistence across process death.
 * Serialized state is restored as `initialState` on cold start and rewritten
 * on every navigation change. Restore is sanitized so that a route removed in
 * a future release (or an ephemeral player screen) can never crash the
 * container or resume playback unintentionally.
 */

const NAV_STATE_KEY = 'simba-nav-state-v1';

// Root routes safe to restore. Player/transient screens (VideoPlayer,
// AudioPlayer, NowPlaying, SongScreen) are excluded: they carry live playback
// params and would auto-load media on relaunch. Splash/Login are gated by
// auth state, so they are excluded too — the container falls back to its
// initialRoute and the auth flow decides where the user lands.
const RESTORABLE_ROUTES = new Set([
  'MainTabs',
  'Settings',
  'Bookmarks',
  'Profile',
  'History',
  'Stats',
  'ArtistScreen',
  'AlbumScreen',
  'GenreScreen',
  // 48.1: queue is pure state (no playback params) — safe to restore
  'Queue',
  // 49.7: downloads is pure state (no playback params)
  'Downloads',
  'AllVideosScreen',
  'AllAudioScreen',
  'AllPlaylistsScreen',
  'MoviesScreen',
  'Search',
  'FolderBrowser',
  'PlaylistDetail',
  'ArtistDetail',
  'AlbumDetail',
  'PodcastsScreen',
  'PodcastDetail',
  'MusicScreen',
  'MusicDetail',
  'MovieDetail',
  // 58.7: P56/57 detail & browse screens are pure state — safe to restore
  'AudiobooksScreen',
  'AudiobookDetail',
  'ArchiveScreen',
  'ArchiveItemDetail',
  'RadioScreen',
  'LiveTVScreen',
  'ShowsScreen',
  'ShowDetail',
]);

type NavStateLike = {
  routes?: Array<{name: string; state?: NavStateLike} & Record<string, unknown>>;
  index?: number;
  [key: string]: unknown;
};

function sanitize(state: NavStateLike | null | undefined): NavStateLike | null {
  if (!state || !Array.isArray(state.routes) || state.routes.length === 0) {
    return null;
  }
  const routes = [];
  for (const route of state.routes) {
    if (!RESTORABLE_ROUTES.has(route.name)) continue;
    // Drop nested state (tab indexes/positions): restoring it risks pointing
    // at a screen that no longer exists. The container lands on defaults.
    routes.push({...route, state: undefined});
  }
  if (routes.length === 0) return null;
  return {
    ...state,
    routes,
    index: Math.min(state.index ?? 0, routes.length - 1),
  };
}

/** Load and sanitize the last persisted navigation state (null when none). */
export async function loadNavState(): Promise<InitialState | null> {
  try {
    const raw = await AsyncStorage.getItem(NAV_STATE_KEY);
    if (!raw) return null;
    return sanitize(JSON.parse(raw) as NavStateLike) as unknown as InitialState;
  } catch {
    return null;
  }
}

/** Persist the current navigation state (best-effort, failures ignored). */
export async function saveNavState(state: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
  } catch {
    // Persistence is best-effort; never let storage errors break navigation.
  }
}
