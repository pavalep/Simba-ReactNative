/**
 * `HomeBookmarksList` — WHICH PICTURE the Bookmarks rail draws.
 *
 * ## The defect this pins
 *
 * The Bookmarks row read
 *
 * ```tsx
 * imageUri={item.thumbnailPath}
 * ```
 *
 * while the Recently Played row above it read
 *
 * ```tsx
 * imageUri={item.resumeThumbnailPath || item.thumbnailPath}
 * ```
 *
 * and the resume prompt read the same rule. The app CAPTURES a frame of
 * the video at the position the user stopped (`captureFrame` →
 * `resumeThumbnailPath`) and keeps it on disk — but the Bookmarks row
 * never looked at it.
 *
 * The visible consequence: a bookmark of a film with no catalogue art
 * showed a gold placeholder glyph, on a screen where the very same film
 * in the rail directly above it showed a real still.
 *
 * ## Why the assertion is on the IMAGE SOURCE, not on "an image exists"
 *
 * "There is an `<Image>` in the tree" would have been GREEN against the
 * defect — the placeholder branch draws a glyph, and a rail that found
 * *some* image would pass. These assertions name the URI that was
 * drawn, so the test fails if the row falls back to the poster or to
 * the placeholder while a captured frame is available.
 *
 * The local frame carries the `file://` scheme because
 * `MediaRailCard` runs every path through `toRenderableImageUri` — a
 * bare `/data/…` path is not a URI and an image loader fails on it.
 */

import React from 'react';
import {render} from '@testing-library/react-native';
import {ThemeProvider} from '../../../src/theme';
import {HomeBookmarksList} from '../../../src/screens/Home/components/HomeBookmarksList';
import type {Bookmark} from '../../../src/state/bookmarksStore';

const FRAME =
  '/data/user/0/com.simba.player/files/simba-resume-thumbs/frame_1_300000.jpg';
const RENDERED_FRAME = `file://${FRAME}`;
const POSTER = 'https://archive.org/services/img/TheRifle-UsmcTrainingFilm1960s';

function makeBookmark(over: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'bookmark-1',
    fileUri: 'file:///movies/the-rifle.mp4',
    title: 'The Rifle',
    position: 300,
    duration: 1318,
    createdAt: '2026-10-27T00:00:00.000Z',
    label: '',
    mediaType: 'video',
    type: 'movie',
    source: 'local',
    ...over,
  };
}

async function renderRail(items: Bookmark[]) {
  return await render(
    <ThemeProvider>
      <HomeBookmarksList
        items={items}
        onPress={jest.fn()}
        onRemove={jest.fn()}
      />
    </ThemeProvider>,
  );
}

/**
 * Every image URI the rail actually drew.
 *
 * RNTL v14 does not expose the root's query API here, so the host tree
 * from `toJSON()` is walked directly. `MediaImage` renders a host
 * `Image` whose `source` is `{uri}`.
 */
function drawnImageUris(node: unknown): string[] {
  const uris: string[] = [];

  const walk = (current: unknown): void => {
    if (!current || typeof current !== 'object') return;
    if (Array.isArray(current)) {
      current.forEach(walk);
      return;
    }
    const element = current as {
      type?: string;
      props?: {source?: {uri?: string}};
      children?: unknown;
    };
    if (element.type === 'Image' && element.props?.source?.uri) {
      uris.push(element.props.source.uri);
    }
    if (element.children) walk(element.children);
  };

  walk(node);
  return uris;
}

describe('HomeBookmarksList — the artwork it draws', () => {
  it('draws the captured frame when the bookmark has one and no catalogue art', async () => {
    // THE REGRESSION. Before the fix this row read `thumbnailPath` only,
    // so this exact bookmark drew the placeholder glyph.
    const {toJSON} = await renderRail([
      makeBookmark({resumeThumbnailPath: FRAME}),
    ]);

    expect(drawnImageUris(toJSON())).toEqual([RENDERED_FRAME]);
  });

  it('prefers the captured frame over the catalogue poster', async () => {
    // The same precedence the Recently Played rail and the resume prompt
    // already follow.
    const {toJSON} = await renderRail([
      makeBookmark({resumeThumbnailPath: FRAME, thumbnailPath: POSTER}),
    ]);

    expect(drawnImageUris(toJSON())).toEqual([RENDERED_FRAME]);
  });

  it('falls back to the catalogue poster when no frame was captured', async () => {
    const {toJSON} = await renderRail([
      makeBookmark({thumbnailPath: POSTER}),
    ]);

    expect(drawnImageUris(toJSON())).toEqual([POSTER]);
  });

  it('draws NO image when the bookmark has neither — the placeholder path', async () => {
    // The counterweight to the first test: the fix must not invent a
    // picture where there is genuinely none.
    const {toJSON} = await renderRail([makeBookmark()]);

    expect(drawnImageUris(toJSON())).toEqual([]);
  });
});
