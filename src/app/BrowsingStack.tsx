/**
 * The browsing stack's PAINTING is owned here.
 *
 * ## What this component does
 *
 * Two things want to own the window: the browsing screens, and the video.
 * They are siblings in ONE React tree now — one Activity, one root — and
 * the picture is a Fabric view IN that tree (`<SimbaVideo>`), not a native
 * surface composited beneath the whole React root.
 *
 * So the picture wins by PAINT ORDER, not by the browsing stack
 * abstaining: `AppRoot` renders `BrowsingStack` first, then the video
 * lane, then the dock. React Native paints later siblings on top, so the
 * picture composites over the screens.
 *
 * `hidden` is the second half of that arrangement, and it is NOT about
 * paint order:
 *
 *   - `pointerEvents: 'none'` stops the blanked stack from swallowing
 *     touches. An invisible-but-touchable stack over a fullscreen video
 *     would make the player look blank and feel dead — the tap that
 *     toggles the chrome would go to the screen underneath.
 *   - `opacity: 0` keeps the feed from flashing behind the video during
 *     the transition into fullscreen.
 *
 * The two properties are one decision and are set together.
 *
 * ## Why `hidden` blanks rather than unmounts
 *
 * The obvious implementation is `hidden ? null : children`. It is wrong.
 *
 * Unmounting destroys the navigator's state, so pressing back out of a
 * fullscreen video would drop the user on the app's INITIAL route instead
 * of the screen they launched from — open a title from the Movies list,
 * press back, land on Home. The stack is the user's position in the app;
 * a fullscreen video is a mode of the window, not a place in the stack.
 *
 * So the stack stays mounted and stops painting. State, scroll position
 * and back history all survive the round trip, which is what every
 * shipping player does: YouTube, Plex and VLC all return you to exactly
 * the feed you left.
 */

import * as React from 'react';
import {StyleSheet, View} from 'react-native';

export interface BrowsingStackProps {
  /**
   * `true` when the video owns the window and the browsing stack must
   * not take touches. Pass `presentation.isExpanded` — NOT "a video is
   * loaded": while a video is minimised the feed is meant to be visible,
   * and during PiP the app is meant to be fully interactive behind the
   * floating window.
   */
  hidden: boolean;
  children?: React.ReactNode;
}

export const BrowsingStack: React.FC<BrowsingStackProps> = ({
  hidden,
  children,
}) => (
  <View
    style={[styles.root, hidden && styles.blanked]}
    pointerEvents={hidden ? 'none' : 'auto'}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Alpha 0 on the subtree root: Android skips drawing the render node
  // entirely, so this costs one alpha and no per-screen work. Children stay
  // mounted, which is the point — see the module docstring.
  blanked: {
    opacity: 0,
  },
});

export default BrowsingStack;
