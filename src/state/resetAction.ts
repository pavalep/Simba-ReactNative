import {createAction} from '@reduxjs/toolkit';

/**
 * V17 Phase 78 shim: the `resetAppState` action used to be exported
 * from `authSlice`. When authSlice was deleted, the cross-store reset
 * action moved here so the non-auth reducers (bookmarks, playlists,
 * followedPodcasts, recentHistory, etc.) can still listen for it
 * via `extraReducers(builder.addCase(resetAppState, ...))`.
 *
 * Phase 85 will replace this with per-store `reset()` actions on
 * each new zustand store, dispatched directly from
 * `useAuth.signOut`'s orchestration. At that point this file
 * (and the `extraReducers` listeners in each feature reducer)
 * goes away.
 */
export const RESET_APP_STATE = 'app/RESET_APP_STATE';
export const resetAppState = createAction(RESET_APP_STATE);
