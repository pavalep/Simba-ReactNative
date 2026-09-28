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
 * Mounting: this controller lives where the chrome is mounted.
 * Today that's inside NowPlayingScreen (the W2 chrome
 * composition). W4 will hoist it to the V19 SimbaPlayer root
 * so the visibility state survives screen navigation.
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
  const {opacity} = useChromeAutoHide();

  // `pointerEvents` follows visibility: when chrome is hidden
  // (opacity 0), taps pass through to the VideoSurface so the
  // user can tap-anywhere to re-show. When chrome is visible
  // (opacity 1), the chrome owns the taps.
  // Note: we don't dynamically toggle pointerEvents here
  // because Animated.Value isn't readable synchronously inside
  // the render path; instead we always let the chrome children
  // handle their own pointerEvents (the fade is purely visual).
  return (
    <Animated.View
      {...rest}
      style={[styles.container, style, {opacity}]}
      pointerEvents="box-none"
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
