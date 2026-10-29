/**
 * `ResultTile` — the search tile's thumbnail URI.
 *
 * ## The defect this pins
 *
 * The tile built its image URI as
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
 * that version was wrong. This test pins the tile to the helper, so the two
 * cannot drift again.
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
import {ResultTile} from '../../../src/screens/Search/components/ResultTile';
import type {SearchResultItem} from '../../../src/hooks/useSearch';

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

async function renderTile(overrides: Partial<SearchResultItem> = {}) {
  const item: SearchResultItem = {
    id: 'rifle',
    title: 'The Rifle',
    group: 'videos',
    relevanceScore: 100,
    lastPlayedAt: PLAYED_AT,
    ...overrides,
  };

  const result = await render(
    <ThemeProvider>
      <ResultTile
        item={item}
        tileWidth={120}
        query="rifle"
        onPress={jest.fn()}
      />
    </ThemeProvider>,
  );

  const tree = result.toJSON() as HostNode | null;
  return {result, image: findByType(tree, 'Image')};
}

describe('ResultTile — the thumbnail URI', () => {
  it('leaves a REMOTE catalogue URL alone', async () => {
    // The regression. `file://https://…` names no file, so the tile fell
    // back to its placeholder glyph for every remote thumbnail.
    const {image} = await renderTile({thumbnailPath: REMOTE_ART});

    expect(image).not.toBeNull();
    const uri = (image!.props!.source as {uri: string}).uri;
    expect(uri).toBe(`${REMOTE_ART}?t=${TOKEN}`);
    expect(uri).not.toMatch(/^file:/i);
  });

  it('gives a LOCAL captured frame the file:// scheme', async () => {
    const {image} = await renderTile({thumbnailPath: LOCAL_FRAME});

    const uri = (image!.props!.source as {uri: string}).uri;
    expect(uri).toBe(`file://${LOCAL_FRAME}?t=${TOKEN}`);
  });

  it('does not double-prefix a path that already carries a scheme', async () => {
    const {image} = await renderTile({thumbnailPath: 'file:///data/a.jpg'});

    const uri = (image!.props!.source as {uri: string}).uri;
    expect(uri).toBe(`file:///data/a.jpg?t=${TOKEN}`);
    expect(uri).not.toContain('file://file://');
  });

  it('uses & when the remote URL already carries a query', async () => {
    const {image} = await renderTile({
      thumbnailPath: 'https://example.test/a.jpg?w=200',
    });

    const uri = (image!.props!.source as {uri: string}).uri;
    expect(uri).toBe(`https://example.test/a.jpg?w=200&t=${TOKEN}`);
  });

  it('renders no image at all when there is no thumbnail', async () => {
    // A control whose handler is a fallback renders nothing — the
    // placeholder glyph, not an image pointing at an empty URI.
    const {image} = await renderTile({thumbnailPath: undefined});

    expect(image).toBeNull();
  });

  it('renders no image when the thumbnail path is an empty string', async () => {
    const {image} = await renderTile({thumbnailPath: ''});

    expect(image).toBeNull();
  });
});
