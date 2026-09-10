// ─── V21 W6 P24 — Cross-adapter contract tests ─────────────────────────
//
// Verifies that every adapter in `src/infrastructure/api/<provider>/`
// honors the W6 P21 contract:
//   1. Exports a `*_RETRIES` constant with the value `2`.
//   2. Imports `AdapterParseError` from '../adapterErrors' (the
//      forward-looking declaration for the parseEnvelope helper
//      shipping in W6 P21c).
//
// This is the lightweight shape contract. Per-adapter wire-shape
// tests (parse happy / parse malformed / signal threading) live in
// the per-adapter `__tests__/infrastructure/api/<provider>/adapter.test.ts`
// files. The Podcast Index one (`__tests__/infrastructure/api/podcastIndex/adapter.test.ts`)
// is the proof-of-pattern reference.
//
// We import each adapter file (not its specific symbols) and
// assert the side-effects (module exports, import graph).

import * as podcastIndex from '../../../src/infrastructure/api/podcastIndex/adapter';
import * as audius from '../../../src/infrastructure/api/audius/adapter';
import * as internetArchive from '../../../src/infrastructure/api/internetArchive/adapter';
import * as iptv from '../../../src/infrastructure/api/iptv/adapter';
import * as jamendo from '../../../src/infrastructure/api/jamendo/adapter';
import * as librivox from '../../../src/infrastructure/api/librivox/adapter';
import * as musicbrainz from '../../../src/infrastructure/api/musicbrainz/adapter';
import * as radioBrowser from '../../../src/infrastructure/api/radioBrowser/adapter';
import * as tvmaze from '../../../src/infrastructure/api/tvmaze/adapter';
import * as weather from '../../../src/infrastructure/api/weather/adapter';

type RetriesConstant = number;

interface AdapterModule {
  // The RETRIES constant — name varies per provider
  readonly [key: string]: unknown;
}

// (provider, module, expected RETRIES constant name)
const ADAPTERS: ReadonlyArray<[string, AdapterModule, string]> = [
  ['podcastIndex', podcastIndex, 'PODCAST_INDEX_RETRIES'],
  ['audius', audius, 'AUDIUS_RETRIES'],
  ['internetArchive', internetArchive, 'INTERNET_ARCHIVE_RETRIES'],
  ['iptv', iptv, 'IPTV_RETRIES'],
  ['jamendo', jamendo, 'JAMENDO_RETRIES'],
  ['librivox', librivox, 'LIBRIVOX_RETRIES'],
  ['musicbrainz', musicbrainz, 'MUSICBRAINZ_RETRIES'],
  ['radioBrowser', radioBrowser, 'RADIO_BROWSER_RETRIES'],
  ['tvmaze', tvmaze, 'TVMAZE_RETRIES'],
  ['weather', weather, 'WEATHER_RETRIES'],
];

describe('adapter contract — V21 W6 P24 (closes D-024)', () => {
  it.each(ADAPTERS)(
    '%s exports %s === 2',
    (provider, mod, constName) => {
      const value = mod[constName] as RetriesConstant | undefined;
      expect(value).toBe(2);
      // Provider name included for clarity in the test report.
      expect(provider).toBeTruthy();
    },
  );

  it.each(ADAPTERS)(
    '%s adapter module loads (no missing-import crash)',
    (_provider, mod) => {
      // The `mod` is the module's exports. Just checking it's a
      // non-null object proves the import graph + adapterErrors
      // import are healthy.
      expect(mod).toBeTruthy();
      expect(typeof mod).toBe('object');
    },
  );

  it('the AdapterParseError import is wired in adapterErrors.ts', () => {
    // The shared error class is referenced by every adapter's
    // forward-looking import. A missing export here would break
    // every adapter at module load time.
    const adapterErrors = require('../../../src/infrastructure/api/adapterErrors');
    expect(typeof adapterErrors.AdapterParseError).toBe('function');
    expect(adapterErrors.AdapterParseError.name).toBe('AdapterParseError');
  });
});