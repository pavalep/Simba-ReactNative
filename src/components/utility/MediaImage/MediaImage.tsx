import React, {useState} from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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
 *
 * ## The placeholder
 *
 * A remote artwork is a FETCH, and a fetch takes time. `Image` draws
 * nothing until the bytes arrive, so an artwork that is still on the
 * wire — or that never arrives, because the publisher's host is down or
 * the CDN has expired the URL — is an INVISIBLE HOLE in the layout.
 * On the Podcast detail hero that hole was 120 x 120 dp of empty
 * screen, and the same hole appeared on the Home shelf's circle and on
 * the "My Podcasts" row when a podcast was followed while its cover
 * was still loading.
 *
 * So `MediaImage` takes the placeholder as a prop and owns the artwork's
 * three states:
 *
 *   - PENDING — the image is transparent until it decodes, so the
 *     placeholder is what the user sees while the artwork is arriving;
 *   - LOADED — the placeholder is dropped, because the artwork is
 *     there and a tile behind a transparent PNG would show through;
 *   - FAILED — the image draws nothing at all, so the placeholder stays
 *     and the box is never a hole.
 *
 * The three states belong to ONE artwork: a NEW `source` resets them,
 * because a row whose artwork URL changes must draw the new image over
 * the placeholder again, not over nothing.
 *
 * The placeholder is dropped rather than covered, and the artwork paints
 * over it in the meantime, so there is no flash and no layout shift: the
 * box is the same box in every state.
 *
 * A caller that passes no placeholder gets exactly the old output: a
 * bare `Image` with no wrapper. That matters, because this component
 * is the app's shared artwork component and most of its callers do not
 * want a box around their image.
 */
export type MediaImageSource =
  | string
  | {uri: string; headers?: Record<string, string>}
  | number;

/** The artwork's three states. */
type ArtworkState = 'pending' | 'loaded' | 'failed';

export interface MediaImageProps {
  /** The artwork: a URL, a `{uri}` object, or a bundled `require()`d asset. */
  source: MediaImageSource;
  /** How the image fills its box. Artwork is `cover` unless stated. */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  style?: StyleProp<ImageStyle>;
  /**
   * What to draw while the artwork is arriving — and what stays if it
   * never arrives. A tile, a glyph, a tint: whatever the surface
   * already uses for "no artwork yet".
   *
   * Passing one wraps the image in a box that carries the style, so
   * the artwork keeps its size, its margins and its corner radius.
   */
  placeholder?: React.ReactNode;
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
    placeholder,
    onLoad,
    onError,
    accessibilityIgnoresInvertColors,
    testID,
  }) => {
    const resolved = typeof source === 'string' ? {uri: source} : source;

    // ── The artwork's identity ────────────────────────────────────────
    // The three-state machine below belongs to ONE artwork. When the
    // caller's `source` changes, the old artwork's "loaded" must not
    // cover the new one's placeholder — so the machine restarts.
    //
    // The comparison is on the SOURCE KEY, not the `source` object: a
    // caller that builds `{uri}` inline gets a new object every render,
    // and comparing objects would reset the state on every render.
    const sourceKey =
      typeof source === 'string'
        ? source
        : typeof source === 'number'
          ? String(source)
          : (source?.uri ?? '');

    const [state, setState] = useState<ArtworkState>('pending');
    const [prevSourceKey, setPrevSourceKey] = useState(sourceKey);

    // Adjusting the state when a prop changes (React's own pattern):
    // the reset happens during this render, so the new artwork never
    // paints with the previous artwork's state — an effect would paint
    // once with the stale state first.
    if (sourceKey !== prevSourceKey) {
      setPrevSourceKey(sourceKey);
      setState('pending');
    }

    // ── No placeholder: the artwork stands alone ──────────────────────
    // The historical output, byte for byte. A caller that does not
    // want a box behind its image must not get one.
    if (!placeholder) {
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
    }

    // ── With a placeholder: a box that holds both ─────────────────────
    // The style moves to the box, so the artwork keeps its size, its
    // margins and its corner radius. A corner radius needs
    // `overflow: hidden` on the box now that the radius no longer sits
    // on the image itself.
    const box = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
    const boxStyle: ViewStyle = box.borderRadius
      ? {...box, overflow: 'hidden'}
      : box;

    return (
      <View style={boxStyle}>
        {state === 'loaded' ? null : placeholder}
        <Image
          source={resolved}
          resizeMode={resizeMode}
          // The artwork fills the box and paints over the placeholder.
          // `zIndex` makes that order explicit rather than relying on
          // the draw order of an absolutely positioned sibling.
          style={[StyleSheet.absoluteFill, {zIndex: 1}]}
          onLoad={() => {
            setState('loaded');
            onLoad?.();
          }}
          onError={() => {
            setState('failed');
            onError?.();
          }}
          accessibilityIgnoresInvertColors={accessibilityIgnoresInvertColors}
          testID={testID}
        />
      </View>
    );
  },
);

MediaImage.displayName = 'MediaImage';
