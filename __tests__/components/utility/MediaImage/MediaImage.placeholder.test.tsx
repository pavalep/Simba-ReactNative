/// <reference types="node" />
/**
 * `MediaImage` — the placeholder contract.
 *
 * A remote artwork is a FETCH, and `Image` draws nothing until the bytes
 * arrive. So an artwork that is still on the wire — or that never arrives
 * because the publisher's host is down — was an INVISIBLE HOLE in the
 * layout. On the Podcast detail hero that hole was 120 x 120 dp of empty
 * screen; on the Home shelf's circle and on the "My Podcasts" row it was
 * the same hole, which is how a podcast followed while its cover was
 * still loading ended up with no cover anywhere.
 *
 * `MediaImage` now takes the placeholder as a prop and draws it UNDER the
 * image:
 *
 *   - the image is transparent until it has decoded, so the placeholder
 *     is what the user sees while the artwork is arriving;
 *   - a failed load draws nothing at all, so the placeholder stays;
 *   - the placeholder is dropped when the image arrives — the artwork
 *     paints over it, so there is no flash and no layout shift, and a
 *     tile cannot show through an artwork with transparency in it.
 *
 * A caller that passes NO placeholder gets exactly the old output: a bare
 * `Image` with no wrapper. This component is the app's shared artwork
 * component and most of its callers do not want a box around their image.
 */

import * as React from 'react';
import {Text, View} from 'react-native';
import {render, act} from '@testing-library/react-native';
import {MediaImage} from '../../../../src/components/utility/MediaImage/MediaImage';

describe('MediaImage — the placeholder', () => {
  it('draws the placeholder under the artwork', async () => {
    const {getByText, getByTestId} = await render(
      <MediaImage
        source="https://example.test/a.jpg"
        placeholder={<Text>loading tile</Text>}
        testID="artwork"
      />,
    );

    expect(getByText('loading tile')).toBeOnTheScreen();
    expect(getByTestId('artwork')).toBeOnTheScreen();
  });

  it('keeps the placeholder when the artwork fails to load', async () => {
    const {getByText, getByTestId} = await render(
      <MediaImage
        source="https://example.test/a.jpg"
        placeholder={<Text>loading tile</Text>}
        testID="artwork"
      />,
    );

    const artwork = getByTestId('artwork');
    await act(async () => {
      (artwork.props.onError as () => void)();
    });

    // The failure must not empty the box. The tile is the artwork's
    // "there is no picture here" state, and it stays until the artwork
    // arrives on a later mount.
    expect(getByText('loading tile')).toBeOnTheScreen();
  });

  it('drops the placeholder once the artwork has loaded', async () => {
    const {queryByText, getByTestId} = await render(
      <MediaImage
        source="https://example.test/a.jpg"
        placeholder={<Text>loading tile</Text>}
        testID="artwork"
      />,
    );

    const artwork = getByTestId('artwork');
    await act(async () => {
      (artwork.props.onLoad as () => void)();
    });

    // The tile goes away once the artwork is there. Keeping it would
    // show through an artwork with transparency in it.
    expect(queryByText('loading tile')).toBeNull();
  });

  it('gives the box the artwork\'s own size and corner radius', async () => {
    const {getByTestId} = await render(
      <MediaImage
        source="https://example.test/a.jpg"
        style={{width: 120, height: 120, borderRadius: 16}}
        placeholder={<View />}
        testID="artwork"
      />,
    );

    // The artwork is inside a box now, so the box has to carry the size
    // and the radius — and a radius needs clipping, or the artwork's
    // corners would spill over the box's.
    const box = getByTestId('artwork').parent;
    const boxStyle = Array.isArray(box?.props.style)
      ? Object.assign({}, ...box.props.style.filter(Boolean))
      : box?.props.style;
    expect(boxStyle).toMatchObject({
      width: 120,
      height: 120,
      borderRadius: 16,
      overflow: 'hidden',
    });
  });

  it('still draws a bare Image when no placeholder is given', async () => {
    // The historical output, byte for byte: no wrapper, no box.
    const {toJSON} = await render(
      <MediaImage source="https://example.test/a.jpg" />,
    );
    const tree = toJSON();
    expect(tree?.type).toBe('Image');
  });

  it('forwards onLoad and onError to the caller as well', async () => {
    const onLoad = jest.fn();
    const onError = jest.fn();
    const {getByTestId} = await render(
      <MediaImage
        source="https://example.test/a.jpg"
        placeholder={<Text>loading tile</Text>}
        onLoad={onLoad}
        onError={onError}
        testID="artwork"
      />,
    );

    const artwork = getByTestId('artwork');
    await act(async () => {
      (artwork.props.onLoad as () => void)();
    });
    await act(async () => {
      (artwork.props.onError as () => void)();
    });
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
