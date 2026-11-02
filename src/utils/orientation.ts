/**
 * Orientation locking utility.
 *
 * The app's portrait lock goes through the LIB's own command —
 * `commands.setOrientation('portrait')` — and not through a third-party
 * OS-control package. That is the standing rule for every system control
 * in this app (brightness, volume, PiP), and this helper used to be the one
 * exception: it imported `react-native-orientation-locker`, whose module body
 * constructs a `NativeEventEmitter` with no argument, so merely importing this
 * file THREW in jest. That made this module — and `AppContent`, its only call
 * site — untestable. Register item 68.
 *
 * ## Why the command is a PARAMETER and not an import
 *
 * `src/infrastructure/player/**` is the only directory allowed to import
 * `@simba-dev/react-native-media-player` (the PLAYER RULE in
 * `scripts/check-import-boundaries.js`), so this helper cannot reach for the
 * package itself. It takes the ONE command it needs as an argument, and
 * `AppContent` — which already reads the player facade — passes the lib's
 * `commands` in.
 *
 * The helper therefore stays a pure leaf module: no React, no native module,
 * no platform branch, and so importable in a test with nothing mocked at all.
 *
 * ## Why the timers are gone
 *
 * The old implementation delayed the iOS lock by 600 ms and re-asserted the
 * Android lock 200 ms later. Both were workarounds for `react-native-
 * orientation-locker` v1.7.0's OWN bugs — its GitHub issue #210 on iOS, and a
 * race with the configuration change under the new architecture on Android.
 * They guarded a package that is no longer here.
 *
 * The lib's command writes `Activity.requestedOrientation` on the UI thread
 * (`MpvBridgeModule.setOrientation` → `runOnUiThread`), which is strictly
 * better ordered than the locker's bridge-thread write, and `MainActivity.
 * onCreate` already pins the window natively before any JS runs.
 *
 * ## The platform note
 *
 * The lib is Android-only — `react-native.config.js` declares `ios: null` — so
 * this command is live exactly where the app ships. The old helper had an iOS
 * branch, and it was the only thing that pinned iOS to portrait. The app ships
 * no iOS build (iOS is not a release claim), and the whole engine is
 * Android-only, so that branch guarded a platform the app is not on.
 */

/**
 * The one command this helper needs.
 *
 * Declared structurally here rather than imported from the lib: the PLAYER RULE
 * keeps the package behind `src/infrastructure/player/`, and the lib's
 * `PlayerCommands['setOrientation']` has exactly this shape.
 */
export interface OrientationCommands {
  setOrientation: (mode: 'portrait' | 'landscape' | 'sensor') => void;
}

/**
 * Lock the window to portrait — the app's default state.
 *
 * This is the SAME call the player's own orientation lock makes (`useTransport`’s
 * `setOrientationLock`) and the same call the close path makes
 * (`useClosePlayback`), so the window has ONE writer instead of one per
 * mechanism.
 */
export function lockToPortrait(commands: OrientationCommands): void {
  commands.setOrientation('portrait');
}
