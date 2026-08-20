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
      // Guardrail 2: navigate to the direct Home root once the user is in Redux.
      // The RootNavigator also remounts via its `key` prop, so a reset
      // here avoids any race between the remount and the LoginScreen's
      // useEffect-driven navigation.replace.
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [
            {
              name: 'Home',
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
   * 43.1: Silent session restore on cold start. P67: tightened
   * semantics — we now trust the persisted user and only force a
   * signOut on an *explicit* revoke event.
   *
   * The previous version treated `signInSilently()` returning
   * `'expired'` (which fires for `SIGN_IN_REQUIRED` or any
   * session_expired-classified error) as a confirmed revoke. In
   * practice `'expired'` fires for many reasons that are NOT
   * credential revocation:
   *   • Play Services state went stale (emulator reboot, app
   *     upgrade, OS update).
   *   • User switched the primary Google account on the device
   *     without signing out of our app.
   *   • The library's local cache is out of sync with the server.
   * Result: a signed-in user opened the app after a normal cold
   * start and got silently routed to Login.
   *
   * The fix: on cold start, the persisted `state.auth.user` is
   * the source of truth. `signInSilently()` runs in the
   * background to refresh the user object (photo URL may have
   * changed), but its failure is informational, not a kick-out
   * signal. The user explicitly signs out via Profile → Sign Out
   * when they want to leave; we don't pre-empt that decision.
   */
  const restoreSession = useCallback(async () => {
    dispatch(restoreStart());
    console.log('[AUTH] cold-start restoreSession: starting silent restore');
    const result = await signInSilently();
    console.log(`[AUTH] cold-start restoreSession: result=${result.status}`);
    if (result.status === 'restored') {
      // Refresh the persisted user object (e.g. photo URL). Don't
      // bump lastSignedInAt / sessionExpiresAt for a silent
      // restore — those reflect explicit sign-in, not the cold
      // start's optimistic trust.
      dispatch(setUser(result.user));
    } else {
      // 'no_session' / 'expired' / 'unavailable' / 'revoked' — we
      // intentionally do NOT force signOut here. The persisted
      // user is trusted; the next active Google-bound action
      // (e.g. sharing a video) will surface a re-auth prompt
      // from the library if the credential is actually missing.
      console.log(
        `[AUTH] cold-start restoreSession: keeping persisted user (${result.status} is non-actionable on cold start)`,
      );
    }
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
