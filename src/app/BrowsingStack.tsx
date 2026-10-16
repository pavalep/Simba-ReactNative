/**
 * V21 F5 follow-up — the browsing stack's PAINTING is owned here.
 *
 * ## Why this component exists at all
 *
 * The video surface is a native `MpvRenderView`, and `PlayerSurface.mount()`
 * inserts it at `android.R.id.content` index 0 — i.e. **beneath the entire
 * React root**. Everything React renders is therefore composited ON TOP of
 * the video, not underneath it.
 *
 * That makes one invariant load-bearing, and this component is its owner:
 *
 *   **while the video owns the window, nothing opaque may paint.**
 *
 * `AppContent` renders `NavigationContainer` → `RootNavigator` → a screen,
 * and every one of those paints an opaque background. So while a video is
 * expanded, the browsing stack paints over the very pixels it is supposed to
 * be sitting behind.
 *
 * This is not a new failure. `MainActivity.kt` names it — the V11 "opaque
 * React root covers the video" bug — and claims it is "prevented by
 * construction". It is prevented only while the surface is GONE at 0x0,
 * which is how it shipped. The moment `fillVideoBounds()` + `setSurfaceVisible(true)`
 * present it full-window, the opaque root covers it again, and every layer of
 * this app that paints a background does it at once.
 *
 * `ActivityShell`'s docstring records the same rule from the other direction
 * ("`AppContent` paints an opaque screen background, which would cover the
 * native `MpvRenderView`"), and the original two-Activity design enforced it
 * with `isPlayerActivity ? null : <AppContent />`. Deleting the second
 * Activity deleted that ternary along with the flag it read — and with it the
 * only thing that stopped the browsing stack from painting over the video.
 *
 * ## Why `hidden` blanks rather than unmounts
 *
 * The obvious implementation is `hidden ? null : children`. It is wrong.
 *
 * Unmounting destroys the navigator's state, so pressing back out of a
 * fullscreen video would drop the user on the app's INITIAL route instead of
 * the screen they launched from — open a title from the Movies list, press
 * back, land on Home. The stack is the user's position in the app; a
 * fullscreen video is a mode of the window, not a place in the stack.
 *
 * So the stack stays mounted and stops painting. State, scroll position and
 * back history all survive the round trip, which is what every shipping
 * player does: YouTube, Plex and VLC all return you to exactly the feed you
 * left.
 *
 * ## Why `pointerEvents` is set alongside the opacity
 *
 * `opacity: 0` hides pixels; it does NOT opt a view out of touch handling.
 * A blanked-but-touchable stack would sit above the video surface and
 * swallow the tap that toggles the chrome — the player would look blank and
 * feel dead. The two properties are one decision and are set together.
 */

import * as React from 'react';
import {StyleSheet, View} from 'react-native';

export interface BrowsingStackProps {
  /**
   * `true` when the video surface owns the window and the browsing stack
   * must not paint or take touches. Pass `presentation.isExpanded` — NOT
   * "a video is loaded": while a video is minimised the feed is meant to
   * be visible, and during PiP the app is meant to be fully interactive
   * behind the floating window.
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