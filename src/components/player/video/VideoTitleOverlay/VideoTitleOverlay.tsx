/**
 * V19 W6.4 — `VideoTitleOverlay`, the player's TOP BAR (header).
 *
 * SPEC §3.2 — "the top bar": a back/minimize affordance, the title, a
 * lock affordance, and a More affordance. Nothing else.
 *
 * ## Layout
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  ‹      Overrun!                    🔒        │
 *   │         Monica Strebel · 1970                │
 *   └──────────────────────────────────────────────┘
 *
 * ## What this is NOT
 *
 * **There is no logo.** The Home header carries the engraved lion +
 * Allura wordmark; repeating it inside the video player is decoration
 * competing with the title for the same 44 px of attention, and it was
 * explicitly rejected. The bar's left slot belongs to the back
 * affordance.
 *
 * ## Why ONE back affordance and not minimize + back + close
 *
 * All three words describe the same transition, so the header renders
 * one control. The reason is architectural, not stylistic: the player
 * runs in its own Android activity (`PlayerActivity`,
 * `launchMode="singleTask"`), and V6.0 removed the mini dock.
 * `usePresentationStore` persists only `pipActive`; `'mini' | 'expanded'`
 * are DERIVED at read time from which activity this React tree is
 * mounted in. There is therefore no smaller player to minimize *to* —
 * dismissing the activity IS the transition, and the mode re-derives on
 * its own.
 *
 * Three buttons for one effect would be three names for one action, and
 * one of them would inevitably become a no-op. The single control calls
 * the lib's real `commands.exitPipAndFinish()` via the facade's
 * `exitPlayer()`. It deliberately does NOT call `setPresentation('mini')`
 * — that method was removed because the host immediately overwrites
 * such a write, which makes it a control that lies.
 *
 * ## The lock affordance
 *
 * Industry pattern (YouTube / Apple TV / Plex): the lock PINS the video
 * to the orientation it is in right now, and releases back to free
 * rotation. It does not force a side. Backed by the lib's real
 * `commands.setOrientation('portrait' | 'landscape' | 'sensor')`; the
 * state comes from `useOrientationLockStore` because
 * `Activity.requestedOrientation` has no getter, so the platform cannot
 * be asked what state it is in. The glyph pair (`lock` when engaged,
 * `unlock` when not) plus a state-aware label is what makes the toggle
 * readable without colour.
 *
 * ## Visibility — this component owns NO visibility state
 *
 * It is mounted inside `ChromeAutoHideController` (VideoPlayer.tsx),
 * the single owner of chrome opacity, so the bar fades in and out with
 * the transport controls for free. A second timer here would be the
 * "competing visibility system" that controller exists to prevent.
 *
 * The one animation below is the ENTRANCE (fade + 8 px rise), replayed
 * when the title changes — i.e. when a new item loads, so it
 * re-announces itself. It is scoped to the TEXT COLUMN on purpose: when
 * this animation lived on the whole bar it also faded the back and lock
 * buttons, so switching items made the controls the user was reaching
 * for flicker out and back. Collapsed to 0 ms under `useReduceMotion`
 * (WCAG 2.3.3), matching `VerticalSwipeGestures`.
 *
 * ## Hit-testing — `box-none`, not `none`
 *
 * This bar overlays the video surface, and the surface's tap is what
 * toggles the chrome. `pointerEvents="none"` would make the whole bar
 * transparent to touches — correct when the bar was title-only and
 * non-interactive, and wrong now that it owns two buttons. `box-none`
 * keeps the container itself transparent while letting the two
 * `Pressable`s receive their own taps, so a tap on the empty middle of
 * the bar still reaches the surface and toggles the chrome.
 *
 * ## Colour
 *
 * The frame is a dark surface in BOTH themes, so ink is
 * `text.onMediaSoft` / `onMediaMuted`. Light theme's `text.primary`
 * (`#1A1A1C`) was near-black on black video.
 *
 * ## DELIBERATE DEVIATION from SPEC §3.2 ("gradient scrim") — RESOLVED
 *
 * This bar used to paint its own solid `background.scrimDeep`
 * rectangle, on the stated grounds that `react-native-linear-gradient`
 * was unusable. That reasoning was wrong: the package is a declared
 * dependency at `^2.8.3` and it is installed. The hard rectangle was a
 * substitute, and the substitute is what produced the "black slab
 * bolted to the top while the bottom has no backdrop at all" look.
 *
 * W7.2 replaces it with `PlayerScrim` — ONE continuous gradient behind
 * the entire chrome, mounted once in `VideoPlayer`'s compositor. The
 * header no longer paints any background of its own, which is also why
 * there is no seam to line up: the gradient is a single surface that
 * both bands belong to.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3.2 + `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 1.1 / 6.4, and
 * `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md` §1.1 / §3.1.
 */

import * as React from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {useReduceMotion, useTransport} from '../../../../infrastructure/player';
import {PlayerControl, CONTROL_ICON_SIZE_COMPACT} from '../PlayerControl/PlayerControl';
import {BookmarkControl} from '../BookmarkControl/BookmarkControl';

