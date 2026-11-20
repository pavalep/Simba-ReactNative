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
import type {Theme} from '@react-navigation/native';
import {useDownloadsStore} from '../state';
import {RootNavigator} from '../navigation';
import {navigationRef} from '../navigation/navigationHelper';
import {linking} from '../navigation/linking';
import {useTheme} from '../theme';
import {FONT_FAMILY} from '../constants/fontFamily';
// The deep-link opener comes from the app's player layer, not from the
// package: the PLAYER RULE in `scripts/check-import-boundaries.js` keeps
// every `@simba-dev/react-native-media-player` import inside
// `src/infrastructure/player/`.
import {
  useDeepLinkLaunch,
  usePlayer,
  useQueuePersistence,
  useQueueSync,
} from '../infrastructure/player';
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

  // B15-Q3 — the explicit queue's DURABLE copy. The library's queue store
  // is in-memory, so a queue the user built was gone after a restart.
  // This hydrates the live queue from the mirror at boot and mirrors
  // every change back. Mounted once, here, beside `useQueueSync` — the
  // two are the two halves of the same fact: what plays next, and what
  // played next before the app was closed.
  useQueuePersistence();

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

  /**
   * The navigator's theme — the APP's own, not React Navigation's default.
   *
   * Without this prop, React Navigation falls back to its DEFAULT (light)
   * theme, and that theme's `card` background is what sits behind every
   * screen. A screen that paints its own background (the browse shell,
   * `ScreenContainer`) covered it; a screen that did not showed the
   * navigator's light card behind its own dark-theme text.
   *
   * MEASURED 2026-11-19 on emulator-5554: the Audiobook detail, the Show
   * detail and the Archive item detail all rendered a light cream page
   * with washed-out text while the app was in dark mode — their roots are
   * transparent, so the light card showed through them.
   *
   * So the theme belongs to the ONE owner that can set it: the
   * navigator. One prop fixes every screen that does not paint its own
   * background, rather than each screen patching its own root.
   */
  const {colors, isDark} = useTheme();
  const navigationTheme = useMemo<Theme>(
    () => ({
      dark: isDark,
      colors: {
        primary: colors.accent.gold,
        background: colors.background.primary,
        card: colors.background.primary,
        text: colors.text.primary,
        border: colors.border.subtle,
        notification: colors.accent.gold,
      },
      // React Navigation v7's theme carries four font roles. The app's
      // OWN typography tokens are the source for all four — regular is
      // `body1`, medium is `overline`, bold is `button` and heavy is
      // `display` — so the navigator cannot drift from the app's type.
      //
      // The family/weight pairs are exactly the pairs in
      // `src/theme/tokens.ts`: a baked family (`Inter Medium`,
      // `Inter SemiBold`) keeps its weight BELOW 700, so Android's
      // asset path stays `fonts/<Family>.ttf` and the file that
      // exists is the one that loads. `Inter` at 700 resolves to
      // `Inter_bold.ttf`.
      //
      // These roles are INERT in this app — every screen sets
      // `headerShown: false` and draws its own `InternalHeader` — but
      // the theme's type requires them, and a navigator theme that
      // names the app's real type is honest even when it is unused.
      fonts: {
        regular: {fontFamily: FONT_FAMILY.inter.regular, fontWeight: '400'},
        medium: {fontFamily: FONT_FAMILY.inter.medium, fontWeight: '500'},
        bold: {fontFamily: FONT_FAMILY.inter.semibold, fontWeight: '600'},
        heavy: {fontFamily: FONT_FAMILY.inter.bold, fontWeight: '700'},
      },
    }),
    [colors, isDark],
  );

  return (
    <>
      <SimbaStatusBar variant="home" />
      <View style={styles.root}>
        <NavigationContainer
          ref={navigationRef}
          linking={linkingConfig}
          theme={navigationTheme}>
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
