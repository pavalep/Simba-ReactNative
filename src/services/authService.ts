import {Platform} from 'react-native';
import type {AuthUser} from '../store/slices/authSlice';

/**
 * Google Sign-In wrapper.
 */

interface GoogleSignInResult {
  user: AuthUser;
}

/**
 * Attempt Google Sign-In.
 * Returns user info on success, throws on failure.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
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

/**
 * Register a new user with email and password.
 * Sends credentials to an auth endpoint.
 */
export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<GoogleSignInResult> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name, email, password}),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Registration failed');
    }
    const data = await response.json();
    return {
      user: {
        id: data.id ?? '',
        name: data.name ?? name,
        email: data.email ?? email,
        photo: data.photo ?? null,
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Registration failed';
    throw new Error(message);
  }
}

/**
 * Sign out — calls Google sign-out then clears local state.
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    const GoogleSignin = require('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // Silently ignore sign-out errors — local state is cleared anyway
  }
}

/**
 * Returns true if Google Play Services are available (Android only).
 */
export async function isPlayServicesAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') {
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
