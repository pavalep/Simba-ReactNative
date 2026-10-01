/**
 * V19 W3.5 Phase 3.5.1 — `ChromeAutoHideController`.
 *
 * Wraps the chrome subtree with a single Animated.View that
 * drives the opacity from `useChromeAutoHide`. Children
 * (TransportBar, VideoTitleOverlay, ModeControl, CaptionsToggle,
 * PiPToggle, More) render normally inside the wrapper; their
 * opacity is NOT individually animated — the whole chrome fades
 * as a single unit, which avoids the visual chaos of partially-
 * hidden transport controls.
 *
 * Mounting: this controller lives where the chrome is mounted —
 * `SimbaPlayerContent`, inside `ChromeAutoHideProvider`. It is rendered
 * twice (title/overlays over the surface, transport bar at the bottom)
 * because they occupy different regions of the screen, but both read
 * the SAME `Animated.Value` from the provider, so they always fade as
 * one unit. Two controllers sharing one value is fine; two controllers
 * each calling `useChromeAutoHide()` as a bare hook is what produced
 * three independent visibility states and a dead tap handler.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3 + TRACKER Phase 3.5.1.
 */

import * as React from 'react';
import {Animated, StyleSheet, ViewProps} from 'react-native';
import {useChromeAutoHide} from '../../../../infrastructure/player';

export interface ChromeAutoHideControllerProps
  extends Omit<ViewProps, 'children'> {
  /**
   * The chrome subtree (TransportBar, VideoTitleOverlay,
   * ModeControl, etc.). The controller wraps it in an
   * Animated.View so the whole subtree fades in / out as
   * one unit.
   */
  children: React.ReactNode;
}

export const ChromeAutoHideController: React.FC<
  ChromeAutoHideControllerProps
> = ({children, style, ...rest}) => {
  const {opacity, isVisible} = useChromeAutoHide();

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
      style={[styles.container, style, {opacity}]}
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
