/**
 * V17 Phase 77 cleanup: the `recordPlaybackCheckpoint` bridge
 * function (which wrapped the redux `addRecent` dispatch for
 * non-React callers) was unused by any consumer. Removed.
 *
 * The `recentHistory` feature's `addRecent` / `removeRecent` /
 * `clearRecent` exports remain the public write API; V17 Phase 82
 * migrates those to a zustand store and drops the `dispatch`
 * parameter.
 */
export {};
