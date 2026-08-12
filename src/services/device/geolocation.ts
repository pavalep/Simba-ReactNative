// ─── Device Geolocation (P61) ──────────────────────────────────────
// Thin wrapper around @react-native-community/geolocation that:
//   1. Asks for the runtime permission on Android (PermissionsAndroid).
//      iOS handles this automatically — the first call to
//      getCurrentPosition triggers the OS prompt, no code needed here.
//   2. Returns a `{lat, lon}` object on success, `null` on any failure
//      (denied, timeout, hardware error, emulator without a set
//      location). Never throws.
//
// Caller decides what to do with `null` — typically fall back to a
// timezone-based city so the greeting still renders something useful.

import {Platform, PermissionsAndroid} from 'react-native';
import Geolocation, {type GeolocationOptions} from '@react-native-community/geolocation';

export interface DeviceCoords {
  lat: number;
  lon: number;
}

const LOCATION_TIMEOUT_MS = 10_000;
const MAX_AGE_MS = 5 * 60 * 1000; // accept a fix up to 5 min old

export async function getCurrentCoords(): Promise<DeviceCoords | null> {
  // ── Android: ask for permission first ──
  if (Platform.OS === 'android') {
    console.log('[WEATHER] getCurrentCoords: requesting Android FINE_LOCATION permission');
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location for weather greeting',
        message:
          'SIMBA uses your location to show the current weather on the Home page. You can deny this — the greeting will still work, just with a less precise city.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    console.log(`[WEATHER] getCurrentCoords: permission result=${granted}`);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      console.log('[WEATHER] getCurrentCoords: permission not granted, returning null');
      return null;
    }
  }
  // ── iOS: prompt fires automatically on the first getCurrentPosition ──

  console.log('[WEATHER] getCurrentCoords: calling Geolocation.getCurrentPosition...');
  return new Promise(resolve => {
    // Defensive: if the native module isn't linked (stale iOS build
    // before `pod install` was run), `Geolocation.getCurrentPosition`
    // will throw "module not registered" synchronously. Catch it
    // and resolve to null so the caller can fall through to the
    // timezone step instead of an unhandled rejection.
    try {
      Geolocation.getCurrentPosition(
        pos => {
          const {latitude, longitude} = pos.coords;
          console.log(
            `[WEATHER] Geolocation.getCurrentPosition success: lat=${latitude} lon=${longitude}`,
          );
          if (typeof latitude === 'number' && typeof longitude === 'number') {
            resolve({lat: latitude, lon: longitude});
          } else {
            resolve(null);
          }
        },
        err => {
          console.log(
            '[WEATHER] Geolocation.getCurrentPosition error:',
            err && typeof err === 'object' && 'message' in err
              ? (err as {message: string}).message
              : JSON.stringify(err),
          );
          // Permission denied, hardware error, no fix, etc.
          resolve(null);
        },
        {
          enableHighAccuracy: false, // coarse is fine for "what city am I in"
          timeout: LOCATION_TIMEOUT_MS,
          maximumAge: MAX_AGE_MS,
          // distanceFilter not applicable to getCurrentPosition
        } as GeolocationOptions,
      );
    } catch (err) {
      console.log(
        '[WEATHER] Geolocation.getCurrentPosition sync throw:',
        err instanceof Error ? err.message : String(err),
      );
      resolve(null);
    }
  });
}

/**
 * Best-effort reverse-geocode of lat/lon to a human-readable city
 * name. Uses BigDataCloud's free Client API — no key, no rate
 * limit, designed for this exact use case. Returns null on
 * network failure or if the coords are in the middle of an ocean.
 *
 * BigDataCloud's response includes both `city` (the administrative
 * city, e.g. "San Jose") and `locality` (the neighborhood, e.g.
 * "Mountain View"). We prefer `city` for the greeting because it's
 * what people use in casual conversation; fall back to `locality`
 * if city is missing (rural areas, unincorporated regions).
 */
export async function reverseGeocodeCity(
  lat: number,
  lon: number,
  language: string = 'en',
): Promise<string | null> {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat.toFixed(4)}` +
      `&longitude=${lon.toFixed(4)}` +
      `&localityLanguage=${encodeURIComponent(language)}`;
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data?.city || data?.locality || data?.principalSubdivision || null;
  } catch {
    return null;
  }
}
