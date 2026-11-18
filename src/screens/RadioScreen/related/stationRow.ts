// ─── Radio — the station row's data ──────────────────────────────────
//
// ONE owner for the shape a station is drawn in, for the subtitle text
// and for the way a station is classified when it is queued.
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
//
// THE TAG → OPTION MAPPING IS NOT HERE EITHER
// -------------------------------------------
// It moved to `related/browseConfig.ts`, which is where the filter
// options are built — a tag is a filter option, not a station row.

import type {RadioStationResult} from '../../../types/api';
import type {LiveFavoriteItem} from '../../../state';
import type {QueueableItem} from '../../../types/media';

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

/**
 * The queueable form of a radio station.
 *
 * A station IS a playable stream URL, so it can be played next and
 * queued — which is exactly what it could NOT do before this change: the
 * station's row menu offered "Add to Playlist" (which the app's playlist
 * rule refuses for radio — see `PLAYLIST_ALLOWED_MEDIA_KINDS`) and did
 * not offer a queue action at all.
 *
 * The classification is the app's canonical one:
 *
 *   source    'api'         — the station came from a catalogue.
 *   type      'radio'       — the KIND. `radio` is a first-class kind
 *                             (`src/types/media.ts`), and it is what the
 *                             app labels a station with.
 *   mediaType 'audio'       — the LANE. It is DERIVED from the kind
 *                             (`mediaKindToLane('radio') === 'audio'`),
 *                             so the pair can never disagree.
 *   provider  'radioBrowser'— the adapter's own name (the module is
 *                             `infrastructure/api/radioBrowser`, the API
 *                             config key is `radioBrowser`). The old
 *                             value was 'radio', which named the KIND
 *                             again in the slot that names the SOURCE.
 */
export function stationQueueItem(station: {
  url: string;
  name: string;
}): QueueableItem {
  return {
    uri: station.url,
    title: station.name,
    duration: 0,
    source: 'api',
    type: 'radio',
    mediaType: 'audio',
    provider: 'radioBrowser',
  };
}
