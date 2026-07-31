import {createSlice, PayloadAction} from '@reduxjs/toolkit';

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

interface AuthState {
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

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
      state.isRestoring = false;
    },
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
      state.error = null;
      state.errorKind = null;
      state.isLoading = false;
      state.isRestoring = false;
      if (action.payload) {
        state.lastSignedInAt = Date.now();
        state.sessionExpiresAt = Date.now() + SESSION_TTL_MS;
      }
    },
    setError(
      state,
      action: PayloadAction<{message: string; kind: AuthErrorKind}>,
    ) {
      state.error = action.payload.message;
      state.errorKind = action.payload.kind;
      state.isLoading = false;
      state.isRestoring = false;
    },
    /** 43.1: silent restore began (cold start, persisted session present) */
    restoreStart(state) {
      state.isRestoring = true;
    },
    signOut(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.errorKind = null;
      state.isLoading = false;
      state.isRestoring = false;
      state.lastSignedInAt = null;
      state.sessionExpiresAt = null;
    },
    /** 43.2: foreground expiry detected — drop the session, prompt re-auth */
    expireSession(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = 'Your session has expired. Please sign in again.';
      state.errorKind = 'session_expired';
      state.isLoading = false;
      state.isRestoring = false;
      state.lastSignedInAt = null;
      state.sessionExpiresAt = null;
    },
  },
});

export const {
  setLoading,
  setUser,
  setError,
  restoreStart,
  signOut,
  expireSession,
} = authSlice.actions;

export const selectAuthUser = (state: {auth: AuthState}) => state.auth.user;
export const selectIsAuthenticated = (state: {auth: AuthState}) =>
  state.auth.isAuthenticated;
export const selectAuthLoading = (state: {auth: AuthState}) =>
  state.auth.isLoading;
export const selectAuthError = (state: {auth: AuthState}) => state.auth.error;
export const selectAuthErrorKind = (state: {auth: AuthState}) =>
  state.auth.errorKind;
export const selectIsRestoring = (state: {auth: AuthState}) =>
  state.auth.isRestoring;
export const selectSessionExpiresAt = (state: {auth: AuthState}) =>
  state.auth.sessionExpiresAt;

export default authSlice.reducer;
