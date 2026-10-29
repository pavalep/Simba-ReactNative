import React from 'react';
import {Image, type ImageStyle, type StyleProp} from 'react-native';

/**
 * A remote artwork image.
 *
 * This component exists because the app used to render every piece of
 * artwork with `react-native-fast-image`, and that package is a
 * legacy-architecture library: its Android code emits its events through
 * `ReactContext.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter)`,
 * which React Native 0.86 refuses without a warning —
 *
 *   "getJSModule(RCTEventEmitter) is not recommended in the new
 *    architecture and will stop working with interop disabled."
 *
 * That warning is not cosmetic. It is RN telling us the library will
 * BREAK once the Fabric interop layer is switched off, and it is raised
 * on every single image load, which is why a red LogBox toast sat over
 * the player's transport row for the whole session (B-024 / B-009).
 *
 * `react-native-fast-image` has been unmaintained since 2020, so there is
 * no upstream fix to wait for. React Native's own `Image` is backed by
 * Fresco on Android, renders through the Fabric image component, and
 * raises no warning. So the app draws its artwork with `Image`, and this
 * component owns the two things every call site used to repeat:
 *
 *  - the SOURCE SHAPE — a bare URL string is enough for almost every
 *    tile, so the `{uri}` wrapper is built here rather than in 28 files;
 *  - the RESIZE POLICY — `cover` is the default for artwork, and the two
 *    call sites that need `contain` say so.
 *
 * The props FastImage invented (`priority`, `cache`) are gone with it.
 * `priority` was a Glide hint that React Native's `Image` does not
 * expose and Fresco does not need, and `cache` was FastImage's own
 * cache-control header which Fresco owns now.
 */
export type MediaImageSource =
  | string
  | {uri: string; headers?: Record<string, string>}
  | number;

export interface MediaImageProps {
  /** The artwork: a URL, a `{uri}` object, or a bundled `require()`d asset. */
  source: MediaImageSource;
  /** How the image fills its box. Artwork is `cover` unless stated. */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  style?: StyleProp<ImageStyle>;
  /** Fired once the image has decoded and is on screen. */
  onLoad?: () => void;
  /** Fired when the image could not be loaded. */
  onError?: () => void;
  /**
   * `Image` is a view, so it inherits the view accessibility props. This
   * one is used in the movie cards, where the artwork sits over the
   * brand gradient and must not be inverted with the system theme.
   */
  accessibilityIgnoresInvertColors?: boolean;
  testID?: string;
}

export const MediaImage: React.FC<MediaImageProps> = React.memo(
  ({
    source,
    resizeMode = 'cover',
    style,
    onLoad,
    onError,
    accessibilityIgnoresInvertColors,
    testID,
  }) => {
    const resolved = typeof source === 'string' ? {uri: source} : source;

    return (
      <Image
        source={resolved}
        resizeMode={resizeMode}
        style={style}
        onLoad={onLoad}
        onError={onError}
        accessibilityIgnoresInvertColors={accessibilityIgnoresInvertColors}
        testID={testID}
      />
    );
  },
);

MediaImage.displayName = 'MediaImage';
