import {createNavigationContainerRef} from '@react-navigation/native';
import {RootStackParamList} from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * The `params?` argument is conditional on the route:
 *   - If `RootStackParamList[RouteName]` is `undefined` (no params),
 *     the call is `navigate(name)`.
 *   - Otherwise it's `navigate(name, params)`.
 *
 * The rest-arg tuple `[] | [params]` uses a conditional type
 * to mirror the upstream `@react-navigation/native` v6/v7
 * overloads. This lets TS pick the correct tuple form at the
 * call site without `as any` on the args.
 *
 * W22 F/U #13 — D-020 escape. The v6 variadic form
 * (`(name, params?)`) hit a variadic-distribution problem
 * when `params` is `undefined` (the compiler couldn't pick
 * the 1-tuple vs 2-tuple overload). The fix: use the v7
 * options-object form (`{name, params}`) on the upstream
 * `navigationRef.navigate`. The `as never` is the narrowest
 * escape for the args object — the upstream type uses a
 * deep conditional that's impossible to satisfy from a
 * generic `RootStackParamList`. The pre-W22 `as any` is
 * no longer needed.
 */
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  ...args: RootStackParamList[RouteName] extends undefined
    ? [] | [params?: RootStackParamList[RouteName]]
    : [params: RootStackParamList[RouteName]]
): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate({name, params: args[0]} as never);
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}
