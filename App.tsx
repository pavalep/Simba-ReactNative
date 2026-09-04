import React, {useMemo, useEffect, useCallback} from 'react';
import {Provider} from 'react-redux';
import {Linking, View, StyleSheet} from 'react-native';
import {PersistGate} from 'redux-persist/integration/react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {
  SimbaPlayer,
  SimbaPlayerRoot,
  useOpenWithResume,
  type PlayerResumeLookup,
} from '@simba-dev/react-native-media-player';
import {store, persistor} from './src/store';
import {ThemeProvider, useTheme} from './src/theme';
import {RootNavigator} from './src/navigation';
import {navigationRef} from './src/navigation/navigationHelper';
import {linking} from './src/navigation/linking';
import {ErrorBoundary} from './src/app/ErrorBoundary';
import {SimbaStatusBar} from './src/components/StatusBar';
import {ToastProvider} from './src/components/feedback/Toast';
import {OfflineBanner} from './src/components/status/OfflineBanner/OfflineBanner';
import {GlobalOperationProgress} from './src/components/status/GlobalOperationProgress/GlobalOperationProgress';
import {lockToPortrait} from './src/utils/orientation';
import {useAuthSession} from './src/hooks/useAuthSession';
import {downloadService} from './src/services/downloadService';
import {hydrateDownloads} from './src/store/slices/downloadsSlice';
import {mark} from './src/utils/startupPerf';
import {configureGoogleSignin} from './src/services/authService';
import {getMediaType} from './src/services/fileService';

// Initialize GoogleSignin once at app startup — calling configure() every
// time on the sign-in path was breaking the post-revoke flow (the account
// picker was suppressed). One-shot init keeps the library in a known state.
configureGoogleSignin();

/**
 * Parse a shared content URI and navigate to the Player screen.
 * Accepts both content:// URIs from Share Sheet and file:// URIs.
 *
 * V13: uses the module's `useOpenWithResume().openPlayer` so the
 * call is type-safe + benefits from any future bookmark-aware
 * resumeId lookup. The deep-link URI is not in the consumer's
 * bookmark slice, so the resumeId lookup returns 0 — playback
 * starts from the start of the shared file.
 */
type OpenWithResume = ReturnType<typeof useOpenWithResume>;
function handleIncomingUri(uri: string, openPlayer: OpenWithResume) {
  if (!uri || !navigationRef.isReady()) return;
  // Only handle video/audio content URIs
  if (!uri.startsWith('content://') && !uri.startsWith('file://')) return;

  const fileName = uri.split('/').pop() ?? 'Shared File';
  const displayName = decodeURIComponent(fileName.replace(/\.[^.]+$/, ''));

  const mediaType = getMediaType(uri);
  void openPlayer({
    uri,
    title: displayName,
    type: mediaType,
  });
}

/**
 * 56.6: wait until the auth restore has settled (isRestoring flips false) so a
 * cold-start deep link is only honored for an authenticated session.
 * Bails out after the timeout to never block app launch.
 */