/**
 * Entrance fade duration (ms). Collapsed to 0 under reduce-motion.
 *
 * EXPORTED, not just consumed: the test suite asserts the non-reduced
 * duration rather than hardcoding a number, because a test that pins
 * `180` does not fail when the design is retimed — it fails, and the
 * obvious "fix" is to hardcode the new number, which is exactly how a
 * test stops checking anything.
 */
export const FADE_IN_MS = 220;

/** Entrance travel (px), resolved from a raised start position. */
export const RISE_PX = 10;

export const VideoTitleOverlay: React.FC = () => {
  const {state, commands} = useTransport();
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const title = state.title.trim();
  const artist = state.artist.trim();

  const opacity = React.useRef(new Animated.Value(0)).current;
  const rise = React.useRef(new Animated.Value(RISE_PX)).current;

  // Replays on every title change, so a newly-loaded item re-announces
  // itself. Runs BEFORE the early returns below, because hooks cannot
  // sit below a conditional return — when the title goes empty the value
  // is snapped back to invisible so a subsequent title does not inherit
  // a stale half-faded state.
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

  const onBack = React.useCallback(() => {
    commands.exitPlayer();
  }, [commands]);

  const onToggleLock = React.useCallback(() => {
    commands.setOrientationLock(!state.isOrientationLocked);
  }, [commands, state.isOrientationLocked]);

  // No metadata yet AND no title → the bar would be a back button and a
  // lock button floating over nothing, which is not what the user came
  // for. A placeholder ("Unknown title") would be a lie about data the
  // app does not have, so neither is invented.
  if (!title) return null;

  const locked = state.isOrientationLocked;

  return (
    <View
      testID="video-title-overlay"
      // `box-none`, not `none`: the container must not swallow the tap
      // the video surface owns, but the two buttons must still work.
      pointerEvents="box-none"
      style={[styles.container, {paddingTop: insets.top + spacing.xs}]}
    >
      {/* ── Back / dismiss ─────────────────────────────────────────── */}
      <PlayerControl
        testID="video-header-back"
        icon="chevronLeft"
        onPress={onBack}
        // The action, not the icon: this leaves the player and returns
        // to the app. "Back" is the platform-correct verb for the
        // affordance, and it matches the hardware back button, which
        // performs the identical transition.
        accessibilityLabel="Back"
        accessibilityHint="Closes the player and returns to the app"
      />

      {/* ── Title / artist ─────────────────────────────────────────── */}
      <Animated.View
        // The entrance animation is scoped to this column so it never
        // fades the controls the user is reaching for.
        pointerEvents="none"
        style={[
          styles.titleColumn,
          {opacity, transform: [{translateY: rise}]},
        ]}
      >
        <AppText
          variant="h3"
          color={colors.text.onMediaSoft}
          numberOfLines={1}
          style={styles.title}
          testID="video-header-title"
        >
          {title}
        </AppText>
        {artist ? (
          <AppText
            variant="caption"
            color={colors.text.onMediaMuted}
            numberOfLines={1}
            style={styles.artist}
            testID="video-header-artist"
          >
            {artist}
          </AppText>
        ) : null}
      </Animated.View>

      {/* ── Orientation lock ───────────────────────────────────────── */}
      <PlayerControl
        testID="video-header-lock"
        icon={locked ? 'lock' : 'unlock'}
        iconSize={CONTROL_ICON_SIZE_COMPACT}
        onPress={onToggleLock}
        accessibilityRole="switch"
        accessibilityChecked={locked}
        // State-aware: names the ACTION, and says which way it goes.
        accessibilityLabel={locked ? 'Unlock orientation' : 'Lock orientation'}
        accessibilityHint="Pins the video to its current orientation, or releases it"
        // Engaged reads gold so the state is legible at a glance;
        // released stays on the standard on-media ink. The glyph swap
        // (lock/unlock) carries the same information without relying
        // on colour, which is the WCAG 1.4.1 requirement.
        tint={locked ? colors.accent.gold : colors.text.onMediaSoft}
      />

      {/* ── Bookmark ──────────────────────────────────────────────── */}
      {/* W9.4. Beside the lock because both are *state* actions on the
          media rather than transport, and because YouTube places its
          save control in this same corner of the player. Self-removing
          when there is no session — see BookmarkControl. */}
      <BookmarkControl />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    // No background. The scrim behind this bar is `PlayerScrim`,
    // mounted once in the compositor — a per-bar background is what
    // produced the black slab, and a second one would seam against it.
  },
  titleColumn: {
    flex: 1,
    // Leaves the bar's own padding so a long title truncates instead of
    // pushing the buttons off-screen (SPEC §3.2).
    marginHorizontal: spacing.xs,
  },
  title: {
    flexShrink: 1,
  },
  artist: {
    marginTop: 2,
  },
});

export default VideoTitleOverlay;
