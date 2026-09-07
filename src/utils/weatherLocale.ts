// ─── Weather device-locale resolution (Phase 61 + V17) ────────────
//
// V17 Phase 79: `resolveTimezone` and `resolveLocale` used to live
// in `store/slices/weatherSlice.ts` so the redux `fetchWeather`
// thunk could call them. The thunk is gone; the cascade moved to
// `useWeather` (a plain async function). These helpers are pure
// device-locale resolution and have no business being in a
// weather-state file, so they moved to `src/utils/weatherLocale.ts`.
//
// Behavior is unchanged from the slice version:
//   - Native RNLocalize first (most accurate — OS-level).
//   - Intl.DateTimeFormat fallback (Hermes, no native bridge).
//   - Returns null if both fail.
//
// The 17+ `console.log` calls that used to pepper the cascade are
// gone; the new `useWeather` cascade uses `logger.debug` only on
// decision points (V16 out-of-scope fix that V17 picked up).

import * as RNLocalize from 'react-native-localize';
import {useSettingsStore} from '../state';
import {useWeatherStore} from '../state';
import {useLiveFavoritesStore} from '../state';
import {useFollowedPodcastsStore} from '../state';

/** Resolve the device timezone (IANA string). */
export function resolveTimezone(): string | null {
  try {
    const tz = RNLocalize.getTimeZone();
    if (tz) return tz;
  } catch {
    // RNLocalize.getTimeZone can throw on older Android builds when
    // the system clock is unset. Fall through to Intl.
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz;
  } catch {
    // Hermes < 0.7 ships without Intl tz support on Android; even
    // the fallback can throw. Return null and let the cascade
    // continue to the next tier.
  }
  return null;
}

/** Resolve the device locale (BCP-47 tag, e.g. "en-US"). */
export function resolveLocale(): string | null {
  try {
    const locales = RNLocalize.getLocales();
    if (locales && locales.length > 0 && locales[0].languageTag) {
      return locales[0].languageTag;
    }
  } catch {
    // Fall through to Intl.
  }
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale;
    if (loc) return loc;
  } catch {
    // Same Hermes caveat as above.
  }
  return null;
}