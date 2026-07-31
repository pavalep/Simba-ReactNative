import {useEffect} from 'react';
import {AppState} from 'react-native';
import {useAppSelector} from '../store';
import {store} from '../store';
import {useAuth} from './useAuth';

/**
 * 43.1/43.2: Session lifecycle manager.
 * - On cold start: silently restore the persisted session (kept when offline).
 * - On foreground: drop the session when it has passed `sessionExpiresAt`.
 *
 * Must be mounted once, inside the Redux Provider (AppContent).
 */
export function useAuthSession() {
  const isAuthenticated = useAppSelector(
    state => state.auth.isAuthenticated,
  );
  const {restoreSession, clearExpiredSession} = useAuth();

  // ── Cold start: expiry check + silent restore ──
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    const {sessionExpiresAt} = store.getState().auth;
    if (sessionExpiresAt !== null && Date.now() > sessionExpiresAt) {
      clearExpiredSession();
      return;
    }
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Foreground: re-check expiry whenever the app becomes active ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        return;
      }
      const {sessionExpiresAt, isAuthenticated: authed} = store.getState().auth;
      if (authed && sessionExpiresAt !== null && Date.now() > sessionExpiresAt) {
        clearExpiredSession();
      }
    });
    return () => subscription.remove();
  }, [clearExpiredSession]);
}
