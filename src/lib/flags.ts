/**
 * Feature flags for the SIMBA Player V12 refactor.
 *
 * Each flag controls a single risky behavior change so it can be
 * rolled out (and rolled back) independently. The flags are
 * intentionally exported as plain `const` values rather than a single
 * runtime-configurable object — the values are evaluated at module
 * load and remain frozen for the lifetime of the JS bundle. A
 * future hardening pass (Phase 36) can replace this with a runtime
 * remote-config layer.
 *
 * **Phase 41 cutover (2026-09-03):** `USE_DEDICATED_PLAYER_ACTIVITY`
 * is now `true` (the V12 dedicated-activity path is the default).
 * `USE_UNIFIED_MEDIA_SESSION` stays `false` for now — the bridge
 * emits MediaSession metadata + transport but the consumer app's
 * `MediaNotificationService` still owns the foreground notification
 * path. That flag flips in a separate cutover (Phase 41.5 or later).
 *
 * **Rollback procedure:** if V12 misbehaves in production, set the
 * flag back to `false` and re-ship. The `if (USE_DEDICATED_PLAYER_ACTIVITY)`
 * branches are the only V12-specific call sites — flipping to
 * `false` restores the V11 inline-mount behaviour without rebuilding
 * native code. See [`SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md)
 * for the full rollback procedure.
 */

/**
 * V12 Phase 5 + Phase 41 cutover: launch `PlayerActivity` (the
 * dedicated module activity) when the user taps a video/audio file.
 * `true` since Phase 41 — V12 is the default path. Set to `false`
 * for emergency rollback (reverts to V11 inline-mount).
 */
export const USE_DEDICATED_PLAYER_ACTIVITY = true;

/**
 * V12 Phase 22: expose a unified `MediaSession` from the bridge to
 * the OS notification shade + lock screen + Bluetooth headset
 * controls. When `false`, the V11 `MediaNotificationService`
 * foreground notification path is preserved.
 *
 * Phase 41 cutover: stays `false` for now. The bridge emits
 * MediaSession metadata + transport (Phase 16+), but the consumer
 * app's `MediaNotificationService` still owns the notification.
 * Flipping this flag disables the V11 notification path entirely;
 * the V12 path uses `MediaPlaybackService` (declared in the
 * module's AndroidManifest) for the notification.
 *
 * Target cutover: Phase 41.5 (separate change so the foreground
 * service migration can be rolled back independently if it causes
 * background-process crashes).
 */
export const USE_UNIFIED_MEDIA_SESSION = false;