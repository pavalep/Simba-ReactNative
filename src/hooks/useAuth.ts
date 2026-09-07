import {useCallback} from 'react';
import {useAppDispatch, persistor} from '../store';
import {navigationRef} from '../navigation/navigationHelper';
import {useAuthStore} from '../state';
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
 *
 * V17 Phase 78: the auth state is now in the `useAuthStore`
 * Zustand store (replaces the old `authSlice` redux slice).
 * The auth-related reads + writes go through the new store;
 * the cross-store `resetAppState` dispatch + `persistor.purge()`
 * stay for now (Phase 85 replaces them with per-store `reset()`
 * calls + the `useAuth.signOut` orchestration).
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const isRestoring = useAuthStore(s => s.isRestoring);
  const error = useAuthStore(s => s.error);
  const errorKind = useAuthStore(s => s.errorKind);
  const sessionExpiresAt = useAuthStore(s => s.sessionExpiresAt);

  // Pull the actions out via `getState()` so the useCallback deps
  // are stable (the action functions are stored on the store;
  // they're stable across renders).
  const signIn = useCallback(async () => {
    // Guardrail 1: no-op when already authenticated — prevents a stray
    // re-tap on the LoginScreen (during the navigation transition)
    // from racing against the RootNavigator remount and bouncing the
    // user out.
    if (useAuthStore.getState().isAuthenticated) {
      return;
    }
    useAuthStore.getState().setLoading(true);
    useAuthStore.getState().setError({message: '', kind: 'unknown'});

    try {
      const authUser = await signInWithGoogle();
      useAuthStore.getState().setUser(authUser);
      // Guardrail 2: navigate to the direct Home root once the user
      // is in the auth store. The RootNavigator also remounts via
      // its `key` prop, so a reset here avoids any race between the
      // remount and the LoginScreen's useEffect-driven
      // navigation.replace.
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
      useAuthStore.getState().setError(info);
    }
  }, []);

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
   * The fix: on cold start, the persisted auth state is the
   * source of truth. `signInSilently()` runs in the background
   * to refresh the user object (photo URL may have changed),
   * but its failure is informational, not a kick-out signal.
   * The user explicitly signs out via Profile → Sign Out when
   * they want to leave; we don't pre-empt that decision.
   */
  const restoreSession = useCallback(async () => {
    useAuthStore.getState().restoreStart();
    console.log('[AUTH] cold-start restoreSession: starting silent restore');
    const result = await signInSilently();
    console.log(`[AUTH] cold-start restoreSession: result=${result.status}`);
    if (result.status === 'restored') {
      // Refresh the persisted user object (e.g. photo URL). Don't
      // bump lastSignedInAt / sessionExpiresAt for a silent
      // restore — those reflect explicit sign-in, not the cold
      // start's optimistic trust.
      useAuthStore.getState().setUser(result.user);
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
  }, []);

  const signOut = useCallback(async () => {
    useAuthStore.getState().setLoading(true);
    try {
      await signOutFromGoogle();
    } catch {
      // Proceed with local sign-out regardless
    }
    // 49.5: purge ALL persisted state — wipe AsyncStorage and reset all slices
    // V17 Phase 78: keep the redux-persist purge for now (Phase 85
    // replaces it with per-store `reset()` calls + the useAuth.signOut
    // orchestration).
    persistor.purge();
    useAuthStore.getState().reset();
    // Immediately force navigation to Login
    if (navigationRef.isReady()) {
      navigationRef.reset({index: 0, routes: [{name: 'Login'}]});
    }
  }, []);

  /**
   * 43.5: Revoke the Google account grant entirely, then clear the session.
   * Returns false if revocation failed so callers can warn the user.
   */
  const revokeAccess = useCallback(async (): Promise<boolean> => {
    useAuthStore.getState().setLoading(true);
    try {
      await revokeGoogleAccess();
      return true;
    } catch {
      // Revocation failed — still clear the local session (user asked to leave)
      return false;
    } finally {
      // 49.5: purge ALL persisted state after revocation
      persistor.purge();
      useAuthStore.getState().reset();
      // Immediately force navigation to Login
      if (navigationRef.isReady()) {
        navigationRef.reset({index: 0, routes: [{name: 'Login'}]});
      }
    }
  }, []);

  const clearExpiredSession = useCallback(() => {
    useAuthStore.getState().expireSession();
    if (navigationRef.isReady()) {
      navigationRef.reset({index: 0, routes: [{name: 'Login'}]});
    }
  }, []);

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
