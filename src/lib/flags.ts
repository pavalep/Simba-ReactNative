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
 * Flip a flag to `true` once its dependent phases have been verified
 * end-to-end on a physical device. Today all V12 flags are `false`
 * (the inline-mount behaviour from V11 is preserved).
 */

/**
 * V12 Phase 5: launch `PlayerActivity` (the dedicated module
 * activity) when the user taps a video/audio file. When `false`, the
 * V11 behaviour is preserved: the player mounts inside
 * `MainActivity`'s React tree via the `PlaybackContext` state.
 *
 * Phase 5 wires the JS chokepoint (`PlaybackContext.openPlayer`) to
 * call `MpvPlayer.openPlayer(...)` behind this flag; Phase 11+ will
 * add the React-side wiring inside `PlayerActivity` so the launched
 * activity can actually drive playback (currently it just logs the
 * launch extras).
 */
export const USE_DEDICATED_PLAYER_ACTIVITY = false;

/**
 * V12 Phase 22: expose a unified `MediaSession` from the bridge to
 * the OS notification shade + lock screen + Bluetooth headset
 * controls. When `false`, the V11 `MediaNotificationService`
 * foreground notification path is preserved.
 */
export const USE_UNIFIED_MEDIA_SESSION = false;