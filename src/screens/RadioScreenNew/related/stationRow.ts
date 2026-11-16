// ─── Radio — the station row's data ──────────────────────────────────
//
// ONE owner for the shape a station is drawn in, and for the subtitle
// text.
//
// The subtitle used to be built in TWO places with two different rules:
//
//   the browse row  →  [country, tags]        → "Germany · pop,rock,news"
//   the favourites  →  [country, tags.split(',')[0]]
//                    → "Germany · pop"
//
// So the same station read differently on two screens of the same
// feature. `stationSubtitle` is the one rule now.
//
// The rules that are NOT here: the ADAPTER owns the wire shape
// (`stationuuid` → `id`, `favicon` → `image`, `url_resolved` → `url`) and
// the favourite store owns the persisted shape.

import type {RadioStationResult} from '../../../types/api';
import type {LiveFavoriteItem} from '../../../state';
import type {RadioBrowseTag} from '../../../infrastructure/api/radioBrowser/adapter';

export interface StationRow {
  id: string;
  name: string;
  url: string;
  image: string;
  subtitle: string;
  codec?: string;
  bitrate?: number;
}

/**
 * A browse tag as a filter sheet row.
 *
 * The tag's ONLY identity is its NAME. There is no `id` field — the live
 * endpoint returns `{name, stationcount}` and the adapter maps it to
 * `{name, stationCount}` — and the filter is applied by name
 * (`params.tag = filters.genre`).
 *
 * The old code read `.id` off a shape that has none, behind an
 * `as unknown[]` cast, so every chip's key was `undefined`: the chips
 * collapsed onto one React key, the selection was never marked, and the
 * chosen value was thrown away before the request was built. The sheet
 * was inert.
 */
export function toRadioTagRow(t: RadioBrowseTag): {key: string; label: string} {
  return {key: t.name, label: t.name};
}

/**
 * The station's subtitle — the country and its first tag.
 *
 * `tags` is the raw comma-separated list off the wire
 * (`radioBrowser/adapter.ts`), so the first entry is the station's own
 * first tag and the rest are noise on a 20 dp line.
 */
export function stationSubtitle(station: {
  country?: string;
  tags?: string;
}): string {
  const firstTag = station.tags?.split(',')[0]?.trim();
  return [station.country, firstTag].filter(Boolean).join(' · ');
}

export function toRow(station: RadioStationResult): StationRow {
  return {
    id: station.id,
    name: station.name,
    url: station.url,
    image: station.image,
    subtitle: stationSubtitle(station),
    codec: station.codec,
    bitrate: station.bitrate,
  };
}

/** A saved favourite, in the row shape. */
export function favToRow(fav: LiveFavoriteItem): StationRow {
  return {
    id: fav.id,
    name: fav.name,
    url: fav.url,
    image: fav.image,
    subtitle: fav.subtitle,
    codec: fav.codec,
    bitrate: fav.bitrate,
  };
}
