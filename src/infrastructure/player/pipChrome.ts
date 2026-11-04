/**
 * The `nativeID` of the app's chrome root — the ONE owner of that string
 * in the whole app.
 *
 * ## Why there is a native id at all
 *
 * Picture-in-Picture has two entry paths, and they are not interchangeable.
 *
 *  - The **button** path runs in the foreground: React unmounts the chrome's
 *    controls, one animation frame goes by, and only then is the OS asked for
 *    the window. The order is the contract, and React is what makes it
 *    possible.
 *
 *  - The **HOME** path runs while the Activity is being backgrounded, and
 *    RN freezes TWO things with the Activity: Fabric stops applying mount
 *    items (so a React commit never reaches the native view tree), and the
 *    JS timer manager freezes (so `requestAnimationFrame` — a zero-delay
 *    timer on that registry — never fires). A React-driven entry cannot
 *    work there at all. It was measured on emulator-5554 (API 37) on
 *    2026-11-03: the leave hint reached JS immediately, the effect that
 *    would have driven the entry ran 5.7 s late, the
 *    `requestAnimationFrame` never fired, and no PiP window ever opened.
 *
 *    (The two freezes, in RN 0.86's own source:
 *    `ReactAndroid/src/main/java/com/facebook/react/fabric/
 *    FabricUIManager.java:1250-1253`, `:1567-1574`, `:1617-1624`;
 *    `ReactAndroid/src/main/java/com/facebook/react/modules/core/
 *    JavaTimerManager.kt:72-76`, `:290-293`;
 *    `ReactCommon/react/runtime/TimerManager.cpp:360-367`.)
 *
 * So the HOME path is **native**: the library hides the chrome by mutating
 * the host view's `visibility` (a View-system mutation, so it takes effect
 * without a React commit), enters PiP, and restores the chrome when PiP
 * ends.
 *
 * To find that host view the library needs to know which one it is. React
 * Native publishes the answer: a view's `nativeID` is stored on the native
 * view as `R.id.view_tag_native_id`, and
 * `com.facebook.react.uimanager.util.ReactFindViewUtil.findView(root, id)`
 * walks the native view tree looking for it.
 *
 * ## Why the string lives here and not in the library
 *
 * The chrome is the **app's** view. The library ships no chrome of its own
 * and must not invent an id for someone else's view — so it reads whatever
 * id the app tells it through `pip.chromeNativeId`. The app therefore has
 * exactly one owner of the literal: this module. The `nativeID` prop below
 * and the `config.pip.chromeNativeId` in `App.tsx` both read it from here,
 * so the two ends cannot drift apart.
 */

/**
 * The `nativeID` the app puts on its chrome root, and the same string it
 * hands the library as `pip.chromeNativeId`.
 *
 * The root is mounted in BOTH presentations — it is the box the chrome is
 * drawn in, and the dock's loading spinner and its error card are drawn in
 * it too. The id's VALUE is the library's contract and does not change
 * with that.
 *
 * It must match EXACTLY: the library looks the view up by this tag, and a
 * mismatch is a chrome that cannot be hidden — which is a PiP window with
 * the app's dead control bar painted into it.
 */
export const PIP_CHROME_NATIVE_ID = 'simba-expanded-chrome';
