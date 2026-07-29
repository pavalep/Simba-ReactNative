import {Platform} from 'react-native';
import type {AuthUser} from '../store/slices/authSlice';

/**
 * Google Sign-In wrapper.
 *
 * In dev builds without the native SDK linked, provides a mock flow
 * so the LoginScreen UI can be iterated on without a real Google
 * developer project configuration.
 */

const MOCK_DEV_USER: AuthUser = {
  id: 'dev-mock-user-001',
  name: 'Dev User',
  email: 'dev@example.com',
  photo: null,
};

interface GoogleSignInResult {
  user: AuthUser;
}

/**
 * Attempt Google Sign-In.
 * Returns user info on success, throws on failure.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  // ── Production: real Google Sign-In ──
  if (!__DEV__) {
    try {
      const GoogleSignin = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        // Minimal config — webClientId is typically loaded from
        // google-services.json / GoogleService-Info.plist at build time.
        offlineAccess: false,
      });

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      const user: AuthUser = {
        id: userInfo.user?.id ?? '',
        name: userInfo.user?.name ?? 'User',
        email: userInfo.user?.email ?? '',
        photo: userInfo.user?.photo ?? null,
      };

      return {user};
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Google Sign-In failed';
      throw new Error(message);
    }
  }

  // ── DEV: mock sign-in (skip native SDK requirement) ──
  // Simulate network delay
  await new Promise<void>(resolve => setTimeout(resolve, 800));
  return {user: MOCK_DEV_USER};
}

/**
 * Sign out — calls Google sign-out then clears local state.
 */
export async function signOutFromGoogle(): Promise<void> {
  if (!__DEV__) {
    try {
      const GoogleSignin = require('@react-native-google-signin/google-signin');
      await GoogleSignin.signOut();
    } catch {
      // Silently ignore sign-out errors — local state is cleared anyway
    }
  }
}

/**
 * Returns true if Google Play Services are available (Android only).
 */
export async function isPlayServicesAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (__DEV__) {
    return true;
  }
  try {
    const GoogleSignin = require('@react-native-google-signin/google-signin');
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: false});
    return true;
  } catch {
    return false;
  }
}
