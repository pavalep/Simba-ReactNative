import {useCallback} from 'react';
import {useAppDispatch, useAppSelector, persistor, store} from '../store';
import {navigationRef} from '../navigation/navigationHelper';
import {
  setLoading,
  setUser,
  setError,
  restoreStart,
  signOut as signOutAction,
  resetAppState,
  expireSession,
  selectAuthUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectAuthErrorKind,
  selectIsRestoring,
  selectSessionExpiresAt,
} from '../store/slices/authSlice';
import {
  signInWithGoogle,
  signInSilently,
  signOutFromGoogle,
  revokeGoogleAccess,
  AuthError,
  classifyAuthError,
} from '../services/authService';

/**
 * Auth hook — exposes authentication state and actions.
 * 43.1: silent restore · 43.3: classified errors · 43.5: revoke access.
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const isRestoring = useAppSelector(selectIsRestoring);
  const error = useAppSelector(selectAuthError);
  const errorKind = useAppSelector(selectAuthErrorKind);
  const sessionExpiresAt = useAppSelector(selectSessionExpiresAt);

  const signIn = useCallback(async () => {
    // Guardrail 1: no-op when already authenticated — prevents a stray
    // re-tap on the LoginScreen (during the navigation transition)
    // from racing against the RootNavigator remount and bouncing the
    // user out.
    if (store.getState().auth.isAuthenticated) {
      return;
    }
    dispatch(setLoading(true));
    dispatch(setError({message: '', kind: 'unknown'}));

    try {
      const authUser = await signInWithGoogle();
      dispatch(setUser(authUser));
      // Guardrail 2: navigate to the tab root once the user is in Redux.
      // The RootNavigator also remounts via its `key` prop, so a reset
      // here avoids any race between the remount and the LoginScreen's
      // useEffect-driven navigation.replace.
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [
            {
              name: 'MainTabs',
              params: {screen: 'HomeTab', params: {screen: 'Home'}},
            },
          ],
        });
      }
    } catch (err: unknown) {
      const info =
        err instanceof AuthError
          ? {message: err.message, kind: err.kind}
          : classifyAuthError(err);
      dispatch(setError(info));
    }
  }, [dispatch]);

  /**
   * 43.1: Silent session restore on cold start. Keeps the persisted session
   * when the network is unreachable (offline grace), signs out only when the
   * credential was actually revoked/expired.
   */
  const restoreSession = useCallback(async () => {
    dispatch(restoreStart());
    const result = await signInSilently();
    if (result.status === 'restored') {
      dispatch(setUser(result.user));
    } else if (result.status === 'expired') {
      dispatch(signOutAction());
      if (navigationRef.isReady()) {
        navigationRef.reset({index: 0, routes: [{name: 'Login'}]});
      }
    }
    // 'no_session' / 'unavailable' → keep persisted state as-is
  }, [dispatch]);

  const signOut = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      await signOutFromGoogle();
    } catch {
      // Proceed with local sign-out regardless
    }
    // 49.5: purge ALL persisted state — wipe AsyncStorage and reset all slices
    persistor.purge();
    dispatch(resetAppState());
    // Immediately force navigation to Login
    if (navigationRef.isReady()) {
      navigationRef.reset({index: 0, routes: [{name: 'Login'}]});
    }
  }, [dispatch]);

  /**
   * 43.5: Revoke the Google account grant entirely, then clear the session.
   * Returns false if revocation failed so callers can warn the user.
   */
  const revokeAccess = useCallback(async (): Promise<boolean> => {
    dispatch(setLoading(true));
    try {
      await revokeGoogleAccess();
      return true;
    } catch {
      // Revocation failed — still clear the local session (user asked to leave)
      return false;
    } finally {
      // 49.5: purge ALL persisted state after revocation
      persistor.purge();
      dispatch(resetAppState());
      // Immediately force navigation to Login
      if (navigationRef.isReady()) {
        navigationRef.reset({index: 0, routes: [{name: 'Login'}]});
      }
    }
  }, [dispatch]);

  const clearExpiredSession = useCallback(() => {
    dispatch(expireSession());
    if (navigationRef.isReady()) {
      navigationRef.reset({index: 0, routes: [{name: 'Login'}]});
    }
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isRestoring,
    error,
    errorKind,
    sessionExpiresAt,
    signIn,
    signOut,
    restoreSession,
    revokeAccess,
    clearExpiredSession,
  };
}
