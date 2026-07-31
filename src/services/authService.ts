import {Platform} from 'react-native';
import type {AuthUser, AuthErrorKind} from '../store/slices/authSlice';

/**
 * Google Sign-In wrapper.
 * 43.1: silent session restore · 43.3: classified errors · 43.5: revoke access
 */

interface GoogleSignInResult {
  user: AuthUser;
}

export interface AuthErrorInfo {
  kind: AuthErrorKind;
  message: string;
}

/** Error thrown by sign-in flows with a machine-readable category. */
export class AuthError extends Error {
  readonly kind: AuthErrorKind;

  constructor(info: AuthErrorInfo) {
    super(info.message);
    this.name = 'AuthError';
    this.kind = info.kind;
  }
}

/** Lazy require — the native module is unavailable in unit tests. */
function getGoogleSignin(): any {
  return require('@react-native-google-signin/google-signin');
}

function toAuthUser(user: {
  id?: string;
  name?: string;
  email?: string;
  photo?: string | null;
}): AuthUser {
  return {
    id: user?.id ?? '',
    name: user?.name ?? 'User',
    email: user?.email ?? '',
    photo: user?.photo ?? null,
  };
}

/**
 * 43.3: Classify a thrown sign-in error into a stable category.
 * Pure (codes are injected) so unit tests can exercise it without
 * the native module.
 */
export function classifyAuthError(
  error: unknown,
  codes: Record<string, unknown> = {},
): AuthErrorInfo {
  const raw = error as {code?: string | number} | null;
  const code = raw?.code;
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (code !== undefined && code !== null) {
    if (code === codes.SIGN_IN_CANCELLED) {
      return {kind: 'cancelled', message: 'Sign-in was cancelled.'};
    }
    if (code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        kind: 'play_services',
        message: 'Google Play Services are not available on this device.',
      };
    }
    if (code === codes.SIGN_IN_REQUIRED) {
      return {
        kind: 'session_expired',
        message: 'Your session has expired. Please sign in again.',
      };
    }
  }

  const lowered = message.toLowerCase();
  if (/cancelled|canceled/.test(lowered)) {
    return {kind: 'cancelled', message: 'Sign-in was cancelled.'};
  }
  if (/play services/.test(lowered)) {
    return {
      kind: 'play_services',
      message: 'Google Play Services are not available on this device.',
    };
  }
  if (/network|internet|offline|connection|timed?\s*out|no_network/.test(lowered)) {
    return {
      kind: 'offline',
      message: 'You appear to be offline. Check your connection and try again.',
    };
  }
  return {
    kind: 'unknown',
    message: message || 'Sign-in failed. Please try again.',
  };
}

const DEV_USER: AuthUser = {
  id: 'dev-user',
  name: 'Dev User',
  email: 'dev@simba.local',
  photo: null,
};

/**
 * Attempt Google Sign-In.
 * Returns the authenticated user on success, throws AuthError on failure.
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  try {
    const GoogleSignin = getGoogleSignin();
    GoogleSignin.configure({
      // Minimal config — webClientId is typically loaded from
      // google-services.json / GoogleService-Info.plist at build time.
      offlineAccess: false,
    });

    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    return toAuthUser(userInfo.user);
  } catch (error: unknown) {
    if (__DEV__) {
      // Dev fallback — emulators often lack Play Services / a Google account.
      return DEV_USER;
    }
    throw new AuthError(
      classifyAuthError(error, getGoogleSignin().statusCodes ?? {}),
    );
  }
}

/**
 * 43.1: Silent session restore on cold start.
 * Never prompts the user; classifies the outcome so callers can decide
 * between re-auth, sign-out, or keeping the persisted session (offline grace).
 */
export type SilentRestoreResult =
  | {status: 'restored'; user: AuthUser}
  | {status: 'no_session'}
  | {status: 'expired'}
  | {status: 'unavailable'};

export async function signInSilently(): Promise<SilentRestoreResult> {
  try {
    const GoogleSignin = getGoogleSignin();
    GoogleSignin.configure({offlineAccess: false});

    if (!GoogleSignin.hasPreviousSignIn()) {
      return {status: 'no_session'};
    }

    const userInfo = await GoogleSignin.signInSilently();
    if (!userInfo?.user) {
      return {status: 'no_session'};
    }
    return {status: 'restored', user: toAuthUser(userInfo.user)};
  } catch (error: unknown) {
    const info = classifyAuthError(
      error,
      (() => {
        try {
          return getGoogleSignin().statusCodes ?? {};
        } catch {
          return {};
        }
      })(),
    );
    if (info.kind === 'session_expired' || info.kind === 'cancelled') {
      // Credential revoked or no saved credential — local session is stale.
      return {status: 'expired'};
    }
    // Network / Play Services trouble — keep the persisted session so the
    // local library stays usable offline (43.6 offline grace).
    return {status: 'unavailable'};
  }
}

/**
 * Sign out — calls Google sign-out then clears local state.
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    const GoogleSignin = getGoogleSignin();
    await GoogleSignin.signOut();
  } catch {
    // Silently ignore sign-out errors — local state is cleared anyway
  }
}

/**
 * 43.5: Revoke the app's access to the Google account entirely.
 * Throws when revocation fails (caller decides whether to wipe locally).
 */
export async function revokeGoogleAccess(): Promise<void> {
  const GoogleSignin = getGoogleSignin();
  await GoogleSignin.revokeAccess();
}

/**
 * Returns true if Google Play Services are available (Android only).
 */
export async function isPlayServicesAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const GoogleSignin = getGoogleSignin();
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: false});
    return true;
  } catch {
    return false;
  }
}

// Kept for type-compat with any lingering `{user}` destructuring.
export type {GoogleSignInResult};
