// ─── Live TV — the channel row's data ─────────────────────────────────
//
// ONE owner for the shape a channel is drawn in, for the way a channel is
// CLASSIFIED when it is queued, launched or bookmarked, and for the link a
// share produces.
//
// It used to live in three places:
//
//   • `components/ChannelCard.tsx` — the row shape and its subtitle;
//   • `components/LiveTVContent.tsx` — the launch payload and the share
//     link;
//   • `components/LiveTVFavoritesScreen.tsx` — a SECOND launch payload
//     (without the kind) and a SECOND share link (one the `tv/:categoryId?`
//     path cannot parse).
//
// So the same channel was classified differently depending on which screen
// you tapped it from, and the favourites screen's shared link landed the
// recipient on the Live TV browser with no channel at all.
//
// THE RULES THAT ARE NOT HERE
// ---------------------------
// The adapter owns the wire shape (`src/infrastructure/api/iptv/`), the
// favourite store owns the persisted shape (`src/state`), and the queue
// wrapper owns the queue call and its toast (`src/hooks/useQueueActions`).

import {resolveStreamType} from '../../../infrastructure/player';
import type {IPTVChannelResult} from '../../../types/api';
import type {LiveFavoriteItem} from '../../../state';
import type {QueueableItem} from '../../../types/media';
import type {ShareTarget} from '../../../services/shareService';

export interface ChannelRow {
  id: string;
  name: string;
  url: string;
  image: string; // logo
  subtitle: string; // "Sports · US"
  /**
   * The request headers the playlist declared for this stream, if any.
   *
   * They are part of the channel, not of the app: they say how the
   * SOURCE wants its stream fetched, and a launch that dropped them
   * asked a provider that checks them for a stream it would refuse.
   */
  headers?: Record<string, string>;
}

/**
 * The channel's subtitle — its category and its country.
 *
 * The rule lives here so the browse row and the favourites row cannot
 * disagree about it: the favourites store persists the subtitle the
 * browser wrote, and this rebuilds it from the channel itself.
 */
 function channelSubtitle(channel: {
  category?: string;
  country?: string;
}): string {
  return [channel.category, channel.country].filter(Boolean).join(' · ');
}

export function toRow(channel: IPTVChannelResult): ChannelRow {
  return {
    id: channel.id,
    name: channel.name,
    url: channel.url,
    image: channel.image || '',
    subtitle: channelSubtitle(channel),
    ...(channel.headers ? {headers: channel.headers} : {}),
  };
}

/** A saved favourite, in the row shape. */
export function favToRow(fav: LiveFavoriteItem): ChannelRow {
  return {
    id: fav.id,
    name: fav.name,
    url: fav.url,
    image: fav.image,
    subtitle: fav.subtitle,
    // A saved channel keeps the headers it was saved with: a favourite
    // of a stream whose provider checks its User-Agent has to play the
    // same way the browser played it.
    ...(fav.headers ? {headers: fav.headers} : {}),
  };
}

/**
 * The queueable form of a TV channel.
 *
 * A channel IS a playable stream URL, so it can be played next and queued.
 * It could not do either before this screen's migration: the row menu
 * offered "Add to Playlist" — which the app's playlist rule REFUSES for
 * live TV (`PLAYLIST_ALLOWED_MEDIA_KINDS` in `src/types/playlist.ts`:
 * "Radio, live TV, audiobooks, archives … stay outside the playlist domain
 * even when their playback lane happens to match - a lane is not a
 * permission") — and offered no queue action at all. A control that cannot
 * act must not occupy space, and a missing control that can was missing.
 *
 * The classification is the app's canonical one:
 *
 *   source    'api'    — the channel came from a catalogue.
 *   type      'live-tv'— the KIND. The app labels it (`MEDIA_KIND_LABELS`).
 *   mediaType 'video'  — the LANE, derived from the kind
 *                         (`mediaKindToLane('live-tv') === 'video'`).
 *   provider  'iptv'   — the adapter's own name (`infrastructure/api/iptv`).
 */
export function channelQueueItem(row: ChannelRow): QueueableItem {
  return {
    uri: row.url,
    title: row.name,
    duration: 0,
    source: 'api',
    type: 'live-tv',
    mediaType: 'video',
    provider: 'iptv',
  };
}

/**
 * The launch payload for a channel.
 *
 * ONE payload for both screens. The favourites screen used to launch a
 * channel WITHOUT its kind, so the seam defaulted the kind to the lane and
 * the channel was recorded in Recently Played as a plain video instead of
 * 'live-tv' — and the app HAS a label for it (`src/types/media.ts`:
 * 'live-tv' → 'Live TV').
 */
export function channelLaunchOptions(row: ChannelRow) {
  return {
    uri: row.url,
    title: row.name,
    // The LANE comes from the app's own mapping, not from a literal.
    type: resolveStreamType('live-tv'),
    // The KIND and the LANE, so the seam records the channel as what it is.
    mediaKind: 'live-tv' as const,
    mediaLane: 'video' as const,
    ...(row.image ? {thumbnailPath: row.image} : {}),
    // The headers the playlist declared for this stream. They ride the
    // LAUNCH, because they are how the source wants the stream fetched.
    ...(row.headers ? {headers: row.headers} : {}),
  };
}

/**
 * The share target for a channel.
 *
 * ONE target for both screens. It is `SongScreen` — the screen that
 * parses `fileUri` and `title` (`navigation/linking.ts`) — because the
 * Live TV path is `tv/:categoryId?`, which parses NEITHER. The favourites
 * screen used to send `route: 'LiveTVScreen'` with `fileUri`/`fileTitle`,
 * so the shared link became `simbaplayer://tv?fileUri=…` and the
 * recipient landed on the Live TV browser with no channel at all. The
 * Radio twin of this row was fixed to `SongScreen` in Wave B13; this is
 * the same fix.
 */
export function channelShareTarget(row: ChannelRow): ShareTarget {
  return {
    route: 'SongScreen',
    params: {fileUri: row.url, title: row.name, source: 'iptv'},
    title: row.name,
    subtitle: row.subtitle,
  };
}
