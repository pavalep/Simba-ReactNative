// ─── Radio — the filter catalog hook ──────────────────────────────────
//
// The three filter axes (genre, country, language) are the radio-browser
// API's OWN tag lists, fetched at runtime. They are NOT a static list, so
// the browse config has to be built from them (see
// `related/browseConfig.ts` → `createRadioSectionConfig`).
//
// WHY THREE SEPARATE QUERIES
// ---------------------------
// One failing tag endpoint used to empty ALL THREE groups in the sheet,
// with no error and no retry: each group gated on its own query, so a
// country list that failed left the country group empty and the other
// two intact.
//
// THE MEASURED SHAPE OF THE THREE ENDPOINTS
// -----------------------------------------
// (Measured on 2026-11-16 and re-checked against the adapter's code on
// 2026-11-18 — see `infrastructure/api/radioBrowser/adapter.ts`.)
//
//   • `/json/tags` IGNORES its `type` parameter. `type=genre`,
//     `type=country`, `type=language` and no type at all return the
//     IDENTICAL 80 records. So the GENRE group is the whole tag list
//     ordered by station count — whose top entries (pop, music, news,
//     rock, talk, dance, hits, oldies, 80s, classical, jazz) ARE the
//     genres a listener means by "genre". The adapter still sends
//     `type=genre`, because it is the documented way to ask and a future
//     radio-browser may honour it.
//
//   • `/json/countries` answers with 225 records, TWO of which have an
//     EMPTY `name` (the ISO codes `UN` and `ZZ` — the stations that
//     report an unknown country). The strict parser rejects an empty
//     name, and a batch parser that maps the WHOLE list would void all
//     223 good ones. The adapter's MENU path
//     (`drawableBrowseTagsFromRaw`) drops only the malformed records, so
//     the country list survives.
//
//   • `/json/languages` answers with 586 records, and in its own order
//     the first ones are "1", "111", "123" — stations that report a
//     numeric language code. Both the adapter and this hook ask for
//     `order=stationcount&reverse=true`, so the list opens with english
//     (11334), german (3979), spanish (3881) and the numeric leftovers
//     sink out of the first screen.
//
// None of this is decided here: the ORDER and the DROPPING are the
// adapter's business, and this hook only asks for the lists.

import {useMemo} from 'react';
import {
  getGenres,
  getCountries,
  getLanguages,
  RADIO_BROWSER_RETRIES,
  type RadioBrowseTag,
} from '../../../infrastructure/api/radioBrowser/adapter';
import {useApiQuery} from '../../../hooks/useApiQuery';
import type {RadioTagCatalog} from '../related/browseConfig';

/**
 * How many tags each axis offers.
 *
 * 40 is the number the screen has always offered: the adapter's own
 * default for the genre list, and the same number for the two lists it
 * answers in full. The countries and languages lists are longer (225 and
 * 586 records) and are cut to the first 40 in station-count order.
 */
const TAGS_LIMIT = 40;

/**
 * The three fetched tag lists, one per axis.
 *
 * A list that has not arrived yet is an EMPTY list, not a stale one: the
 * sheet's group is empty until its own request resolves, and the other
 * two groups are unaffected.
 */
export function useRadioTags(): RadioTagCatalog {
  const genresQ = useApiQuery<RadioBrowseTag[]>({
    queryKey: ['radioBrowser', 'tags', 'genres', TAGS_LIMIT],
    queryFn: () => getGenres(TAGS_LIMIT),
    staleTime: 5 * 60_000,
    retry: RADIO_BROWSER_RETRIES,
  });
  const countriesQ = useApiQuery<RadioBrowseTag[]>({
    queryKey: ['radioBrowser', 'tags', 'countries', TAGS_LIMIT],
    queryFn: () => getCountries(TAGS_LIMIT),
    staleTime: 5 * 60_000,
    retry: RADIO_BROWSER_RETRIES,
  });
  const languagesQ = useApiQuery<RadioBrowseTag[]>({
    queryKey: ['radioBrowser', 'tags', 'languages', TAGS_LIMIT],
    queryFn: () => getLanguages(TAGS_LIMIT),
    staleTime: 5 * 60_000,
    retry: RADIO_BROWSER_RETRIES,
  });

  return useMemo<RadioTagCatalog>(
    () => ({
      genres: genresQ.data ?? [],
      countries: countriesQ.data ?? [],
      languages: languagesQ.data ?? [],
    }),
    [genresQ.data, countriesQ.data, languagesQ.data],
  );
}
