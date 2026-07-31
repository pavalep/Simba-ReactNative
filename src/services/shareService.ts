import {Share} from 'react-native';

/**
 * P56 (56.1) — Share-link generation.
 *
 * Builds simbaplayer:// deep links (plus an https://simbaplayer.app fallback)
 * so a shared item opens the right screen when the receiver has the app,
 * and still resolves to a usable link otherwise.
 *
 * The route → path table mirrors src/navigation/linking.ts — keep in sync.
 */

export interface ShareTarget {
  /** Root-stack route name (must exist in ROUTE_PATHS) */
  route: string;
  /** Route params — path tokens are substituted, extras become query args */
  params?: Record<string, string | number | undefined>;
  /** Primary share line (e.g. track title) */
  title: string;
  /** Secondary share line (e.g. artist name) */
  subtitle?: string;
}

const ROUTE_PATHS: Record<string, string> = {
  MusicDetail: 'music/:trackId/:source?',
  MovieDetail: 'movie/:identifier',
  PodcastDetail: 'podcast/:podcastId',
  GenreScreen: 'genre/:genre',
  ArtistScreen: 'artist/:artistName',
  AlbumScreen: 'album/:albumName/:artistName',
  PlaylistDetail: 'playlist/:playlistId',
  ArtistDetail: 'library/artist/:artistName',
  AlbumDetail: 'library/album/:albumTitle/:artistName',
  AudioPlayer: 'audio-player',
  VideoPlayer: 'video-player',
  SongScreen: 'song',
};

/** URL-encode a single segment/value. */
function encode(value: string): string {
  return encodeURIComponent(value);
}

/** Build the path + query portion shared by both URL schemes. */
function buildPathAndQuery(
  route: string,
  params?: Record<string, string | number | undefined>,
): string {
  const pattern = ROUTE_PATHS[route];
  if (!pattern) return '';

  let path = pattern;
  const query: string[] = [];

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      const str = String(value);
      if (pattern.includes(`:${key}`)) {
        path = path.replace(`:${key}?`, encode(str)).replace(`:${key}`, encode(str));
      } else {
        query.push(`${key}=${encode(str)}`);
      }
    }
  }

  // Drop leftover optional segments (e.g. ":source?" when absent)
  path = path.replace(/:([A-Za-z]+)\?/g, '');

  return query.length > 0 ? `${path}?${query.join('&')}` : path;
}

/** Build a simbaplayer:// deep link for a target. Empty when the route is unknown. */
export function buildShareUrl(target: ShareTarget): string {
  const rest = buildPathAndQuery(target.route, target.params);
  return rest ? `simbaplayer://${rest}` : '';
}

/** Build the https://simbaplayer.app fallback for a target. Empty when the route is unknown. */
export function buildHttpsUrl(target: ShareTarget): string {
  const rest = buildPathAndQuery(target.route, target.params);
  return rest ? `https://simbaplayer.app/${rest}` : '';
}

/** Open the native share sheet with the deep link + https fallback. */
export async function shareContent(target: ShareTarget): Promise<void> {
  try {
    const deepLink = buildShareUrl(target);
    const httpsLink = buildHttpsUrl(target);
    const lines = [target.title];
    if (target.subtitle) lines.push(target.subtitle);
    if (deepLink) lines.push(deepLink);
    if (httpsLink && httpsLink !== deepLink) lines.push(httpsLink);
    await Share.share({
      message: lines.join('\n'),
      title: `${target.title} — Simba Player`,
    });
  } catch {
    // user cancelled share
  }
}
