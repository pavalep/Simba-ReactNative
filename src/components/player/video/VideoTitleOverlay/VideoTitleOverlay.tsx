/**
 * V19 W1 — `VideoTitleOverlay` (the top bar's title).
 *
 * SPEC §3.2 calls this the "top bar" and requires the title to stay
 * legible on ANY frame. Until now the file was a `return null` stub
 * while still being mounted in the live chrome
 * (`SimbaPlayer/ExpandedChrome`), so the player showed no title at
 * all — the `MoreSheet` even documents sharing "the lib's
 * `usePlayer().state.title`", i.e. the value was right there.
 *
 * Data: `useTransport().state` — `title` and `artist` are fields the
 * facade already exposes (`useTransport.ts`: `title` from lib
 * `PlayerState.title`, `artist` from `metadata/by-key/artist`). No
 * new source, no fetch, no invented state. When both are empty the
 * component renders NOTHING rather than a placeholder string.
 *
 * Visibility: this component owns NO visibility state. It is mounted
 * inside `ChromeAutoHideController` (SimbaPlayer.tsx), which is the
 * single owner of chrome opacity — so the title fades in and out
 * with the transport bar for free, and a second timer here would be
 * the "competing visibility system" the auto-hide controller exists
 * to prevent. The only animation below is the ENTRANCE (fade +
 * 8 px rise) replayed when the title changes, i.e. when a new item
 * loads.
 *
 * `useReduceMotion` follows the convention in
 * `Gestures/VerticalSwipeGestures.tsx`: the OS accessibility flag
 * collapses the animation duration to 0 ms (WCAG 2.3.3).
 *
 * Colour: the frame is a dark surface in BOTH themes, so the text
 * uses `colors.text.onMediaSoft` / `onMediaMuted`. Light theme's
 * `text.primary` (`#1A1A1C`) was near-black on black video.
 *
 * DELIBERATE DEVIATION from SPEC §3.2 ("sits on a gradient scrim
 * top → transparent over the media"): the gradient is implemented as
 * a solid translucent scrim bar (`background.scrimDeep`). SPEC asks
 * for a gradient, but the only gradient library in `package.json`
 * is `react-native-linear-gradient@2.8.3`, which has ZERO usages
 * anywhere in this app and predates React Native's new
 * architecture — pulling an unverified native module into the live
 * player chrome to satisfy a gradient is not a change that can be
 * validated without a device build. The token chosen here reaches
 * the spec's actual requirement (legible on any frame) with no new
 * native dependency. Re-visit when a new-arch-safe gradient package
 * is adopted app-wide.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3.2 + `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 1.1.
 */

import * as React from 'react';
import {Animated, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {useReduceMotion, useTransport} from '../../../../infrastructure/player';

/** Entrance fade duration (ms). Collapsed to 0 under reduce-motion. */
const FADE_IN_MS = 180;
/** Entrance travel (px), resolved from a raised start position. */
const RISE_PX = 8;

export const VideoTitleOverlay: React.FC = () => {
  const {state} = useTransport();
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const title = state.title.trim();
  const artist = state.artist.trim();

  const opacity = React.useRef(new Animated.Value(0)).current;
  const rise = React.useRef(new Animated.Value(RISE_PX)).current;

  // Replays on every title change, so a newly-loaded item re-announces
  // itself. Runs BEFORE the `!title` early return below, because the
  // hooks cannot sit below a conditional return — when the title goes
  // empty the value is snapped back to invisible so a subsequent
  // title does not inherit a stale half-faded state.
  React.useEffect(() => {
    if (!title) {
      opacity.setValue(0);
      rise.setValue(RISE_PX);
      return;
    }
    const duration = reduceMotion ? 0 : FADE_IN_MS;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [title, opacity, rise, reduceMotion]);

  // No metadata yet → render nothing. A placeholder ("Unknown title")
  // would be a lie about data the app simply does not have yet.
  if (!title) return null;

  return (
    <Animated.View
      testID="video-title-overlay"
      // Decorative wrapper over the frame: it must never swallow the
      // tap that `VideoSurface` / `VerticalSwipeGestures` own.
      pointerEvents="none"
      accessibilityRole="header"
      accessibilityLabel={artist ? `Now playing: ${title}. ${artist}` : `Now playing: ${title}`}
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.xs,
          backgroundColor: colors.background.scrimDeep,
          opacity,
          transform: [{translateY: rise}],
        },
      ]}
    >
      <AppText
        variant="h3"
        color={colors.text.onMediaSoft}
        numberOfLines={1}
        style={styles.title}
      >
        {title}
      </AppText>
      {artist ? (
        <AppText
          variant="caption"
          color={colors.text.onMediaMuted}
          numberOfLines={1}
          style={styles.artist}
          testID="video-title-overlay-artist"
        >
          {artist}
        </AppText>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    // The spec requires the title to TRUNCATE rather than push the
    // row's actions off-screen.
    flexShrink: 1,
  },
  artist: {
    marginTop: 2,
  },
});

export default VideoTitleOverlay;
