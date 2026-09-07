/**
 * V17 Phase 77: re-exports for the consumer's new Zustand state
 * layer. One-import convenience (mirrors the module's
 * `src/index.ts`).
 *
 * Pattern: each store exports a `useFooStore(selector?)` hook + the
 * action types. Consumers import the hook + the action types from
 * here:
 *
 *   import {useSessionStore} from '../state';
 *   const playCounts = useSessionStore(s => s.playCounts);
 *
 * For non-React write paths (services that already own a
 * store instance), use `useSessionStore.getState().recordPlaybackStats(...)`.
 */
export {
  useSessionStore,
  type MediaLibraryEntry,
  type SessionState,
  type SessionActions,
} from './sessionStore';
