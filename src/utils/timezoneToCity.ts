// ─── IANA timezone + locale → representative city (P61) ────────
//
// Used as the no-permission fallback for the weather greeting.
// Three layers of resolution, in order:
//
//   1. IANA timezone (e.g. "Asia/Kolkata")  →  city in the table
//   2. Heuristic on the last segment        →  "Foo/Bar" → "Bar"
//   3. Device locale's country code         →  COUNTRY_TO_CITY map
//      (e.g. "en-IN" → "Mumbai")
//
// The third layer is the true last resort for when neither the
// native RNLocalize module nor Hermes' Intl.DateTimeFormat can
// give us a real timezone (Hermes' UTC quirk on Android emulators,
// stale iOS builds, etc). It's still derived from real device
// data — the user's device locale — not a random default, so the
// resulting city is at least the correct country.
//
// The first two layers cover every common IANA timezone. The
// heuristic handles long-tail zones ("America/Argentina/Buenos_Aires"
// → "Buenos Aires"). The country table is the safety net.
//
// No external library; this list is hand-curated. IANA only adds
// zones, doesn't rename them, and the ISO 3166 country list is
// stable, so these tables are durable.

const ZONE_TO_CITY: Record<string, string> = {
  // ── Africa ──
  'Africa/Abidjan': 'Abidjan',
  'Africa/Accra': 'Accra',
  'Africa/Addis_Ababa': 'Addis Ababa',
  'Africa/Algiers': 'Algiers',
  'Africa/Cairo': 'Cairo',
  'Africa/Casablanca': 'Casablanca',
  'Africa/Dar_es_Salaam': 'Dar es Salaam',
  'Africa/Johannesburg': 'Johannesburg',
  'Africa/Khartoum': 'Khartoum',
  'Africa/Lagos': 'Lagos',
  'Africa/Nairobi': 'Nairobi',
  'Africa/Tunis': 'Tunis',

  // ── Americas (North) ──
  'America/Anchorage': 'Anchorage',
  'America/Chicago': 'Chicago',
  'America/Denver': 'Denver',
  'America/Detroit': 'Detroit',
  'America/Halifax': 'Halifax',
  'America/Los_Angeles': 'Los Angeles',
  'America/Mexico_City': 'Mexico City',
  'America/New_York': 'New York',
  'America/Phoenix': 'Phoenix',
  'America/Toronto': 'Toronto',
  'America/Vancouver': 'Vancouver',
  'America/Whitehorse': 'Whitehorse',
  'America/Winnipeg': 'Winnipeg',

  // ── Americas (Central / South) ──
  'America/Bogota': 'Bogotá',
  'America/Buenos_Aires': 'Buenos Aires',
  'America/Caracas': 'Caracas',
  'America/Guatemala': 'Guatemala City',
  'America/Havana': 'Havana',
  'America/Lima': 'Lima',
  'America/Montevideo': 'Montevideo',
  'America/Panama': 'Panama City',
  'America/Santiago': 'Santiago',
  'America/Sao_Paulo': 'São Paulo',
  'America/Tegucigalpa': 'Tegucigalpa',

  // ── Asia ──
  'Asia/Baghdad': 'Baghdad',
  'Asia/Bangkok': 'Bangkok',
  'Asia/Calcutta': 'Kolkata', // legacy iOS uses this for Asia/Kolkata
  'Asia/Colombo': 'Colombo',
  'Asia/Dhaka': 'Dhaka',
  'Asia/Dubai': 'Dubai',
  'Asia/Hong_Kong': 'Hong Kong',
  'Asia/Jakarta': 'Jakarta',
  'Asia/Jerusalem': 'Jerusalem',
  'Asia/Karachi': 'Karachi',
  'Asia/Kathmandu': 'Kathmandu',
  'Asia/Kolkata': 'Mumbai', // representative of pan-India weather
  'Asia/Kuala_Lumpur': 'Kuala Lumpur',
  'Asia/Manila': 'Manila',
  'Asia/Riyadh': 'Riyadh',
  'Asia/Seoul': 'Seoul',
  'Asia/Shanghai': 'Shanghai',
  'Asia/Singapore': 'Singapore',
  'Asia/Taipei': 'Taipei',
  'Asia/Tehran': 'Tehran',
  'Asia/Tokyo': 'Tokyo',
  'Asia/Vientiane': 'Vientiane',
  'Asia/Yangon': 'Yangon',
  'Asia/Yerevan': 'Yerevan',

  // ── Europe ──
  'Europe/Amsterdam': 'Amsterdam',
  'Europe/Athens': 'Athens',
  'Europe/Belgrade': 'Belgrade',
  'Europe/Berlin': 'Berlin',
  'Europe/Brussels': 'Brussels',
  'Europe/Bucharest': 'Bucharest',
  'Europe/Budapest': 'Budapest',
  'Europe/Copenhagen': 'Copenhagen',
  'Europe/Dublin': 'Dublin',
  'Europe/Helsinki': 'Helsinki',
  'Europe/Istanbul': 'Istanbul',
  'Europe/Kiev': 'Kyiv',
  'Europe/Lisbon': 'Lisbon',
  'Europe/London': 'London',
  'Europe/Madrid': 'Madrid',
  'Europe/Moscow': 'Moscow',
  'Europe/Oslo': 'Oslo',
  'Europe/Paris': 'Paris',
  'Europe/Prague': 'Prague',
  'Europe/Rome': 'Rome',
  'Europe/Stockholm': 'Stockholm',
  'Europe/Vienna': 'Vienna',
  'Europe/Warsaw': 'Warsaw',
  'Europe/Zurich': 'Zurich',

  // ── Oceania ──
  'Australia/Adelaide': 'Adelaide',
  'Australia/Brisbane': 'Brisbane',
  'Australia/Melbourne': 'Melbourne',
  'Australia/Perth': 'Perth',
  'Australia/Sydney': 'Sydney',
  'Pacific/Auckland': 'Auckland',
  'Pacific/Fiji': 'Suva',
  'Pacific/Honolulu': 'Honolulu',
  'Pacific/Tahiti': 'Papeete',
};

