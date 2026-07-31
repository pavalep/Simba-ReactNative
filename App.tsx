import React, {useMemo, useEffect, useCallback} from 'react';
import {Provider} from 'react-redux';
import {Linking, View, StyleSheet} from 'react-native';
import {PersistGate} from 'redux-persist/integration/react';
import {NavigationContainer} from '@react-navigation/native';
import {store, persistor} from './src/store';
import {ThemeProvider, useTheme} from './src/theme';
import {RootNavigator} from './src/navigation';
import {navigationRef} from './src/navigation/navigationHelper';
import {ErrorBoundary} from './src/app/ErrorBoundary';
import {SimbaStatusBar} from './src/components/StatusBar';
import {ToastProvider} from './src/components/feedback/Toast';
import {OfflineBanner} from './src/components/status/OfflineBanner/OfflineBanner';
import {GlobalOperationProgress} from './src/components/status/GlobalOperationProgress/GlobalOperationProgress';
import {lockToPortrait} from './src/utils/orientation';
import {useAuthSession} from './src/hooks/useAuthSession';

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

const AppContent: React.FC = () => {
  const {colors} = useTheme();

  // ── 43.1/43.2: cold-start silent restore + foreground session expiry ──
  useAuthSession();

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
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
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
  // redux-persist rehydration complete
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
