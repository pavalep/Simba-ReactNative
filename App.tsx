import React, {useMemo, useEffect, useRef} from 'react';
import {Linking, View, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {
  SimbaPlayer,
  SimbaPlayerRoot,
  useOpenFromUrl,
} from '@simba-dev/react-native-media-player';
import {useAuthStore, useBookmarksStore, useDownloadsStore, useRecentHistoryStore} from './src/state';
import {ThemeProvider, useTheme} from './src/theme';
import {RootNavigator} from './src/navigation';
import {navigationRef} from './src/navigation/navigationHelper';
import {linking} from './src/navigation/linking';
import {
  resolveResumeMs,
  PlayerHostProvider,
  useIsPlayerActivity,
  useQueueSync,
} from './src/infrastructure/player';
import {SimbaPlayer as V19SimbaPlayer} from './src/components/player/video/SimbaPlayer/SimbaPlayer';
import {ErrorBoundary} from './src/app/ErrorBoundary';
import {QueryProvider} from './src/app/QueryProvider';
import {SimbaStatusBar} from './src/components/StatusBar';
import {ToastProvider} from './src/components/feedback/Toast';
import {OfflineBanner} from './src/components/status/OfflineBanner/OfflineBanner';
import {GlobalOperationProgress} from './src/components/status/GlobalOperationProgress/GlobalOperationProgress';
import {lockToPortrait} from './src/utils/orientation';
import {useAuthSession} from './src/hooks/useAuthSession';
import {downloadService} from './src/services/downloadService';
import {mark} from './src/utils/startupPerf';
import {configureGoogleSignin} from './src/services/authService';

// Initialize GoogleSignin once at app startup — calling configure() every
// time on the sign-in path was breaking the post-revoke flow (the account
// picker was suppressed). One-shot init keeps the library in a known state.
configureGoogleSignin();

/**
 * 56.6: wait until the auth restore has settled (isRestoring flips false) so a
 * cold-start deep link is only honored for an authenticated session.
 * Bails out after the timeout to never block app launch.
 */
function waitForAuthSettle(timeoutMs = 10000): Promise<void> {
  return new Promise(resolve => {
    // V17 Phase 78: auth.isRestoring moved to `useAuthStore`. The
    // subscription API is the same shape as zustand's `subscribe`
    // (called on every state change, returns an unsubscribe fn).
    if (!useAuthStore.getState().isRestoring) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsubscribe();
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const unsubscribe = useAuthStore.subscribe(() => {
      if (!useAuthStore.getState().isRestoring) finish();
    });
  });
}

const AppContent: React.FC = () => {
  const {colors} = useTheme();
  // V14 Phase 60: `useOpenFromUrl` replaces V13's hand-rolled
  // `handleIncomingUri` (URI-scheme filter + basename → title + file
  // extension → type, then `openPlayer({...})`). The hook absorbs
  // all of that; the consumer just wires `Linking.addEventListener`
  // to the returned function.
  const openFromUrl = useOpenFromUrl();

  // V14 Phase 59: the activity-launch branch (rendering <PlayerRoot />
  // when the activity was launched with playback params) is now owned
  // by <SimbaPlayerRoot> below. The 12-line `if (launchParams) ...`
  // branch in V13's App.tsx is gone — `<SimbaPlayerRoot>` calls
  // `useLaunchParams()` internally and switches between the two.

  // 43.1/43.2: cold-start silent restore + foreground session expiry
  useAuthSession();

  // V19 W0 Phase 0.1: useQueueSync middleware. Wires the lib's native
  // queue ↔ usePlayerStore. Mounted once at the app shell (W4+
  // migration: this lives inside the V19 SimbaPlayer once V19
  // replaces the V16 root). Source of truth:
  // md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md §3.C + §5.
  useQueueSync();

  // 49.1: hydrate downloads once at boot — the service owns the manifest, the
  // store mirrors it so badges/buttons/Downloads screen render instantly.
  useEffect(() => {
    downloadService.ensureLoaded().then(records => {
      useDownloadsStore.getState().hydrateDownloads(records);
    });
  }, []);

  // V17 Phase 85: redux-persist is gone. Zustand persist hydrates each
  // store synchronously at module-load (the AsyncStorage read happens
  // lazily but the default state is available immediately, so the
  // first render is consistent). We mark 'rehydrated' on the first
  // paint so the cold-start timing chain stays meaningful.
  useEffect(() => {
    mark('rehydrated');
  }, []);

  // P64: removed navigation-state persistence. The auth gate in
  // RootNavigator (Splash → Login → Home based on hasLaunched and
  // isAuthenticated) is now the single source of truth for where the
  // user lands on cold start. Persisting the last screen broke that
  // contract — a signed-in user could re-open the app on a stale
  // detail page from before they signed out, and vice versa. Every
  // cold start now resolves fresh from auth state.

  // V21 / W3 P12 / D-009: the cold-start hook is the SINGLE source
  // of truth for `Linking.getInitialURL()` (it dispatches via the
  // V14 `useOpenFromUrl` hook, which already handles the
  // content:// / file:// bypass + the simbaplayer:// auth-gating +
  // the basename-derivation + the extension-classification).
  //
  // Before P12: the React Navigation `linking.getInitialURL` below
  // ALSO called `Linking.getInitialURL()` and re-implemented the
  // auth-gating. The two paths fired on every cold-start, so the
  // user saw the shared file twice (D-009).
  //
  // P12 fix: the Promise returned by `Linking.getInitialURL()` is
  // created ONCE (synchronously, in the render body) and shared
  // between the React Navigation config (it just returns the
  // Promise) and the cold-start hook (it awaits the Promise and
  // dispatches via `useOpenFromUrl`). The Promise's resolution
  // value is used both for routing (React Navigation) and for
  // playback (`useOpenFromUrl`).
  const deepLinkPromiseRef = useRef<Promise<string | null> | null>(null);
  if (deepLinkPromiseRef.current === null) {
    deepLinkPromiseRef.current = Linking.getInitialURL();
  }
  const linkingConfig = useMemo(
    () => ({
      ...linking,
      getInitialURL: () => deepLinkPromiseRef.current!,
    }),
    [],
  );

  // ── Deep linking: handle incoming content:// URIs ──
  useEffect(() => {
    // Lock to portrait globally (PlayerScreen toggles to landscape on demand)
    lockToPortrait();
  }, []);

  useEffect(() => {
    // V14 Phase 60: the URI-scheme filter, basename-derivation, and
    // extension-classification are all inside `useOpenFromUrl`. The
    // consumer owns only the `Linking` plumbing (cold-start + warm
    // listener).
    deepLinkPromiseRef.current!.then(url => {
      if (url) void openFromUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({url}) => {
      void openFromUrl(url);
    });
    return () => subscription.remove();
  }, [openFromUrl]);

  // V14 Phase 59: `<SimbaPlayerRoot>` owns the activity-launch branch
  // (renders `<PlayerRoot />` when launchParams is set, otherwise
  // children).
  //
  // W6.0 fix: it is NOT rendered here. It lives in `ActivityShell`,
  // ABOVE the `isPlayerActivity` split, because it is the single
  // owner of the lib's one-shot `useLaunchParams()` queue and the only
  // component that calls `loadFile` / binds the native surface in
  // `PlayerActivity`. Rendering it only in MainActivity left the
  // player activity blank. Only navigation + screens belong below the
  // split.
  return (
    <>
      <SimbaStatusBar variant="home" />
      <View style={styles.root}>
        <NavigationContainer
          ref={navigationRef}
          linking={linkingConfig}>
          <RootNavigator />
          {/* V13: V11 <PlaybackOverlayHost /> removed in Phase 54.
              The module's player surface is rendered by PlayerRoot
              via <SimbaPlayerRoot> in the activity branch. The
              MainActivity no longer needs an inline player overlay. */}
        </NavigationContainer>
        {/* 54.1: global offline banner overlays every screen */}
        <OfflineBanner />
        {/* 54.5: global long-operation progress (media scan) */}
        <GlobalOperationProgress />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

/**
 * W6.0 fix — the app-wide providers that must survive the activity
 * split, plus the split itself.
 *
 * This is its own component (rather than inline in `App`) for one
 * concrete reason: it needs `useTheme()` to build the ErrorBoundary's
 * fallback palette, and `App` is the component that RENDERS
 * `ThemeProvider` — so `App` cannot read the theme context. A child
 * of `ThemeProvider` can.
 *
 * ## The three layers, and why the split sits where it does
 *
 *   1. **App-wide providers** (`ErrorBoundary`, `ToastProvider`) —
 *      ABOVE everything. Each Android activity hosts its own React
 *      root, and each root gets its own context tree, so a provider
 *      mounted below the split simply does not exist in
 *      `PlayerActivity`. `useToast()` THROWS without its provider and
 *      is called unconditionally by `VideoMoreSheet` inside the player
 *      chrome; that throw tore down the whole compositor and left a
 *      blank black screen with no controls, no topbar, nothing.
 *
 *   2. **The launch branch** (`SimbaPlayerRoot`) — the ONE thing that
 *      must be mounted in BOTH activities. It is the single owner of
 *      the lib's one-shot `useLaunchParams()` queue, and it renders
 *      `<PlayerRoot>` (which calls `loadFile` and binds the native
 *      `MpvRenderView` surface) whenever the activity was launched
 *      with playback params. W6.0 originally hid it along with
 *      `AppContent`, so in `PlayerActivity` nothing ever called
 *      `loadFile` — the activity came up, the session was created, and
 *      the screen stayed black.
 *
 *   3. **Navigation and screens** (`NavigationContainer`,
 *      `RootNavigator`) — BELOW the split. These must not render in
 *      `PlayerActivity`: `AppContent` paints an opaque screen
 *      background, which would cover the native `MpvRenderView` that
 *      sits beneath the React root along with the chrome on top of it.
 *
 * The V19 chrome sits OUTSIDE `SimbaPlayerRoot` on purpose:
 * `SimbaPlayerRoot` returns `<PlayerRoot>` *instead of* its children
 * when launch params exist, so a chrome rendered as a child would be
 * discarded exactly when the player is active. As a sibling it is
 * always mounted and self-gates on `useIsPlayerActivity()`.
 */
const ActivityShell: React.FC<{resumePolicy: (id: string) => number | undefined}> = ({
  resumePolicy,
}) => {
  const {colors} = useTheme();
  const isPlayerActivity = useIsPlayerActivity();

  const fallbackColors = useMemo(
    () => ({
      background: colors.background.primary,
      text: colors.text.primary,
      textSecondary: colors.text.secondary,
      accent: colors.accent.gold,
      border: colors.border.emphasis,
      accentDim: colors.accent.goldDim,
    }),
    [colors],
  );

  return (
    <ErrorBoundary fallbackColors={fallbackColors}>
      <ToastProvider>
        {/* (1) V19 chrome — always mounted, self-gates on
            useIsPlayerActivity(). Sibling of SimbaPlayerRoot, never a
            child: see the docstring. */}
        <V19SimbaPlayer />
        {/* W7.6 — `<VideoMiniPlayer />` used to be mounted here. It was a
            W0 stub whose whole body was `return null`, so it rendered
            nothing at all: a live import and a live element in the tree
            that could never draw. Worse than dead weight — a reader
            (and a grep for "which chrome composites are mounted at the
            shell?") found it and concluded the mini dock existed.

            W6.0 already removed the dock itself, because playback lives
            in its own activity and there is nothing for a mini player
            to minimise to. The stub outlived that decision. Removed. */}
        {/* (2) The launch branch — owns the one-shot launch-params
            queue and renders <PlayerRoot> in PlayerActivity.

            `headless` (lib 1.8.0) splits that component's two jobs.
            Without it, <SimbaPlayerRoot> returns <PlayerRoot> INSTEAD
            of its children whenever launch params exist, so the
            module's default UI ("Simba Player", ✕, yellow play) took
            over the screen and the V19 chrome — mounted above, but
            painted underneath — was never seen. With `headless` the
            module keeps the load lifecycle (`useLaunchPlayback`, so
            the payload is still loaded exactly once) and the V19 chrome
            is the player UI. Children render unconditionally; the split
            below keeps the navigator out of the player activity. */}
        <SimbaPlayerRoot headless>
          {/* (3) Navigation + screens — MainActivity only. */}
          {isPlayerActivity ? null : <AppContent />}
        </SimbaPlayerRoot>
      </ToastProvider>
    </ErrorBoundary>
  );
};

/**
 * The props React Native hands the root component. `initialProps`
 * comes from the hosting activity's
 * `ReactActivityDelegate.getLaunchOptions()`.
 *
 * `isPlayerActivity` is the ONLY piece of app state that has to be
 * per-activity rather than per-process, and it arrives here precisely
 * because it cannot be derived in JS: the app and the player run the
 * same `App` component, and the native flag behind
 * `isCurrentActivityPlayer()` is process-wide (see
 * `src/infrastructure/player/playerHost.tsx`).
 *
 * Defaults to `false` — "no player surface here" — which is the safe
 * direction: chrome mounted over a surface that is not there is worse
 * than a video without controls.
 */
export interface RootProps {
  isPlayerActivity?: boolean;
}

const App: React.FC<RootProps> = ({isPlayerActivity = false}) => {
  // V16 Phase 71 + W22 F/U #2: bookmark-aware resume lookup is a
  // single `resumePolicy` function prop on `<SimbaPlayer>`. Replaces
  // the V13 `lookup` object prop + V14 `useSimbaPlayerLookup`
  // factory hook pair (31 lines collapsed to 6).
  //
  // **W22 F/U #2 priority** (bookmark first, history fallback):
  //   1. Bookmarks — the explicit user signal. Multiple positions
  //      can exist per URI (A14: each id encodes `(fileUri, position)`),
  //      so we take the most recently created. `resolveResumeMs`
  //      handles the latest-wins reduction.
  //   2. History — the implicit recent-play signal. 1 entry per
  //      fileUri (upsert on every play), so `find` is sufficient.
  //   3. `undefined` if neither — `useOpenWithResume` falls back to
  //      the consumer-provided `startPositionMs` (or 0).
  //
  // Both stores persist `position` in seconds; the module expects
  // ms. The conversion + the priority + the defensive `> 0` check
  // are all in the pure helper `resolveResumeMs` (10 unit tests
  // cover the branches — see `__tests__/infrastructure/player/resumePolicy.test.ts`).
  //
  // The function is `useCallback`-ed so the `<SimbaPlayer>` memo
  // (line 102 of the module's SimbaPlayer.tsx) doesn't churn the
  // inner `<PlayerResumeContext>` value on every render.
  const resumePolicy = React.useCallback((resumeId: string) => {
    const bookmarks = useBookmarksStore.getState().items;
    const history = useRecentHistoryStore.getState().entries;
    return resolveResumeMs({bookmarks, history}, resumeId);
  }, []);

  // V19 W6.0 — the presentation mode is DERIVED, not synced.
  //
  // This call used to be `usePresentationSync()`: an effect that
  // wrote `isPlayerActivity ? 'expanded' : 'mini'` into a shared
  // zustand store. It had to be removed rather than moved, because
  // `App` is mounted ONCE PER ACTIVITY REACT ROOT — so while the
  // player was up, the background `MainActivity` tree and the
  // foreground `PlayerActivity` tree both ran this effect against the
  // same process-global store. Each write re-triggered the other
  // root's effect (the mode was a dependency) and they fought:
  // `expanded → mini → expanded → mini`, forever. The chrome gate
  // returns `null` in `'mini'`, so the whole compositor was torn down
  // and rebuilt several times a second over a playing video.
  //
  // `usePresentation()` now computes the mode at read time from
  // `useIsPlayerActivity()` — a question each tree asks about ITSELF
  // — plus the PiP flow flag. With no writer, there is no race. See
  // `src/state/usePresentationStore.ts`.

  return (
    // W6.0 — the per-tree player-host fact goes in FIRST, above every
    // provider, because `PlayerHostProvider` must wrap anything that
    // asks "is there a player surface under me?". The value comes from
    // this root's `initialProps`, which each activity supplies in its
    // `ReactActivityDelegate.getLaunchOptions()` — per ROOT, so the
    // background `MainActivity` tree can never read the player
    // activity's `true`. See `src/infrastructure/player/playerHost.tsx`.
    <PlayerHostProvider isPlayerActivity={isPlayerActivity}>
      {/* GestureHandlerRootView is required by
          @lodev09/react-native-true-sheet (its drag-to-dismiss
          gesture uses the gesture-handler runtime) and by any nested
          navigation gesture support. */}
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          {/* V18.1.2: QueryProvider wraps the data layer. Placed
              inside SafeAreaProvider (consistent with other global
              providers) and outside ThemeProvider (data layer is
              a sibling of UI; no dependency on theme). */}
          <QueryProvider>
          <ThemeProvider>
            {/* V16: one wrapper, one prop. Replaces the V13
                `<PlayerProvider>` + `<PlayerResumeProvider>` pair
                and the V14 `<SimbaPlayer lookup={...}>` shape with
                a single `<SimbaPlayer resumePolicy={...}>`.

                V19 W4: V19 SimbaPlayer (chrome compositor) lives as a
                sibling of AppContent INSIDE the V16 SimbaPlayer. The V19
                chrome overlay reads lib hooks (usePlayer) so it
                must be a child of the V16 SimbaPlayer; it is
                rendered FIRST so it stacks ABOVE AppContent in
                z-order (later siblings render on top in RN).
                Audit §5: SimbaPlayer (V19) is the ONLY chrome
                composite mounted at the shell — all other chrome
                primitives (VideoSurface, VerticalSwipeGestures,
                ChromeAutoHideController, NextUpOverlay, TransportBar)
                live INSIDE it and never in src/screens. W7.6 removed
                the second one: `VideoMiniPlayer`, a `return null` stub
                (see the note at its former render site). */}
            <SimbaPlayer resumePolicy={resumePolicy}>
              {/* W6.0 fix — `ActivityShell` owns the app-wide providers
                  (ErrorBoundary + ToastProvider) AND the activity split,
                  so both branches have the providers they need. See its
                  docstring for why the split must sit below them. */}
              <ActivityShell resumePolicy={resumePolicy} />
            </SimbaPlayer>
          </ThemeProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </PlayerHostProvider>
  );
};

export default App;
