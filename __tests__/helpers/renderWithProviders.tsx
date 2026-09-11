/**
 * V21 W22 F/U #3 — `renderWithProviders(Component, options)` test helper.
 *
 * The SIMBA app's screens are mounted inside a deep provider tree:
 * `<SafeAreaProvider>` + `<ThemeProvider>` + `<QueryClientProvider>` +
 * `<NavigationContainer>` + `<Stack.Navigator>` + `<ToastProvider>`.
 * `useConfirmDialog()` is a local-state hook (no provider needed — it
 * returns the `<ConfirmDialog>` JSX inline; see
 * `src/components/core/Dialog/ConfirmDialog.tsx:67`).
 *
 * Writing that tree inline for every test is ~10 lines of boilerplate
 * per test file. This helper centralizes the standard set so each
 * screen test is a 2-line setup:
 *
 * ```tsx
 * import {renderWithProviders} from '../helpers/renderWithProviders';
 * import {NowPlayingScreen} from '../../src/screens/NowPlaying';
 *
 * const {getByText} = await renderWithProviders(NowPlayingScreen, {
 *   routeName: 'NowPlaying',
 *   initialParams: {fileUri: 'file:///x', fileTitle: 'X'},
 * });
 * expect(getByText('Now Playing')).toBeTruthy();
 * ```
 *
 * **Why `Stack.Screen` (not just `<NavigationContainer>` + a render
 * prop):** SIMBA screens accept `route` + `navigation` as
 * `RootStackScreenProps<RouteName>` — they don't call
 * `useRoute()` / `useNavigation()` internally. The cleanest way
 * to give them real route/navigation props in test mode is to
 * mount them as the `component` of a `Stack.Screen` and let
 * React Navigation do the wiring. This is the v6/v7 idiom
 * recommended by the React Navigation team.
 *
 * **`render` is async** in `@testing-library/react-native` v14
 * (it `await`s the initial `act()` commit). Callers must
 * `await renderWithProviders(...)`. The returned object is the
 * standard `RenderResult` (note: in v14 the `rerender` /
 * `unmount` methods also return Promises).
 *
 * **Toast is always wrapped** (not opt-in). The provider is a
 * no-op in test mode (no UI, no side effects) — the screen's
 * `useToast()` call sites just see a stable stub. Without this,
 * every test that touches a screen using `useToast` would
 * crash with "useToast must be used within a ToastProvider"
 * (see `Toast.tsx:260`).
 *
 * **QueryClient is fresh per render** — each test gets its own
 * isolated cache, no `gcTime` bleed between tests.
 *
 * **Not wrapped by default** (opt-in via `extraProviders`):
 * `<SimbaPlayer>` (the V16 root that mounts the player context).
 * Most screen tests don't need it; including it would force
 * every test to mock the player module. If a screen test
 * needs it, pass `extraProviders`.
 */

import React, {type ReactNode, type ReactElement, type ComponentType} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import {render, type RenderResult} from '@testing-library/react-native';

import {ThemeProvider} from '../../src/theme';
import {ToastProvider} from '../../src/components/feedback/Toast';
import type {RootStackParamList} from '../../src/navigation/types';

// ─── Options ─────────────────────────────────────────────────

export interface RenderWithProvidersOptions<
  RouteName extends keyof RootStackParamList,
> {
  /**
   * The route name — must be a key of `RootStackParamList`. Used
   * to type the `initialParams` and to give the screen a real
   * React Navigation `route.name`. Defaults to `'NowPlaying'`
   * (the most-tested screen) so the common case is a 1-arg
   * call.
   */
  routeName?: RouteName;

  /**
   * Initial route params for the screen under test. Typed
   * against `RootStackParamList[RouteName]` so a typo in
   * `fileUri` vs `fileURI` is caught at compile time.
   */
  initialParams?: RootStackParamList[RouteName];

  /**
   * Optional callback to wrap the tree with extra providers
   * (e.g. `<SimbaPlayer>` for screens that read player state).
   * Receives the children, returns a new tree. Order: extra
   * providers wrap the inner ones (so extra is the OUTERMOST).
   */
  extraProviders?: (children: ReactNode) => ReactNode;
}

// ─── Implementation ──────────────────────────────────────────

const Stack = createNativeStackNavigator<RootStackParamList>();

export async function renderWithProviders<
  RouteName extends keyof RootStackParamList = 'NowPlaying',
>(
  // The screen component (not a constructed element). React
  // Navigation passes `route` + `navigation` to it as props.
  // We type it as `ComponentType<any>` because the screen's
  // own props type (`RootStackScreenProps<RouteName>`) varies
  // by route name and is wider than the helper's generic;
  // a stricter type would force every caller to cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<any>,
  options: RenderWithProvidersOptions<RouteName> = {},
): Promise<RenderResult> {
  const {
    routeName = 'NowPlaying' as RouteName,
    initialParams,
    extraProviders,
  } = options;

  // Fresh QueryClient per render — isolates cache between tests.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {retry: false, gcTime: 0},
    },
  });

  // The standard set, in render order (outer → inner):
  //   1. extraProviders   — opt-in escape hatch (e.g. <SimbaPlayer>)
  //   2. SafeAreaProvider — useSafeAreaInsets()
  //   3. QueryClientProvider — useQuery()
  //   4. ThemeProvider     — useTheme()
  //   5. ToastProvider     — useToast()
  //   6. NavigationContainer + Stack.Navigator + Stack.Screen
  //      — provides route + navigation to the screen component
  let tree: ReactElement = (
    // The real `SafeAreaProvider` (not the jest mock) is needed
    // here because `NavigationContainer` internally mounts a
    // `SafeAreaProviderCompat` that reads the safe-area context.
    // The jest mock is `({children}) => children` — a passthrough
    // that does NOT provide the context, which crashes
    // `NavigationContainer` with "Cannot read properties of
    // undefined (reading '$$typeof')" inside
    // `@react-navigation/elements/src/SafeAreaProviderCompat.tsx`.
    //
    // `initialWindowMetrics` from the library is a synthetic
    // 320×640 frame with zero insets — exactly what the test
    // mode needs. Passing it lets the real provider boot
    // synchronously without measuring a real window.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <NavigationContainer>
              <Stack.Navigator>
                <Stack.Screen
                  name={routeName}
                  component={Component}
                  initialParams={initialParams}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );

  if (extraProviders) {
    tree = extraProviders(tree) as ReactElement;
  }

  return render(tree);
}