function waitForAuthSettle(timeoutMs = 10000): Promise<void> {
  return new Promise(resolve => {
    if (!store.getState().auth.isRestoring) {
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
    const unsubscribe = store.subscribe(() => {
      if (!store.getState().auth.isRestoring) finish();
    });
  });
}

const AppContent: React.FC = () => {
  const {colors} = useTheme();
  const openPlayer = useOpenWithResume();

  // V14 Phase 59: the activity-launch branch (rendering <PlayerRoot />
  // when the activity was launched with playback params) is now owned
  // by <SimbaPlayerRoot> below. The 12-line `if (launchParams) ...`
  // branch in V13's App.tsx is gone — `<SimbaPlayerRoot>` calls
  // `useLaunchParams()` internally and switches between the two.

  // 43.1/43.2: cold-start silent restore + foreground session expiry
  useAuthSession();

  // 49.1: hydrate downloads once at boot — the service owns the manifest, the
  // slice mirrors it so badges/buttons/Downloads screen render instantly.
  useEffect(() => {
    downloadService.ensureLoaded().then(records => {
      store.dispatch(hydrateDownloads(records));
    });
  }, []);

  // P64: removed navigation-state persistence. The auth gate in
  // RootNavigator (Splash → Login → Home based on hasLaunched and
  // isAuthenticated) is now the single source of truth for where the
  // user lands on cold start. Persisting the last screen broke that
  // contract — a signed-in user could re-open the app on a stale
  // detail page from before they signed out, and vice versa. Every
  // cold start now resolves fresh from auth state.

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

  // 56.6: auth-gated deep links — content:// / file:// shared-file URIs bypass
  // the gate (handled by handleIncomingUri), simbaplayer:// links wait for the
  // session restore so they never land on a logged-out app.
  const linkingConfig = useMemo(
    () => ({
      ...linking,
      getInitialURL: async () => {
        const url = await Linking.getInitialURL();
        if (!url) return url;
        const isAppLink =
          url.startsWith('simbaplayer://') ||
          url.startsWith('https://simbaplayer.app');
        if (!isAppLink) return url;
        await waitForAuthSettle();
        return store.getState().auth.isAuthenticated ? url : null;
      },
    }),
    [],
  );

  // ── Deep linking: handle incoming content:// URIs ──
  const handleUrl = useCallback((event: {url: string}) => {
    handleIncomingUri(event.url, openPlayer);
  }, [openPlayer]);

  useEffect(() => {
    // Lock to portrait globally (PlayerScreen toggles to landscape on demand)
    lockToPortrait();
  }, []);

  useEffect(() => {
    // Check for initial URL on cold start
    Linking.getInitialURL().then(url => {
      if (url) handleIncomingUri(url, openPlayer);
    });

    // Listen for incoming URLs while app is running
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, [handleUrl]);

  // V14 Phase 59: <SimbaPlayerRoot> owns the activity-launch branch
  // (renders <PlayerRoot /> when launchParams is set, otherwise
  // children). The ErrorBoundary wraps both branches.
  return (
    <ErrorBoundary fallbackColors={fallbackColors}>
      <SimbaPlayerRoot>
        <ToastProvider>
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
        </ToastProvider>
      </SimbaPlayerRoot>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const onRehydrated = () => {
  // 59.3: redux-persist rehydration complete — cold-start gate until here
  mark('rehydrated');
};

const App: React.FC = () => {
  // V13: bookmark-aware resume lookup. The module's
  // `useOpenWithResume` hook calls this when a screen passes
  // `resumeId` to `openPlayer({...})`. The lookup reads the most
  // recent bookmark for the given file URI and returns its
  // position in milliseconds (the module converts from the
  // bookmark's seconds for us).
  //
  // Why a useMemo: the lookup is read by every call to
  // `useOpenWithResume`, and React would otherwise create a new
  // closure on every render. Memoising keeps the lookup
  // reference stable, which downstream `useCallback`s depend on.
  const resumeLookup = useMemo<PlayerResumeLookup>(
    () => ({
      getResumePosition: (resumeId: string) => {
        const items = store.getState().bookmark.items;
        // Find all bookmarks for this URI. Bookmarks are
        // `(fileUri, position)`-hashed so multiple positions
        // can exist per URI; we take the most recently created.
        const matches = items.filter(b => b.fileUri === resumeId);
        if (matches.length === 0) return undefined;
        const latest = matches.reduce((acc, b) =>
          acc.createdAt > b.createdAt ? acc : b,
        );
        // Bookmark.position is seconds; the module expects ms.
        const ms = Math.round(latest.position * 1000);
        return Number.isFinite(ms) && ms > 0 ? ms : undefined;
      },
    }),
    [],
  );

  return (
    // GestureHandlerRootView is required by @lodev09/react-native-true-sheet
    // (its drag-to-dismiss gesture uses the gesture-handler runtime) and by
    // any nested navigation gesture support.
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor} onBeforeLift={onRehydrated}>
            <ThemeProvider>
              {/* V13: one wrapper replaces V11's <PlaybackProvider>.
                  Composes the config context + resume-lookup context
                  for any descendant that calls `usePlayerActivity` or
                  `useOpenWithResume`. */}
              <SimbaPlayer lookup={resumeLookup}>
                <AppContent />
              </SimbaPlayer>
            </ThemeProvider>
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
