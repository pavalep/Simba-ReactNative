/**
 * `Dialog` artwork — a stored path is not yet a URI.
 *
 * The resume prompt leads with the title's own image (Netflix, YouTube and
 * Plex all do), and for a resumed title that image is the frame the native
 * capture wrote into the app's `filesDir`:
 *
 *   /data/user/0/com.simba.player/files/simba-resume-thumbs/frame_1_30000.jpg
 *
 * The native side returns that BARE absolute path. An image loader parses a
 * scheme-less string as a URI and fails, so the dialog rendered an EMPTY
 * rectangle where the captured frame should have been. Measured on device
 * (emulator-5554, 2026-10-26): the resume prompt showed a blank white box
 * above "Continue watching?", while the very same frame rendered correctly
 * on the Recently Played card — because `MediaRailCard` already normalised
 * its URI and `Dialog` did not.
 *
 * The correction belongs at the RENDER SITE, not at the call site. `Dialog`
 * is the only place a stored path becomes an image source, so fixing it
 * there covers every caller (the resume prompt, `ConfirmDialog`, anything
 * added later). Fixing it in `AppRoot` instead would leave every other
 * caller broken and would put the knowledge of URI shapes in a screen.
 *
 * A remote catalogue URL must be left exactly as it is: `file://https://…`
 * names no file at all. `toRenderableImageUri` makes that split, and it is
 * the same helper `MediaRailCard` uses — one rule, one place.
 */

import React from 'react';
import {render} from '@testing-library/react-native';
import {ThemeProvider} from '../../../../src/theme';
import {Dialog} from '../../../../src/components/core/Dialog/Dialog';
import {ConfirmDialog} from '../../../../src/components/core/Dialog/ConfirmDialog';

// The real path the native capture writes and returns. Verbatim shape from
// `MpvBridgeModule.captureFrame` (filesDir/simba-resume-thumbs/frame_*.jpg).
const LOCAL_FRAME =
  '/data/user/0/com.simba.player/files/simba-resume-thumbs/frame_877507528_1290000.jpg';

// Catalogue artwork — a remote URL that must NOT be prefixed.
const REMOTE_ART =
  'https://archive.org/services/img/TheRifle-UsmcTrainingFilm1960s';

/**
 * Collect every `source.uri` in a rendered host tree.
 *
 * RNTL v14: `render()` returns `toJSON()`, and the host tree is the honest
 * view of what an image loader was actually handed. `UNSAFE_root` is not
 * part of the v14 surface, so the tree is walked by hand.
 */
function collectImageUris(node: unknown, out: string[] = []): string[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) collectImageUris(child, out);
    return out;
  }
  const candidate = node as {
    props?: {source?: {uri?: unknown}};
    children?: unknown;
  };
  const source = candidate.props?.source;
  if (source && typeof source.uri === 'string') {
    out.push(source.uri);
  }
  if (candidate.children) collectImageUris(candidate.children, out);
  return out;
}

/**
 * Count the image NODES in a rendered host tree.
 *
 * Not the same as counting URIs: an `<Image source={{uri: undefined}} />` is
 * a real, visible empty rectangle in the app even though it contributes no
 * URI string. The box is the artefact, so the box is what gets counted.
 */
function countImageNodes(node: unknown): number {
  if (!node || typeof node !== 'object') return 0;
  if (Array.isArray(node)) {
    return node.reduce<number>((sum, child) => sum + countImageNodes(child), 0);
  }
  const candidate = node as {
    props?: {source?: unknown};
    children?: unknown;
  };
  const own = candidate.props && 'source' in candidate.props ? 1 : 0;
  return own + countImageNodes(candidate.children);
}

async function renderDialog(imageUri?: string) {
  return render(
    <ThemeProvider>
      <Dialog
        visible
        onClose={() => {}}
        title="Continue watching?"
        message="Continue at 10:04 or start from the beginning."
        {...(imageUri == null ? {} : {imageUri})}
      />
    </ThemeProvider>,
  );
}

describe('Dialog artwork — the image source must be a URI', () => {
  it('gives a local capture path the file:// scheme', async () => {
    // THE regression. Before the fix this was the bare path, which an
    // image loader cannot resolve, so the box rendered EMPTY.
    const {toJSON} = await renderDialog(LOCAL_FRAME);

    expect(collectImageUris(toJSON())).toEqual([`file://${LOCAL_FRAME}`]);
  });

  it('leaves a remote catalogue URL alone', async () => {
    // `file://https://…` names no file at all — the mirror image of the
    // bug above, and just as broken.
    const {toJSON} = await renderDialog(REMOTE_ART);

    expect(collectImageUris(toJSON())).toEqual([REMOTE_ART]);
  });

  it('does not double-prefix a path that already carries a scheme', async () => {
    const {toJSON} = await renderDialog(`file://${LOCAL_FRAME}`);

    expect(collectImageUris(toJSON())).toEqual([`file://${LOCAL_FRAME}`]);
  });

  it('renders NO artwork box when there is no artwork', async () => {
    // An empty path must not leave an empty rectangle behind — that
    // rectangle is the exact artefact this fix removes. Counted as NODES,
    // not URIs: `<Image source={{uri: undefined}} />` is a visible empty box
    // even though it carries no URI string.
    const {toJSON} = await renderDialog();

    expect(countImageNodes(toJSON())).toBe(0);
    expect(collectImageUris(toJSON())).toEqual([]);
  });

  it('carries the resume frame through ConfirmDialog to the image', async () => {
    // The prompt the user actually meets: `useConfirmDialog` -> Dialog.
    // If the prop were dropped anywhere on that path, the box would be
    // empty again while every other test still passed.
    const {toJSON} = await render(
      <ThemeProvider>
        <ConfirmDialog
          visible
          title="Continue watching?"
          message="Continue at 10:04 or start from the beginning."
          confirmLabel="Continue"
          cancelLabel="Start from beginning"
          imageUri={LOCAL_FRAME}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      </ThemeProvider>,
    );

    expect(collectImageUris(toJSON())).toEqual([`file://${LOCAL_FRAME}`]);
  });
});
