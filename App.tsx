import React, {useMemo, useEffect, useCallback, useState} from 'react';
import {Provider} from 'react-redux';
import {Linking, View, StyleSheet} from 'react-native';
import {PersistGate} from 'redux-persist/integration/react';
import {NavigationContainer} from '@react-navigation/native';
import type {InitialState} from '@react-navigation/native';
import {store, persistor} from './src/store';
import {ThemeProvider, useTheme} from './src/theme';
import {RootNavigator} from './src/navigation';
import {navigationRef} from './src/navigation/navigationHelper';
import {linking} from './src/navigation/linking';
import {loadNavState, saveNavState} from './src/navigation/navPersistence';
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

/**
 * Parse a shared content URI and navigate to the Player screen.
 * Accepts both content:// URIs from Share Sheet and file:// URIs.
 */
function handleIncomingUri(uri: string) {
  if (!uri || !navigationRef.isReady()) return;
  // Only handle video/audio content URIs
  if (!uri.startsWith('content://') && !uri.startsWith('file://')) return;

  const fileName = uri.split('/').pop() ?? 'Shared File';
  const displayName = decodeURIComponent(fileName.replace(/\.[^.]+$/, ''));

  navigationRef.navigate('VideoPlayer', {
    fileUri: uri,
    fileTitle: displayName,
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

  // 43.1/43.2: cold-start silent restore + foreground session expiry
  useAuthSession();

  // 49.1: hydrate downloads once at boot — the service owns the manifest, the
  // slice mirrors it so badges/buttons/Downloads screen render instantly.
  useEffect(() => {
    downloadService.ensureLoaded().then(records => {
      store.dispatch(hydrateDownloads(records));
    });
  }, []);

  // 57.6: restore navigation state (sanitized) before mounting the container
  // so `initialState` is honored on first render; players/auth routes excluded.
  const [navStateReady, setNavStateReady] = useState(false);
  const [initialNavState, setInitialNavState] = useState<InitialState | undefined>(undefined);

  useEffect(() => {
    // 59.3: first React render of the app tree
    mark('app-mount');
    loadNavState().then(state => {
      setInitialNavState(state ?? undefined);
      setNavStateReady(true);
      mark('nav-ready');
    });
  }, []);

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
    handleIncomingUri(event.url);
  }, []);

  useEffect(() => {
    // Lock to portrait globally (PlayerScreen toggles to landscape on demand)
    lockToPortrait();
  }, []);

  useEffect(() => {
    // Check for initial URL on cold start
    Linking.getInitialURL().then(url => {
      if (url) handleIncomingUri(url);
    });

    // Listen for incoming URLs while app is running
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, [handleUrl]);

  return (
    <ErrorBoundary fallbackColors={fallbackColors}>
      <ToastProvider>
        <SimbaStatusBar variant="home" />
        <View style={styles.root}>
          {navStateReady && (
            <NavigationContainer
              ref={navigationRef}
              initialState={initialNavState}
              linking={linkingConfig}
              onStateChange={state => saveNavState(state)}>
              <RootNavigator />
            </NavigationContainer>
          )}
          {/* 54.1: global offline banner overlays every screen */}
          <OfflineBanner />
          {/* 54.5: global long-operation progress (media scan) */}
          <GlobalOperationProgress />
        </View>
      </ToastProvider>
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
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor} onBeforeLift={onRehydrated}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
