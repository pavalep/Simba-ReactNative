/**
 * `resolveMediaArtwork` — the ONE owner of "which artwork do we show".
 *
 * ## Why this is a unit test and not only a component test
 *
 * The rule is a PRECEDENCE rule, and precedence is the thing that
 * breaks. Three surfaces wrote it out longhand
 * (`resumeThumbnailPath || thumbnailPath`) and the fourth — the
 * Bookmarks rail — read only `thumbnailPath`, so a bookmark of a film
 * with no catalogue art showed a placeholder glyph while the app was
 * holding a perfectly good frame of that film on disk.
 *
 * A component test that renders a rail and asserts "there is an image"
 * would have been green against that defect. These assertions pin the
 * ORDER, so a future change that flips it, drops the fallback, or
 * treats an empty string as artwork fails here first.
 */

import {resolveMediaArtwork} from '../../src/utils/mediaArtwork';

const FRAME =
  '/data/user/0/com.simba.player/files/simba-resume-thumbs/frame_1_300000.jpg';
const POSTER = 'https://archive.org/services/img/TheRifle-UsmcTrainingFilm1960s';

describe('resolveMediaArtwork', () => {
  it('prefers the captured frame over the catalogue poster', () => {
    // The rule: the artwork says what the film IS, the frame says WHERE
    // IN IT YOU WERE — and every surface that shows a position is
    // selling the position.
    expect(
      resolveMediaArtwork({
        resumeThumbnailPath: FRAME,
        thumbnailPath: POSTER,
      }),
    ).toBe(FRAME);
  });

  it('falls back to the catalogue poster when there is no captured frame', () => {
    // A first play: nothing has been captured yet, so the poster is the
    // best picture there is.
    expect(resolveMediaArtwork({thumbnailPath: POSTER})).toBe(POSTER);
  });

  it('uses the captured frame when there is NO catalogue art at all', () => {
    // This is the defect. The Bookmarks rail read only `thumbnailPath`,
    // so this exact record drew a placeholder gold glyph while the
    // frame sat on disk.
    expect(resolveMediaArtwork({resumeThumbnailPath: FRAME})).toBe(FRAME);
  });

  it('returns undefined when the record has no artwork at all', () => {
    // `undefined`, not `''` — every caller renders a placeholder for it.
    expect(resolveMediaArtwork({})).toBeUndefined();
    expect(resolveMediaArtwork({thumbnailPath: ''})).toBeUndefined();
    expect(resolveMediaArtwork({resumeThumbnailPath: ''})).toBeUndefined();
  });

  it('treats an empty captured frame as "no frame" rather than as artwork', () => {
    // A blank path is not a picture. Passing it on would leave every
    // caller deciding whether `''` means "draw nothing".
    expect(
      resolveMediaArtwork({resumeThumbnailPath: '', thumbnailPath: POSTER}),
    ).toBe(POSTER);
  });

  it('survives a missing record', () => {
    expect(resolveMediaArtwork(null)).toBeUndefined();
    expect(resolveMediaArtwork(undefined)).toBeUndefined();
  });
});
