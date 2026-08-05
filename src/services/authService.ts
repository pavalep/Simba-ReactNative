import {Platform} from 'react-native';
import type {AuthUser, AuthErrorKind} from '../store/slices/authSlice';
import {ENV} from '../constants/env';

/**
 * Google Sign-In wrapper.
 * 43.1: silent session restore · 43.3: classified errors · 43.5: revoke access
 */

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

/** Lazy require wrapper for the google-signin module namespace.
 *  Kept separate so unit tests can intercept without loading the native module.
 */
function getGoogleSigninModule(): any {
  return require('@react-native-google-signin/google-signin');
}

/**
 * Lazy require of the `GoogleSignin` named export — the object that actually
 * exposes `configure`, `hasPlayServices`, `signIn`, `signOut`, `revokeAccess`,
 * `hasPreviousSignIn`, `signInSilently`, etc.
 *
 * NOTE: do NOT return the raw require() result — that's the module namespace,
 * and calling `.configure()` on it raises "undefined is not a function" because
 * the methods live on the `GoogleSignin` sub-object, not the namespace itself.
 */
function getGoogleSignin(): any {
  return getGoogleSigninModule().GoogleSignin;
}

/** The `statusCodes` enum export (separate from the `GoogleSignin` object). */
function getGoogleStatusCodes(): Record<string, unknown> {
  return getGoogleSigninModule().statusCodes ?? {};
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

function toAuthUserFromGooglePayload(payload: unknown): AuthUser {
  const p = payload as any;
  const profile =
    p && typeof p === 'object' && p.user && typeof p.user === 'object' ? p.user : p;
  return toAuthUser(profile ?? {});
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new AuthError({
              kind: 'unknown',
              message: 'Sign-in timed out. Please try again.',
            }),
          );
        }, ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
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

/**
 * Read the Google OAuth client ID from the build-time env.
 * Falls back to a placeholder until you paste the real value.
 */
function getGoogleClientId(): string {
  // On Android the Google Services Gradle plugin reads google-services.json
  // at build time and exposes the default_web_client_id as a string resource.
  // The JS side reads it from the ENV constant (injected at build time).
  return ENV.GOOGLE_WEB_CLIENT_ID ?? '';
}

/**
 * Build the configure() options for the current platform.
 * Used both for one-shot init and for re-init after a sign-out/revoke.
 */
function getConfigureOptions(): Record<string, unknown> {
  const options: Record<string, unknown> = {
    offlineAccess: false,
  };
  const clientId = getGoogleClientId();
  if (Platform.OS === 'android' && clientId) {
    options.webClientId = clientId;
  }
  if (Platform.OS === 'ios' && clientId) {
    options.iosClientId = clientId;
  }
  return options;
}

/**
 * One-shot GoogleSignin configuration. Call once at app startup.
 * Re-calling configure() at every signIn() is what was breaking the
 * post-revoke sign-in flow: the library kept re-seeding state in a way
 * that suppressed the account picker.
 */
let configured = false;
export function configureGoogleSignin(): void {
  if (configured) return;
  const GoogleSignin = getGoogleSignin();
  GoogleSignin.configure(getConfigureOptions());
  configured = true;
}

/**
 * v13 response shape of `GoogleSignin.signIn()`:
 * `{ type: 'success', data: User } | { type: 'cancelled' }`.
 */
type GoogleSignInResponse =
  | {type: 'success'; data: unknown}
  | {type: 'cancelled'};

/**
 * Attempt Google Sign-In.
 * Returns the authenticated user on success, throws AuthError on failure.
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  // Ensure configure() has run at least once for this JS context — a previous
  // signOut()/revokeAccess() does not invalidate the configuration.
  configureGoogleSignin();
  const GoogleSignin = getGoogleSignin();

  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
  const response = await withTimeout<GoogleSignInResponse>(
    GoogleSignin.signIn(),
    30000,
  );
  if (response.type !== 'success') {
    throw new AuthError({
      kind: 'cancelled',
      message: 'Sign-in was cancelled.',
    });
  }
  return toAuthUserFromGooglePayload(response.data);
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
    configureGoogleSignin();
    const GoogleSignin = getGoogleSignin();

    if (!GoogleSignin.hasPreviousSignIn()) {
      return {status: 'no_session'};
    }

    // v13: signInSilently() returns { type: 'success', data: User } | { type: 'no_session' | 'sign_inRequired' }
    const userInfo = await GoogleSignin.signInSilently();
    if (userInfo.type !== 'success') {
      return {status: 'no_session'};
    }
    return {status: 'restored', user: toAuthUserFromGooglePayload(userInfo.data)};
  } catch (error: unknown) {
    const info = classifyAuthError(
      error,
      getGoogleStatusCodes()
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
 * Sign out — clears both the local session and the device-level Google account
 * association so that the next sign-in always shows the account picker.
 *
 * We call revokeAccess() (not just signOut()) so that signInSilently() on the
 * next app launch finds no saved account and returns 'no_session' — the user is
 * never auto-routed to Home without explicitly selecting a Google account.
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    const GoogleSignin = getGoogleSignin();
    await GoogleSignin.signOut();
    // CRITICAL: revocation removes the saved Google account from the device's
    // Google Sign-In cache. Without this, the account picker is skipped on the
    // next sign-in and the previous account is silently restored.
    await GoogleSignin.revokeAccess();
  } catch {
    // Silently ignore sign-out/revoke errors — local state is cleared anyway
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
