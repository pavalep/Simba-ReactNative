/// <reference types="node" />
/**
 * `MediaImage` unit tests.
 *
 * `MediaImage` replaced `react-native-fast-image` across the app. The
 * reason is in the component's docblock and in the dependency guard at
 * the bottom of this file: FastImage is a legacy-architecture library
 * whose Android code emits events through
 * `getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter)`,
 * which React Native 0.86 refuses with a warning on every single image
 * load. That warning was the red LogBox toast sitting over the
 * player's transport row for the whole session (B-024 / B-009).
 *
 * Covers:
 *   - it draws React Native's own `Image`, not a legacy image view
 *   - a bare URL string becomes a `{uri}` source
 *   - an explicit `{uri}` source is passed through untouched
 *   - `cover` is the default resize mode (the artwork policy)
 *   - an explicit resize mode is honoured
 *   - `onLoad` and `onError` reach the caller
 *   - `accessibilityIgnoresInvertColors` is forwarded
 *   - the app does not depend on `react-native-fast-image` any more
 */

import * as React from 'react';
import {readFileSync} from 'fs';
import {join} from 'path';
import {render, act} from '@testing-library/react-native';
import {MediaImage} from '../../../../src/components/utility/MediaImage/MediaImage';

describe('MediaImage', () => {
  it('draws React Native\'s own Image', async () => {
    const {toJSON} = await render(<MediaImage source="https://example.test/a.jpg" />);
    const tree = toJSON();
    expect(tree).not.toBeNull();
    // The host element's type is the contract: a legacy image view would
    // render under a different name, and that is the whole point.
    expect(tree?.type).toBe('Image');
  });

  it('turns a bare URL string into a {uri} source', async () => {
    const {toJSON} = await render(
      <MediaImage source="https://example.test/a.jpg" />,
    );
    expect((toJSON() as unknown as {props: {source: {uri: string}}}).props.source).toEqual(
      {uri: 'https://example.test/a.jpg'},
    );
  });

  it('passes an explicit {uri} source through untouched', async () => {
    const {toJSON} = await render(
      <MediaImage
        source={{uri: 'https://example.test/b.jpg', headers: {Auth: 'x'}}}
      />,
    );
    expect((toJSON() as unknown as {props: {source: unknown}}).props.source).toEqual({
      uri: 'https://example.test/b.jpg',
      headers: {Auth: 'x'},
    });
  });

  it('defaults the resize mode to cover (the artwork policy)', async () => {
    const {toJSON} = await render(<MediaImage source="https://example.test/a.jpg" />);
    expect(
      (toJSON() as unknown as {props: {resizeMode?: string}}).props.resizeMode,
    ).toBe('cover');
  });

  it('honours an explicit resize mode', async () => {
    const {toJSON} = await render(
      <MediaImage source="https://example.test/a.jpg" resizeMode="contain" />,
    );
    expect(
      (toJSON() as unknown as {props: {resizeMode?: string}}).props.resizeMode,
    ).toBe('contain');
  });

  it('forwards onLoad and onError to the Image', async () => {
    const onLoad = jest.fn();
    const onError = jest.fn();
    const {getByTestId} = await render(
      <MediaImage
        source="https://example.test/a.jpg"
        onLoad={onLoad}
        onError={onError}
        testID="artwork"
      />,
    );
    const artwork = getByTestId('artwork');

    // The HOST element's own props, called directly — NOT `fireEvent`.
    // `fireEvent` walks UP the tree looking for a handler, and it finds the
    // consumer's `onLoad` on the `MediaImage` composite itself, so a
    // `MediaImage` that forwarded nothing would still pass a fireEvent
    // test. That is the "a mock that cannot fail is a lie" trap, one level
    // up: a test that cannot fail is a test that proves nothing.
    const hostOnLoad = artwork.props.onLoad as () => void;
    const hostOnError = artwork.props.onError as () => void;
    expect(typeof hostOnLoad).toBe('function');
    expect(typeof hostOnError).toBe('function');

    await act(async () => {
      hostOnLoad();
    });
    await act(async () => {
      hostOnError();
    });
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('forwards accessibilityIgnoresInvertColors', async () => {
    const {toJSON} = await render(
      <MediaImage
        source="https://example.test/a.jpg"
        accessibilityIgnoresInvertColors
      />,
    );
    expect(
      (toJSON() as unknown as {props: {accessibilityIgnoresInvertColors?: boolean}}).props
        .accessibilityIgnoresInvertColors,
    ).toBe(true);
  });

  it('the app does not depend on react-native-fast-image any more', () => {
    // The guard, not the behaviour. FastImage is unmaintained since 2020
    // and it raises RN's "getJSModule(RCTEventEmitter) is not recommended"
    // warning on every image load, which is a permanent LogBox toast over
    // the player. It will also stop working outright once the Fabric
    // interop layer is switched off. Nothing may bring it back.
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', '..', '..', '..', 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.['react-native-fast-image']).toBeUndefined();
    expect(pkg.devDependencies?.['react-native-fast-image']).toBeUndefined();
  });
});
