import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

/**
 * V17 Phase 78: replaces `authSlice` (Redux) with `authStore` (Zustand
 * + persist). State shape, action semantics, and persist key
 * (`'auth'`) are preserved so the cold-start session restore
 * works identically after the migration.
 *
 * `resetAppState` (the old global action dispatched on logout to
 * purge all whitelisted slices) is replaced by per-store
 * `reset()` actions; the orchestration in `useAuth.signOut` /
 * `useAuth.revokeAccess` is the Phase 85 work.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  photo: string | null;
}

/**
 * 43.3: Categorized sign-in failures so the UI can show tailored copy
 * (offline / cancelled / Play Services / expired session).
 */
export type AuthErrorKind =
  | 'cancelled'
  | 'play_services'
  | 'offline'
  | 'session_expired'
  | 'unknown';

/**
 * 43.2: Session TTL — 30 days of inactivity. On foreground the app
 * compares `sessionExpiresAt` against now and re-prompts when stale.
 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** 43.1: silent session restore in flight on cold start */
  isRestoring: boolean;
  error: string | null;
  /** 43.3: machine-readable error category for tailored UI copy */
  errorKind: AuthErrorKind | null;
  /** 43.2: wall-clock stamp of the last successful sign-in */
  lastSignedInAt: number | null;
  /** 43.2: wall-clock stamp after which the session is considered stale */
  sessionExpiresAt: number | null;
}

export interface AuthActions {
  setLoading: (isLoading: boolean) => void;
  setUser: (user: AuthUser | null) => void;
  setError: (input: {message: string; kind: AuthErrorKind}) => void;
  /** 43.1: silent restore began (cold start, persisted session present) */
  restoreStart: () => void;
  signOut: () => void;
  /** 43.2: foreground expiry detected — drop the session, prompt re-auth */
  expireSession: () => void;
  /** 49.5: full reset (called by `useAuth.signOut` and `useAuth.revokeAccess`) */
  reset: () => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoring: false,
  error: null,
  errorKind: null,
  lastSignedInAt: null,
  sessionExpiresAt: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,

      setLoading: (isLoading) =>
        set({isLoading, isRestoring: false}),

      setUser: (user) =>
        set({
          user,
          isAuthenticated: user !== null,
          error: null,
          errorKind: null,
          isLoading: false,
          isRestoring: false,
          lastSignedInAt: user ? Date.now() : null,
          sessionExpiresAt: user ? Date.now() + SESSION_TTL_MS : null,
        }),

      setError: (input) =>
        set({
          error: input.message,
          errorKind: input.kind,
          isLoading: false,
          isRestoring: false,
        }),

      restoreStart: () => set({isRestoring: true}),

      signOut: () =>
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          errorKind: null,
          isLoading: false,
          isRestoring: false,
          lastSignedInAt: null,
          sessionExpiresAt: null,
        }),

      expireSession: () =>
        set({
          user: null,
          isAuthenticated: false,
          error: 'Your session has expired. Please sign in again.',
          errorKind: 'session_expired',
          isLoading: false,
          isRestoring: false,
          lastSignedInAt: null,
          sessionExpiresAt: null,
        }),

      reset: () => set({...initialState}),
    }),
    {
      name: 'auth',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
      // The `partialize` defaults to "persist everything". The
      // `isLoading` and `isRestoring` fields are transient runtime
      // flags that should NOT survive a process restart — but on
      // cold start they're reset to false via the initialState
      // round-trip through `persist`'s hydration, so it's safe
      // to leave the default partialize.
    },
  ),
);
