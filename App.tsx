/**
 * The app root.
 *
 * This file is a provider stack and nothing else. Everything that does
 * actual work lives in a named module beside it: `src/app/AppRoot.tsx`
 * (the content tree), `src/app/AppContent.tsx` (the browsing UI).
 *
 * The providers, outermost first:
 *
 *   `GestureHandlerRootView` — required by react-native-gesture-handler
 *       (its drag-to-dismiss gesture uses the gesture-handler runtime) and
 *       by any nested navigation gesture support.
 *   `SafeAreaProvider`        — insets for the whole tree.
 *   `QueryProvider`           — the data layer. A sibling of the UI, not
 *       a dependency of it, so it sits outside `ThemeProvider`.
 *   `ThemeProvider`           — the design tokens.
 *   `SimbaPlayer`             — the lib's player context. App-wide for
 *       the same reason `GestureHandlerRootView` is: the navigator's
 *       screens launch playback through it, so it has to be above the
 *       navigator.
 */
import React from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SimbaPlayer} from '@simba-dev/react-native-media-player';
import {useBookmarksStore, useRecentHistoryStore} from './src/state';
import {ThemeProvider} from './src/theme';
import {QueryProvider} from './src/app/QueryProvider';
import {AppRoot} from './src/app/AppRoot';
import {resolveResumeMs} from './src/infrastructure/player';
import {PIP_CHROME_NATIVE_ID} from './src/infrastructure/player/pipChrome';
import {configureGoogleSignin} from './src/services/authService';

// Initialize GoogleSignin once at app startup — calling configure() every
// time on the sign-in path was breaking the post-revoke flow (the account
// picker was suppressed). One-shot init keeps the library in a known state.
configureGoogleSignin();

/**
 * The resume lookup the lib calls when a launch carries a `resumeId` but
 * no explicit start position.
 *
 * The module cannot know how an app persists bookmarks and history —
 * Redux, SQLite, MMKV, AsyncStorage, a server — so the consumer provides
 * one small adapter, and the lib's `<PlayerResumeProvider>` hands it back
 * at `openPlayer` time. That is the whole reason this is a prop and not
 * something the lib resolves internally.
 *
 * **Priority** (bookmark first, history fallback):
 *
 *   1. Bookmarks — the explicit user signal. Multiple positions can
 *      exist per URI (each id encodes `(fileUri, position)`), so the most
 *      recently created one wins. `resolveResumeMs` does the reduction.
 *   2. History — the implicit recent-play signal. One entry per fileUri
 *      (upsert on every play), so `find` is sufficient.
 *   3. `undefined` if neither — the launch falls back to the
 *      consumer-provided `startPositionMs` (or 0).
 *
 * Both stores persist `position` in seconds; the bridge wants ms. The
 * conversion, the priority and the defensive `> 0` check all live in the
 * pure helper `resolveResumeMs` (see
 * `__tests__/infrastructure/player/resumePolicy.test.ts`).
 *
 * Module-level rather than a `useCallback`: it reads the stores through
 * `getState()` at CALL time, so it never needs to be re-created, and a
 * stable identity is what keeps the lib's memoized `PlayerResumeContext`
 * value from churning on every root render.
 */
const resumePolicy = (resumeId: string): number | undefined => {
  const bookmarks = useBookmarksStore.getState().items;
  const history = useRecentHistoryStore.getState().entries;
  return resolveResumeMs({bookmarks, history}, resumeId);
};

/**
 * The library's player configuration.
 *
 * Only the Picture-in-Picture section is set, and only one field of it:
 * `chromeNativeId` is the `nativeID` of the app's expanded chrome root.
 *
 * The HOME path's PiP entry is NATIVE, because an Activity in PiP is
 * "paused, but rendering" — and what stops is the REACT-TO-NATIVE
 * pipeline: Fabric stops applying mount items while the app is
 * backgrounded (so a React commit never reaches the native view tree),
 * and the JS timer manager freezes (so `requestAnimationFrame`, a
 * zero-delay timer on that registry, never fires). Measured on
 * emulator-5554 (API 37) on 2026-11-03: the entry effect ran 5.7 s late,
 * the animation frame never fired, and no PiP window opened.
 * The library hides the chrome with a native `visibility = GONE` and finds
 * the view through this id.
 *
 * `enabled` and `autoEnterOnLeave` are left at the library's defaults
 * (both true) — they are the library's policy defaults and the app agrees
 * with them, so spelling them out here would be a second owner for a fact
 * that already has one.
 *
 * The id string itself comes from the module that owns it, so the prop
 * here and the `nativeID` on the chrome root cannot drift apart.
 */
const playerConfig = {
  pip: {
    chromeNativeId: PIP_CHROME_NATIVE_ID,
  },
};

const App: React.FC = () => (
  <GestureHandlerRootView style={styles.root}>
    <SafeAreaProvider>
      <QueryProvider>
        <ThemeProvider>
          <SimbaPlayer resumePolicy={resumePolicy} config={playerConfig}>
            <AppRoot />
          </SimbaPlayer>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
