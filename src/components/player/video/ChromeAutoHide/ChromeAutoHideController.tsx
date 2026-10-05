/**
 * V19 W3.5.1 + W7.5 — `ChromeAutoHideController`.
 *
 * Wraps the chrome subtree with a single `Animated.View` that drives
 * the opacity AND a short travel from `useChromeAutoHide`. Children
 * (TransportBar, VideoTitleOverlay, NextUpOverlay, …) render normally
 * inside the wrapper; their opacity is NOT individually animated — the
 * whole chrome moves as a single unit, which avoids the visual chaos of
 * partially-hidden transport controls.
 *
 * ## Why it is mounted twice
 *
 * The chrome occupies two regions of the screen: an overlay group over
 * the surface (title, loading, error, next-up) and the transport band
 * at the bottom. They are separate subtrees, so there are two
 * controllers — but both read the SAME `Animated.Value`s from the
 * provider, so they always move together.
 *
 * Two controllers sharing one value is fine. What produced three
 * independent visibility states (and a dead tap handler) was each
 * controller calling `useChromeAutoHide()` as a bare hook instead of
 * reading the provider's value. See `useChromeAutoHide.tsx`.
 *
 * ## Why there is a TRANSLATE and not just an opacity fade
 *
 * W7.5. A pure opacity transition reads as two static images
 * cross-dissolving, not as an element leaving the screen — which is a
 * large part of why the chrome felt inert even when it was working
 * correctly. A few pixels of travel is what makes it read as motion.
 *
 * The travel is signed per EDGE: the header rises as it hides and the
 * transport bar falls, because a bar that exits in the direction of the
 * screen edge it belongs to looks intentional, and one that exits
 * the wrong way looks like it drifted. The magnitude is deliberately
 * small — this is a 24 px phone, and a large slide reads as lag rather
 * than as polish.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3; `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md` §3.4.
 */

import * as React from 'react';
import {Animated, StyleSheet, ViewProps} from 'react-native';
import {useChromeAutoHide} from '../../../../infrastructure/player';

/**
 * How far the chrome travels as it hides, in px.
 *
 * Exported so the test suite can assert the motion is real without
 * hardcoding a magic number in two places.
 */
export const CHROME_TRAVEL_PX = 8;

export interface ChromeAutoHideControllerProps
  extends Omit<ViewProps, 'children'> {
  /**
   * The chrome subtree. The controller wraps it in an Animated.View so
   * the whole subtree fades and travels in / out as one unit.
   */
  children: React.ReactNode;
  /**
   * Which screen edge this band belongs to. Decides the SIGN of the
   * travel: the header (`'top'`) rises as it hides, the transport band
   * (`'bottom'`) falls. Defaults to `'bottom'`, which is the band the
   * chrome spends most of its life in.
   */
  edge?: 'top' | 'bottom';
}

export const ChromeAutoHideController: React.FC<
  ChromeAutoHideControllerProps
> = ({children, style, edge = 'bottom', ...rest}) => {
  const {opacity, progress, isVisible} = useChromeAutoHide();

  // A negative range on a top edge inverts the sign, so the header
  // travels UP as the chrome hides instead of down with the transport.
  const sign = edge === 'top' ? -1 : 1;

  const translateY = React.useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, sign * CHROME_TRAVEL_PX],
      }),
    [progress, sign],
  );

  // `pointerEvents` follows visibility. W6.1: the previous code left it
  // permanently `box-none` with a comment explaining that
  // `Animated.Value` "isn't readable synchronously inside the render
  // path" — but `isVisible` is a plain boolean that is. So while the
  // chrome was faded out, the invisible TransportBar still sat on top
  // of the video and swallowed the taps meant to bring the chrome back:
  // the user tapped a black-looking dead zone and nothing happened.
  //
  // `none` while hidden is also what lets `VideoSurface`'s press
  // handler receive the tap at all. `box-none` disables touches on the
  // wrapper only — the children (the transport buttons) still captured
  // them.
  return (
    <Animated.View
      {...rest}
      style={[styles.container, style, {opacity, transform: [{translateY}]}]}
      pointerEvents={isVisible ? 'box-none' : 'none'}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    // The controller itself is a non-interactive wrapper. Taps
    // pass through to children, which handle their own
    // pointerEvents.
  },
});

export default ChromeAutoHideController;
