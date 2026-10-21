/**
 * `toRenderableImageUri` — a stored image path is not yet a URI.
 *
 * The history store holds BOTH kinds of image: catalogue artwork (a
 * remote `https://` URL) and the resume frame (a LOCAL path written by
 * the native capture into the app's `filesDir`).
 *
 * An image loader parses `/data/user/0/…` as a scheme-less URI and
 * fails, so a card holding a perfectly good captured frame fell back to
 * its grey placeholder. A local path needs the `file://` scheme; a remote
 * URL must be left exactly as it is, because `file://https://…` names no
 * file at all.
 */

import {toRenderableImageUri} from '../../src/utils/mediaUri';

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