/**
 * ISO 3166-1 alpha-2 country code → representative city.
 *
 * True last-resort fallback when neither the native module nor
 * the Intl timezone lookup give us a real IANA zone. The country
 * comes from the device's runtime locale (`Intl.DateTimeFormat`
 * or `RNLocalize.getLocales()`), so the resulting city is at
 * least the right country — not a random default.
 *
 * We pick the most populous / most recognizable city per country
 * so the weather data Open-Meteo returns is roughly representative.
 */
const COUNTRY_TO_CITY: Record<string, string> = {
  // A
  AE: 'Dubai',
  AR: 'Buenos Aires',
  AT: 'Vienna',
  AU: 'Sydney',
  // B
  BD: 'Dhaka',
  BE: 'Brussels',
  BG: 'Sofia',
  BR: 'São Paulo',
  // C
  CA: 'Toronto',
  CH: 'Zurich',
  CL: 'Santiago',
  CN: 'Shanghai',
  CO: 'Bogotá',
  CZ: 'Prague',
  // D
  DE: 'Berlin',
  DK: 'Copenhagen',
  // E
  EG: 'Cairo',
  ES: 'Madrid',
  // F
  FI: 'Helsinki',
  FR: 'Paris',
  // G
  GB: 'London',
  GR: 'Athens',
  // H
  HK: 'Hong Kong',
  HU: 'Budapest',
  // I
  ID: 'Jakarta',
  IE: 'Dublin',
  IL: 'Jerusalem',
  IN: 'Mumbai',
  IR: 'Tehran',
  IS: 'Reykjavik',
  IT: 'Rome',
  // J
  JP: 'Tokyo',
  // K
  KE: 'Nairobi',
  KR: 'Seoul',
  // L
  LK: 'Colombo',
  // M
  MX: 'Mexico City',
  MY: 'Kuala Lumpur',
  // N
  NG: 'Lagos',
  NL: 'Amsterdam',
  NO: 'Oslo',
  NP: 'Kathmandu',
  NZ: 'Auckland',
  // P
  PE: 'Lima',
  PH: 'Manila',
  PK: 'Karachi',
  PL: 'Warsaw',
  PT: 'Lisbon',
  // R
  RO: 'Bucharest',
  RU: 'Moscow',
  // S
  SA: 'Riyadh',
  SE: 'Stockholm',
  SG: 'Singapore',
  TH: 'Bangkok',
  TR: 'Istanbul',
  TW: 'Taipei',
  // U
  UA: 'Kyiv',
  US: 'New York',
  // V
  VE: 'Caracas',
  VN: 'Hanoi',
  // Z
  ZA: 'Johannesburg',
};

/**
 * Resolve a city from an IANA timezone. Returns `null` if the
 * zone is unknown and the heuristic can't extract a plausible
 * city — caller should try the locale-based fallback.
 */
export function cityFromTimezone(timezone: string | null | undefined): string | null {
  if (!timezone) {
    return null;
  }

  // Exact match
  if (Object.prototype.hasOwnProperty.call(ZONE_TO_CITY, timezone)) {
    const c = ZONE_TO_CITY[timezone];
    return c || null;
  }

  // Heuristic: take the segment after the slash and turn underscores
  // into spaces. "America/Argentina/Buenos_Aires" → "Buenos Aires".
  const parts = timezone.split('/');
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].replace(/_/g, ' ').trim();
    if (last.length > 0 && last.toLowerCase() !== 'utc') {
      return last;
    }
  }
  return null;
}

/**
 * True last-resort fallback. Reads the device's runtime locale
 * (e.g. "en-IN" via Intl, or via RNLocalize when the native
 * module is linked) and maps the country code to a representative
 * city. Returns null if no locale or no mapping exists.
 */
export function cityFromLocale(
  locale: string | null | undefined,
): string | null {
  if (!locale) {
    return null;
  }
  // Locale shape: "en", "en-IN", "en_IN", "zh-Hant-TW"
  const parts = locale.replace(/_/g, '-').split('-');
  // Last segment that's 2 letters = country code
  for (let i = parts.length - 1; i >= 1; i--) {
    const seg = parts[i].toUpperCase();
    if (seg.length === 2 && COUNTRY_TO_CITY[seg]) {
      return COUNTRY_TO_CITY[seg];
    }
  }
  return null;
}
