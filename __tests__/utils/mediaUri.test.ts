/**
 * `withCacheToken` — the cache-busting token goes on the END of the URI,
 * with the right separator.
 *
 * ## Why it exists
 *
 * The search tile builds its thumbnail URI as
 * `'file://' + thumbnailPath + '?t=' + lastPlayedAt`. Two things were wrong
 * with that, and they were fixed in two places:
 *
 *  1. the `file://` prefix — `file://https://…` names no file at all, so
 *     every REMOTE catalogue thumbnail in the search results failed to
 *     render. `toRenderableImageUri` decides whether a scheme is needed;
 *  2. the separator — a URL that already carries a query needs `&`, not a
 *     second `?`.
 *
 * This function owns (2). It deliberately does NOT touch the scheme: adding
 * `file://` here would put the bug back in a place that looks authoritative.
 */

import {
  displayNameFromUri,
  extensionOf,
  mediaTypeFromExtension,
  mediaTypeFromUri,
  toRenderableImageUri,
  withCacheToken,
} from '../../src/utils/mediaUri';

describe('toRenderableImageUri', () => {
  it('leaves a remote URL alone', () => {
    const remote = 'https://archive.org/services/img/TheRifle-UsmcTrainingFilm1960s';
    expect(toRenderableImageUri(remote)).toBe(remote);
  });

  it('leaves an http URL alone', () => {
    expect(toRenderableImageUri('http://example.test/a.jpg')).toBe(
      'http://example.test/a.jpg',
    );
  });

  it('gives a local path the file:// scheme', () => {
    // A captured resume frame: the native writes it into filesDir.
    expect(
      toRenderableImageUri(
        '/data/user/0/com.simba.player/files/simba-resume-thumbs/frame_1_30000.jpg',
      ),
    ).toBe(
      'file:///data/user/0/com.simba.player/files/simba-resume-thumbs/frame_1_30000.jpg',
    );
  });

  it('does not double-prefix a path that already carries a scheme', () => {
    expect(toRenderableImageUri('file:///data/a.jpg')).toBe('file:///data/a.jpg');
    expect(toRenderableImageUri('content://media/external/video/1')).toBe(
      'content://media/external/video/1',
    );
  });

  it('returns undefined for nothing', () => {
    expect(toRenderableImageUri(undefined)).toBeUndefined();
    expect(toRenderableImageUri(null)).toBeUndefined();
    expect(toRenderableImageUri('')).toBeUndefined();
  });
});

describe('withCacheToken', () => {
  it('appends the token with ? when the URI has no query', () => {
    expect(withCacheToken('file:///data/a.jpg', '2026-10-26T10:00:00Z')).toBe(
      'file:///data/a.jpg?t=2026-10-26T10%3A00%3A00Z',
    );
  });

  it('appends the token with & when the URI already carries a query', () => {
    // A second `?` would name a query parameter called
    // `?t`, which is not a thing.
    expect(withCacheToken('https://example.test/a.jpg?w=200', 'x')).toBe(
      'https://example.test/a.jpg?w=200&t=x',
    );
  });

  it('encodes the token', () => {
    expect(withCacheToken('file:///data/a.jpg', 'a b&c=d')).toBe(
      'file:///data/a.jpg?t=a%20b%26c%3Dd',
    );
  });

  it('does NOT add a file:// scheme', () => {
    // The scheme is `toRenderableImageUri`'s decision. Adding it here would
    // put `file://https://…` — a path that names no file — back into the
    // one function that looks authoritative about image URIs.
    const uri = withCacheToken('https://example.test/a.jpg', 'x');

    expect(uri).toBe('https://example.test/a.jpg?t=x');
    expect(uri).not.toMatch(/^file:/i);
  });

  it('composes with toRenderableImageUri into a URI an image loader can fetch', () => {
    // The whole point: a LOCAL frame gets a scheme, a REMOTE url does not,
    // and both end up as a fetchable URI.
    //
    // `toRenderableImageUri` returns `string | undefined` — undefined
    // means "there is no image at all" — so the composition is guarded
    // exactly as the tile guards it.
    const local = toRenderableImageUri(
      '/data/user/0/com.simba.player/files/x.jpg',
    );
    const remote = toRenderableImageUri(
      'https://archive.org/services/img/TheRifle',
    );

    expect(local).toBeDefined();
    expect(remote).toBeDefined();
    expect(withCacheToken(local!, 'v1')).toBe(
      'file:///data/user/0/com.simba.player/files/x.jpg?t=v1',
    );
    expect(withCacheToken(remote!, 'v1')).toBe(
      'https://archive.org/services/img/TheRifle?t=v1',
    );
  });
});

/**
 * The local-media facts a URI carries: which lane, and what it is called.
 *
 * These used to live in `services/fileService` (picker + folder browser)
 * and AGAIN in the lib's private `useOpenFromUrl` (deep links). Two
 * tables, two chances to drift — and the deep-link one is unreachable
 * from the app, so the app had to copy it to use it at all.
 */
describe('the local-media facts a URI carries', () => {
  it('classifies by extension', () => {
    expect(mediaTypeFromUri('file:///movies/namus-kanla-yazilir.mkv')).toBe(
      'video',
    );
    expect(mediaTypeFromUri('file:///podcasts/can-ai.mp3')).toBe('audio');
  });

  it('falls back to the video lane when the URI has no extension', () => {
    // A `content://` share-sheet URI has none, and the video lane is the
    // one that can show a picture.
    expect(mediaTypeFromUri('content://media/external/video/media/42')).toBe(
      'video',
    );
  });

  it('says "not a media extension" rather than guessing', () => {
    // `null` is a real answer: it is what lets the picker try the MIME
    // type the provider reports BEFORE it falls back to a lane.
    expect(mediaTypeFromExtension(null)).toBeNull();
    expect(mediaTypeFromExtension('txt')).toBeNull();
    expect(mediaTypeFromExtension('mp4')).toBe('video');
  });

  it('reads the extension out of a percent-encoded name', () => {
    expect(extensionOf('a%20film.mp4')).toBe('mp4');
    expect(mediaTypeFromExtension(extensionOf('a%20film.mp4'))).toBe('video');
  });

  it('does not throw on a malformed escape', () => {
    // `decodeURIComponent('100%.mp4')` raises. A classifier that crashes
    // on a weird filename is worse than one that guesses.
    expect(() => extensionOf('100%.mp4')).not.toThrow();
    expect(extensionOf('100%.mp4')).toBe('mp4');
  });

  it('names a URI after its basename, without the extension', () => {
    expect(displayNameFromUri('file:///movies/namus-kanla-yazilir.mkv')).toBe(
      'namus-kanla-yazilir',
    );
    expect(displayNameFromUri('file:///movies/namus%20kanla.mkv')).toBe(
      'namus kanla',
    );
  });

  it('falls back when there is no usable name', () => {
    expect(displayNameFromUri('file:///')).toBe('Shared File');
  });
});
