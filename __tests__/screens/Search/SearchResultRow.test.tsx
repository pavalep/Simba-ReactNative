/**
 * `SearchResultRow` — the artwork URI.
 *
 * ## The defect this pins
 *
 * The search tile used to build its image URI as
 *
 * ```ts
 * 'file://' + item.thumbnailPath + '?t=' + encodeURIComponent(lastPlayedAt)
 * ```
 *
 * — unconditionally. But a search result's `thumbnailPath` is either a
 * REMOTE catalogue URL (archive.org's `services/img/{id}`, a CDN cover) or
 * a LOCAL captured frame, and the two need opposite spellings:
 * `file://https://…` names no file at all, so every remote thumbnail in the
 * search results silently failed to render.
 *
 * `MediaRailCard` has always handled this correctly with
 * `toRenderableImageUri`. The search tile had its own inline version, and
 * that version was wrong.
 *
 * ## Why the tile is gone but the contract is not
 *
 * 2026-11-12 (SEARCH_PAGE_REDESIGN): the tile — a poster card in a
 * 2-column grid, one of four row grammars on the page — was deleted, and
 * every result now draws the one row (`SearchResultRow`). The URI
 * contract is still worth pinning, and it now lives in the app's own
 * owner (`utils/mediaUri`), so this test asserts that the ROW asks that
 * owner for the URI rather than building one itself.
 *
 * ## What is mocked, and why
 *
 * Only the two seams the tile owns no business in a unit test: the QUEUE
 * actions (which reach into the player's queue) and the ACTIONS SHEET (a
 * modal). The URI computation itself is the real code — a test that stubbed
 * `toRenderableImageUri` would only prove that a value reached a function
 * it had just been told what to return.
 */

import React from 'react';
import {render} from '@testing-library/react-native';
import {ThemeProvider} from '../../../src/theme';
import {SearchResultRow} from '../../../src/screens/Search/components/SearchResultRow';

jest.mock('../../../src/components/sheets/MediaActionsSheet/useQueueActions', () => ({
  useQueueActions: () => ({playNext: jest.fn(), addToQueue: jest.fn()}),
}));

jest.mock(
  '../../../src/components/sheets/MediaActionsSheet/MediaActionsSheet',
  () => ({MediaActionsSheet: () => null}),
);

const PLAYED_AT = '2026-10-26T10:00:00Z';
const TOKEN = '2026-10-26T10%3A00%3A00Z';

const REMOTE_ART =
  'https://archive.org/services/img/TheRifle-UsmcTrainingFilm1960s';
const LOCAL_FRAME =
  '/data/user/0/com.simba.player/files/simba-resume-thumbs/frame_1_30000.jpg';

interface HostNode {
  type?: string;
  props?: Record<string, unknown>;
  children?: HostNode[] | null;
}

/**
 * React Native's own `Image` lands in the host tree as a host element of
 * that type, carrying its `source` prop — which is how the image-URI
 * contract is asserted.
 */
function findByType(node: HostNode | null, type: string): HostNode | null {
  if (!node) return null;
  if (node.type === type) return node;
  for (const child of node.children ?? []) {
    const found = findByType(child, type);
    if (found) return found;
  }
  return null;
}

async function renderRow(
  props: Partial<React.ComponentProps<typeof SearchResultRow>> = {},
) {
  const result = await render(
    <ThemeProvider>
      <SearchResultRow title="The Rifle" onPress={jest.fn()} {...props} />
    </ThemeProvider>,
  );

  const tree = result.toJSON() as HostNode | null;
  return {result, image: findByType(tree, 'Image')};
}

describe('SearchResultRow — the artwork URI', () => {
  it('leaves a REMOTE catalogue URL alone', async () => {
    // The regression. `file://https://…` names no file, so the row fell
    // back to its placeholder glyph for every remote thumbnail.
    const {image} = await renderRow({
      artwork: REMOTE_ART,
      cacheToken: PLAYED_AT,
    });

    expect(image).not.toBeNull();
    const uri = (image!.props!.source as {uri: string}).uri;
    expect(uri).toBe(`${REMOTE_ART}?t=${TOKEN}`);
    expect(uri).not.toMatch(/^file:/i);
  });

  it('gives a LOCAL captured frame the file:// scheme', async () => {
    const {image} = await renderRow({
      artwork: LOCAL_FRAME,
      cacheToken: PLAYED_AT,
    });

    const uri = (image!.props!.source as {uri: string}).uri;
    expect(uri).toBe(`file://${LOCAL_FRAME}?t=${TOKEN}`);
  });

  it('does not double-prefix a path that already carries a scheme', async () => {
    const {image} = await renderRow({
      artwork: 'file:///data/a.jpg',
      cacheToken: PLAYED_AT,
    });

    const uri = (image!.props!.source as {uri: string}).uri;
    expect(uri).toBe(`file:///data/a.jpg?t=${TOKEN}`);
    expect(uri).not.toContain('file://file://');
  });

  it('uses & when the remote URL already carries a query', async () => {
    const {image} = await renderRow({
      artwork: 'https://example.test/a.jpg?w=200',
      cacheToken: PLAYED_AT,
    });

    const uri = (image!.props!.source as {uri: string}).uri;
    expect(uri).toBe(`https://example.test/a.jpg?w=200&t=${TOKEN}`);
  });

  it('renders no image at all when there is no thumbnail', async () => {
    // A control whose handler is a fallback renders nothing — the
    // placeholder glyph, not an image pointing at an empty URI.
    const {image} = await renderRow({artwork: undefined});

    expect(image).toBeNull();
  });

  it('renders no image when the thumbnail path is an empty string', async () => {
    const {image} = await renderRow({artwork: ''});

    expect(image).toBeNull();
  });

  it('draws no cache token when the result has no date', async () => {
    const {image} = await renderRow({artwork: REMOTE_ART});

    const uri = (image!.props!.source as {uri: string}).uri;
    expect(uri).toBe(REMOTE_ART);
  });
});
