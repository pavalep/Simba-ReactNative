import {createNavigationContainerRef} from '@react-navigation/native';
import {RootStackParamList} from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
) {
  // W22 D-020 note: the typed `navigationRef.navigate` has a
  // variadic signature that doesn't accept a 2-tuple `[(name,
  // params?)]` when `params` may be `undefined`. The pre-V22
  // workaround was `(name as any, params as any)`. The narrower
  // `as never` pair doesn't distribute over the variadic union,
  // so `as any` remains the only option here. The trade-off is
  // documented in `README.md` (search for "navigationHelper
  // variadic cast") and tracked as a W22 follow-up for when
  // `@react-navigation/native` ships the `[RouteName, params?]`
  // tuple overload. The `as any` is scoped to this single line.
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
  }
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}
