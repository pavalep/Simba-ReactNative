import {useCallback} from 'react';
import {useAppDispatch, useAppSelector} from '../store';
import {
  setLoading,
  setUser,
  setError,
  signOut as signOutAction,
  selectAuthUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
} from '../store/slices/authSlice';
import {
  signInWithGoogle,
  signOutFromGoogle,
} from '../services/authService';

/**
 * Auth hook — exposes authentication state and actions.
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);

  const signIn = useCallback(async () => {
    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const {user: authUser} = await signInWithGoogle();
      dispatch(setUser(authUser));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Sign-in failed';
      dispatch(setError(message));
    }
  }, [dispatch]);

  const signOut = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      await signOutFromGoogle();
    } catch {
      // Proceed with local sign-out regardless
    }
    dispatch(signOutAction());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    signIn,
    signOut,
  };
}
