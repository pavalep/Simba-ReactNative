import {Share} from 'react-native';
import {PROJECT_URL} from '../constants/links';

/**
 * P56 (56.1) — Share-link generation.
 *
 * Builds simbaplayer:// deep links so a shared item opens the right
 * screen when the receiver has the app, plus the project's GitHub as
 * the link that always resolves.
 *
 * The route → path table mirrors src/navigation/linking.ts — keep in sync.
 *
 * 2026-11-12: the web fallback used to be `https://simbaplayer.app/<path>`.
 * **There is no such website**, so a shared link sent a recipient to a
 * domain that does not exist — a dead link in the share sheet. The
 * fallback is now the project's GitHub, which is where the app lives.
 * There is no per-item web URL to point at until the project has a
 * website of its own; the deep link still carries the item.
 *
 * The scheme is declared in `android/app/src/main/AndroidManifest.xml`
 * on `MainActivity`, without which Android never delivers the intent.
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
  
  SongScreen: 'song',
  RadioScreen: 'radio/:initialTab?',
  LiveTVScreen: 'tv/:categoryId?',
  AudiobookDetail: 'audiobook/:bookId',
  ArchiveItemDetail: 'archive-item/:identifier',
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

/**
 * The link that always resolves: the project's GitHub.
 *
 * It replaced `https://simbaplayer.app/<path>`, which pointed at a
 * website that does not exist. Until the project has a site of its
 * own there is no per-item web URL, so this is the project's home and
 * the deep link beside it is what carries the item.
 */
export function buildFallbackUrl(): string {
  return PROJECT_URL;
}

/** Open the native share sheet with the deep link + the project link. */
export async function shareContent(target: ShareTarget): Promise<void> {
  try {
    const deepLink = buildShareUrl(target);
    const fallback = buildFallbackUrl();
    const lines = [target.title];
    if (target.subtitle) lines.push(target.subtitle);
    if (deepLink) lines.push(deepLink);
    if (fallback && fallback !== deepLink) lines.push(fallback);
    await Share.share({
      message: lines.join('\n'),
      title: `${target.title} — Simba Player`,
    });
  } catch {
    // user cancelled share
  }
}
