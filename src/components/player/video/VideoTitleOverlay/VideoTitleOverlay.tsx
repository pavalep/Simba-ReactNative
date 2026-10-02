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
 * It is mounted inside `ChromeAutoHideController` (SimbaPlayer.tsx),
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
 * ## DELIBERATE DEVIATION from SPEC §3.2 ("gradient scrim")
 *
 * The scrim is a solid translucent bar (`background.scrimDeep`), not a
 * gradient. The only gradient library in `package.json` is
 * `react-native-linear-gradient@2.8.3`, which has ZERO usages anywhere
 * in this app and predates the new architecture; pulling an unverified
 * native module into the live player chrome to satisfy a gradient is not
 * a change that can be validated without a device build. The token
 * chosen reaches the spec's actual requirement (legible on any frame)
 * with no new native dependency.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3.2 + `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 1.1 / 6.4.
 */

import * as React from 'react';
import {Animated, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {useHaptic, useReduceMotion, useTransport} from '../../../../infrastructure/player';

/** Entrance fade duration (ms). Collapsed to 0 under reduce-motion. */
const FADE_IN_MS = 180;
/** Entrance travel (px), resolved from a raised start position. */
const RISE_PX = 8;
/** Minimum touch target. WCAG 2.2 §2.5.8 (AA) asks 24; platform norm is 44. */
const TOUCH_TARGET = 44;

export const VideoTitleOverlay: React.FC = () => {
  const {state, commands} = useTransport();
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const {haptic} = useHaptic();

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
    haptic('light');
    commands.exitPlayer();
  }, [haptic, commands]);

  const onToggleLock = React.useCallback(() => {
    haptic('light');
    commands.setOrientationLock(!state.isOrientationLocked);
  }, [haptic, commands, state.isOrientationLocked]);

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
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.xs,
          backgroundColor: colors.background.scrimDeep,
        },
      ]}
    >
      {/* ── Back / dismiss ─────────────────────────────────────────── */}
      <Pressable
        testID="video-header-back"
        onPress={onBack}
        accessibilityRole="button"
        // The action, not the icon: this leaves the player and returns
        // to the app. "Back" is the platform-correct verb for the
        // affordance, and it matches the hardware back button, which
        // performs the identical transition.
        accessibilityLabel="Back"
        hitSlop={8}
        style={({pressed}) => [
          styles.iconButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <SvgIcon name="chevronLeft" size={24} color={colors.text.onMediaSoft} />
      </Pressable>

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
      <Pressable
        testID="video-header-lock"
        onPress={onToggleLock}
        accessibilityRole="switch"
        accessibilityState={{checked: locked}}
        // State-aware: names the ACTION, and says which way it goes.
        accessibilityLabel={
          locked ? 'Unlock orientation' : 'Lock orientation'
        }
        hitSlop={8}
        style={({pressed}) => [
          styles.iconButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <SvgIcon
          name={locked ? 'lock' : 'unlock'}
          size={22}
          // Engaged reads gold so the state is legible at a glance;
          // released stays on the standard on-media ink. The glyph swap
          // (lock/unlock) carries the same information without relying
          // on colour, which is the WCAG 1.4.1 requirement.
          color={locked ? colors.accent.gold : colors.text.onMediaSoft}
        />
      </Pressable>
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
  },
  iconButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
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
