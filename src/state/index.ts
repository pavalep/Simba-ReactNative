/**
 * V17 re-exports for the consumer's new Zustand state layer.
 * One-import convenience (mirrors the module's `src/index.ts`).
 *
 * Pattern: each store exports a `useFooStore(selector?)` hook + the
 * action types. Consumers import the hook + the action types from
 * here:
 *
 *   import {useAuthStore} from '../state';
 *   const user = useAuthStore(s => s.user);
 *
 * For non-React write paths (services that already own a
 * store instance), use `useAuthStore.getState().signOut()`.
 */
export {
  useSessionStore,
  type MediaLibraryEntry,
  type SessionState,
  type SessionActions,
} from './sessionStore';

export {
  useAuthStore,
  SESSION_TTL_MS,
  type AuthUser,
  type AuthErrorKind,
  type AuthState,
  type AuthActions,
} from './authStore';

export {
  useSettingsStore,
  type SettingsState,
  type SettingsActions,
} from './settingsStore';

export {
  useWeatherStore,
  type WeatherStatus,
  type WeatherStoreState,
  type WeatherStoreActions,
} from './weatherStore';

export {
  useLiveFavoritesStore,
  type LiveFavoriteItem,
  type LiveFavoritesState,
  type LiveFavoritesActions,
} from './liveFavoritesStore';

export {
  useFollowedPodcastsStore,
  type FollowedPodcast,
  type FollowedPodcastsState,
  type FollowedPodcastsActions,
} from './followedPodcastsStore';

export {RESET_APP_STATE, resetAppState} from './resetAction';
