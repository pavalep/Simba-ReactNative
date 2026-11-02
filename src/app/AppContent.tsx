/**
 * The browsing UI: the navigator, the deep-link plumbing, and the boot
 * side effects that belong to the browsing tree.
 *
 * Split out of `App.tsx` so the root file can be what it should be — a
 * provider stack. This component owns:
 *
 *   - the navigator (`NavigationContainer` → `RootNavigator`),
 *   - deep links (cold start + warm `Linking` events),
 *   - the boot side effects (auth session, downloads hydrate, the
 *     rehydrated perf mark, the portrait lock),
 *   - the native queue mirror (`useQueueSync`).
 *
 * ## It must stay under `<SimbaPlayer>`
 *
 * `useDeepLinkLaunch()`, `useQueueSync()` and the navigator's screens (via
 * `useResumeAwareLaunch()`) all read the lib's React context. So the
 * navigator is not a sibling of the player — it is inside it. That is the
 * same shape as `GestureHandlerRootView` wrapping the whole app: a
 * provider that owns one process-wide resource.
 *
 * ## Why the deep-link Promise is created once
 *
 * `Linking.getInitialURL()` is called by BOTH React Navigation's
 * `linking.getInitialURL` and the cold-start handler below. Calling it
 * twice meant the shared file was opened twice (D-009), so the Promise is
 * created once, synchronously, in the render body, and both consumers
 * share it. Its resolution value is used for routing and for playback.
 */
import React, {useEffect, useMemo, useRef} from 'react';
import {Linking, View, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {useDownloadsStore} from '../state';
import {RootNavigator} from '../navigation';
import {navigationRef} from '../navigation/navigationHelper';
import {linking} from '../navigation/linking';
// The deep-link opener comes from the app's player layer, not from the
// package: the PLAYER RULE in `scripts/check-import-boundaries.js` keeps
// every `@simba-dev/react-native-media-player` import inside
// `src/infrastructure/player/`.
import {useDeepLinkLaunch, usePlayer, useQueueSync} from '../infrastructure/player';
import {useAuthSession} from '../hooks/useAuthSession';
import {downloadService} from '../services/downloadService';
import {mark} from '../utils/startupPerf';
import {lockToPortrait} from '../utils/orientation';
import {SimbaStatusBar} from '../components/StatusBar';
import {OfflineBanner} from '../components/status/OfflineBanner/OfflineBanner';
import {GlobalOperationProgress} from '../components/status/GlobalOperationProgress/GlobalOperationProgress';

export const AppContent: React.FC = () => {
  // The deep-link handler. The hook owns the URI-scheme filter, the
  // basename→title derivation and the extension→lane classification, and
  // launches through the app's own seam — so a shared video gets a
  // now-playing entry, a history checkpoint and a dock, like every other
  // launch. The consumer owns only the `Linking` plumbing.
  const openFromDeepLink = useDeepLinkLaunch();

  // Cold-start silent restore + foreground session expiry.
  useAuthSession();

  // Mirrors the lib's native queue into `usePlayerStore`. Mounted once.
  useQueueSync();

  // The lib's command object — the ONE writer of the window's
  // orientation. `useQueueSync` above already reads `usePlayer()`, so
  // this adds NO new subscription to the player's state context.
  //
  // The lib builds `commands` ONCE at module load and hands the same
  // reference to every `usePlayer()` call, so its identity is stable
  // and the boot-time lock below runs exactly once.
  const {commands} = usePlayer();

  // Hydrate downloads once at boot — the service owns the manifest, the
  // store mirrors it so badges/buttons/Downloads render instantly.
  useEffect(() => {
    downloadService.ensureLoaded().then(records => {
      useDownloadsStore.getState().hydrateDownloads(records);
    });
  }, []);

  // Redux-persist is gone. Zustand persist hydrates each store
  // synchronously at module-load, so the default state is available
  // immediately and the first render is consistent. Mark 'rehydrated' on
  // the first paint so the cold-start timing chain stays meaningful.
  useEffect(() => {
    mark('rehydrated');
  }, []);

  // Lock to portrait globally (PlayerScreen toggles to landscape on demand).
  //
  // Through the LIB's command, not a third-party OS-control package.
  // `src/utils/orientation.ts` used to import
  // `react-native-orientation-locker`, whose module body throws in jest —
  // which is why this file had no test at all (register item 68).
  //
  // The lib's `setOrientation('portrait')` maps to the SAME
  // `SCREEN_ORIENTATION_PORTRAIT` constant the locker set, and it is the
  // same call the player's own lock and the close path make — so the
  // window has ONE writer instead of one per mechanism.
  //
  // `commands` is a module singleton in the lib, so the dependency is
  // stable and this effect runs ONCE. It must not run per render: a
  // boot-time lock that re-asserts on every render is a second writer
  // of a value the player also owns.
  useEffect(() => {
    lockToPortrait(commands);
  }, [commands]);

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

  useEffect(() => {
    deepLinkPromiseRef.current!.then(url => {
      if (url) void openFromDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', ({url}) => {
      void openFromDeepLink(url);
    });
    return () => subscription.remove();
  }, [openFromDeepLink]);

  return (
    <>
      <SimbaStatusBar variant="home" />
      <View style={styles.root}>
        <NavigationContainer ref={navigationRef} linking={linkingConfig}>
          <RootNavigator />
        </NavigationContainer>
        <OfflineBanner />
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
