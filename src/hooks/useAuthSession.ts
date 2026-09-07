import {useEffect} from 'react';
import {AppState} from 'react-native';
import {useAuthStore} from '../state';
import {useAuth} from './useAuth';

/**
 * 43.1/43.2: Session lifecycle manager.
 * - On cold start: silently restore the persisted session (kept when offline).
 * - On foreground: drop the session when it has passed `sessionExpiresAt`.
 *
 * V17 Phase 78: reads `isAuthenticated` + `sessionExpiresAt` from
 * the new `useAuthStore` Zustand store. The lifecycle manager no
 * longer needs to read from the redux store.
 *
 * Must be mounted once, inside the app tree.
 */
export function useAuthSession() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const {restoreSession, clearExpiredSession} = useAuth();

  // ── Cold start: expiry check + silent restore ──
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    const {sessionExpiresAt} = useAuthStore.getState();
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
      const {sessionExpiresAt, isAuthenticated: authed} = useAuthStore.getState();
      if (authed && sessionExpiresAt !== null && Date.now() > sessionExpiresAt) {
        clearExpiredSession();
      }
    });
    return () => subscription.remove();
  }, [clearExpiredSession]);
}
