/**
 * V19 W7 — the video player CONTROL SURFACE design system.
 *
 * ## Why this file exists
 *
 * Every visual defect the product owner reported traces back to one
 * root cause: **there was no shared definition of what a control in the
 * player looks like or how big it is.** Each component hand-rolled its
 * own numbers, and they had drifted apart:
 *
 * | Component          | icon size | target  | press feedback |
 * |--------------------|-----------|---------|----------------|
 * | `TransportRow`     | 28        | 44/56   | opacity 0.7    |
 * | `VideoTitleOverlay`| 24        | 44      | opacity 0.6    |
 * | `More`             | **20**    | 44      | opacity 0.7    |
 * | `PiPToggle`        | 24        | 44      | opacity 0.7    |
 * | `CaptionsToggle`   | **16**    | 44      | opacity 0.7    |
 *
 * A 12 px spread inside one screen is what made the chrome look
 * unfinished: not one icon was individually wrong, they simply did not
 * belong to the same system.
 *
 * The visible symptom was "some icons are partially hidden and some
 * are not clickable", but neither is a per-component bug:
 *
 * - **"Partially hidden"** was a *perception* problem. A 20 px glyph
 *   inside a 44 pt target reads as a small, slightly lost mark next to
 *   a 28 px glyph in the row above it. The user aims at what looks like
 *   the control and misses, or feels the target is unreliable.
 * - **"Not clickable"** was a *scale* problem. 20 px is under the ~24 px
 *   minimum graphic size in the Material and Apple legibility guidance,
 *   so the affordance is too small to read as an interactive target
 *   even where the 44 pt hit area is technically correct.
 *
 * Fixing those per component would have produced a fourth variation
 * next time someone added a control. So the numbers live here, once.
 *
 * ## The two tiers, and why they differ by SHAPE and not just size
 *
 * V19 W7.3 added the second tier after the audit showed the player had
 * four different icon sizes in one screen (16 / 20 / 22 / 28). Size
 * alone was not enough to fix it, because a 22 px bare icon next to a
 * 22 px bare icon still reads as "more of the same" as the transport
 * row above it. So:
 *
 *   - **Tier 1 — bare target.** Square, transparent, 44/56 pt. The
 *     transport row. These are actions, not settings.
 *   - **Tier 2 — glass pill.** Rounded, translucent dark fill, thin
 *     light edge, icon + text. The secondary row. These carry STATE
 *     ("Repeat all", a caption language), and a labelled pill says
 *     that in words where a bare icon would have to rely on colour.
 *
 * ## The three numbers, and what each is for
 *
 * - `CONTROL_ICON_SIZE` — the **drawn** glyph. This is what the user
 *   perceives as the control, and it must be legible at arm's length
 *   over arbitrary video. 24 is the floor across every platform
 *   guidance; the transport row runs 4 px larger because it is the
 *   primary action cluster and is read first.
 * - `CONTROL_TARGET` — the **hit area**, 44 × 44. Never smaller. The
 *   icon is centred inside it; the icon is NOT the target. This
 *   separation is the whole reason the old layout felt wrong: a small
 *   icon with `hitSlop` is a guess, whereas a 44 pt target with a
 *   centred 24 px glyph is a documented target.
 * - `CONTROL_PRIMARY_TARGET` — 56, for the play/pause alone. It is the
 *   single primary CTA and earns the extra weight.
 *
 * ## Why press feedback is scale, not just opacity
 *
 * Opacity-only feedback is what made the chrome feel inert: a 30 %
 * dip on a transparent icon over video is easy to miss entirely,
 * because there is no background to darken. A **scale** on press is
 * visible regardless of what is behind the control, which is the
 * entire problem space when the backdrop is an arbitrary film frame.
 * Opacity is kept as a secondary term, not as the only one.
 *
 * `useNativeDriver` is used because the transform runs on the UI
 * runtime; without it a press during an active gesture would be
 * dropped by the JS thread, which is exactly when the user is
 * interacting fastest.
 *
 * ## Why this is a component and not just constants
 *
 * Constants alone still let a caller forget the press animation, the
 * haptic, the disabled treatment, or the accessibility role. Those four
 * together are what make a control *feel* like it belongs, so they are
 * bound together in one primitive. A new control that forgets to be
 * consistent is then not expressible.
 *
 * ## The "control must be able to act" rule, mechanically enforced
 *
 * `onPress` is REQUIRED and non-optional, and `disabled` is a prop
 * rather than something a caller can fake by passing a no-op. A
 * component that cannot act must pass `disabled` and therefore render
 * visibly inert — or, per SPEC §0.3 I3, render nothing at all. There is
 * no third option where a control looks live and does nothing, which is
 * the exact defect class that produced the previous "looks premium,
 * isn't" chrome.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3.0 (this system) and §0.3 invariant I11.
 */

import * as React from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {AppText} from '../../../core/AppText/AppText';
import {useHaptic} from '../../../../infrastructure/player';
import {SvgIcon, type SvgIconName} from '../../../utility/SvgIcon';

// ── The numbers ─────────────────────────────────────────────────────────

/**
 * Minimum drawn glyph for a control sitting over video.
 *
 * 24 px is the floor in the Material and Apple legibility guidance for
 * an interactive graphic. Going below it (the old `More` used 20) makes
 * the affordance read as a decoration rather than a target.
 */
export const CONTROL_ICON_SIZE = 24;

/** The secondary/tertiary rows step down one notch, never to 20. */
export const CONTROL_ICON_SIZE_COMPACT = 22;

/** Transport-row primary cluster. +4 over the floor so it reads first. */
export const CONTROL_ICON_SIZE_TRANSPORT = 28;

/** 44 × 44 — the hit area for every control. Never smaller. */
export const CONTROL_TARGET = 44;

/** 56 — play/pause only. The one primary CTA. */
export const CONTROL_PRIMARY_TARGET = 56;

/** Scale applied on press. Large enough to register, small enough to
 *  not feel like a toy. */
const PRESSED_SCALE = 0.9;

/** Opacity of a `disabled` control. Low enough to read as inert, high
 *  enough that the glyph is still identifiable — a fully hidden
 *  control reads as a rendering bug, not as "unavailable". */
const DISABLED_OPACITY = 0.35;

// ── The primitive ───────────────────────────────────────────────────────

export interface PlayerControlProps {
  /**
   * The glyph to draw. Omit for a control that is a filled shape (play/
   * pause) or a text chip.
   */
  icon?: SvgIconName;
  /** Draw this size instead of the default for the given `size` tier. */
  iconSize?: number;
  /**
   * REQUIRED. The action. There is no optional handler, so a control
   * cannot be constructed inert by omission — only by declaring
   * `disabled`, which renders it visibly muted.
   */
  onPress: () => void;
  /** Visible, state-aware name of the ACTION. */
  accessibilityLabel: string;
  /** Optional extra guidance for screen readers. */
  accessibilityHint?: string;
  /** `switch` for a two-state toggle, `button` otherwise. */
  accessibilityRole?: 'button' | 'switch';
  /** For `switch`: the checked state. */
  accessibilityChecked?: boolean;
  /**
   * Renders the control inert and muted. Use when the action exists but
   * is not currently available. Do NOT use to hide a control — return
   * `null` instead, so it does not become a dead spacer.
   */
  disabled?: boolean;
  /**
   * Overrides the hit area. Only the transport play/pause uses this;
   * everything else inherits `CONTROL_TARGET`.
   */
  targetSize?: number;
  /** Fills the control with the accent colour (play/pause only). */
  filled?: boolean;
  /**
   * V19 W7.3 — renders the control as a GLASS PILL (rounded, translucent
   * dark fill, thin light edge) and sizes it to fit an optional `label`
   * instead of a square.
   *
   * This is the second tier of the design system. The transport row is
   * bare 44 pt icon targets; the secondary row (repeat, captions, PiP,
   * More) is pills. The two tiers are visually distinct by shape, not
   * just by size, so the row reads as "primary actions" over
   * "settings" at a glance — which is the whole point of a two-level
   * control hierarchy in a player this dense.
   *
   * Pills matter here because those controls carry STATE (which repeat
   * mode, which caption track). A bare icon has to rely on colour alone
   * to say "one" vs "all"; a labelled pill says it in words.
   */
  chip?: boolean;
  /** Text rendered inside a `chip`. Ignored when `chip` is false. */
  label?: string;
  /**
   * Engaged state for a `chip`: gold fill + gold ink. Pair it with an
   * `accessibilityRole="switch"` and `accessibilityChecked` so the state
   * is conveyed by the accessibility tree as well as by colour (WCAG
   * 1.4.1) — colour alone is not a sufficient signal.
   */
  active?: boolean;
  /** Tint for the glyph when not filled. Defaults to on-media soft. */
  tint?: string;
  /** Tint for the glyph when `filled` — dark ink on the gold fill. */
  filledTint?: string;
  /** Tint for the glyph when `disabled`. */
  disabledTint?: string;
  /** Haptic on press. `light` is the default for a secondary control. */
  haptic?: 'light' | 'medium';
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one control primitive for the player chrome.
 *
 * Every button in the transport row, the mode row, the header and any
 * future control surface uses this, so that icon size, hit area and
 * press feedback cannot drift between them.
 */
export const PlayerControl: React.FC<PlayerControlProps> = ({
  icon,
  iconSize = CONTROL_ICON_SIZE,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityChecked,
  disabled = false,
  targetSize = CONTROL_TARGET,
  filled = false,
  chip = false,
  label,
  active = false,
  tint,
  filledTint,
  disabledTint,
  haptic = 'light',
  testID,
  style,
}) => {
  const {colors} = useTheme();
  const {haptic: fire} = useHaptic();
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePress = React.useCallback(() => {
    if (disabled) return;
    fire(haptic);
    onPress();
  }, [disabled, fire, haptic, onPress]);

  const pressTo = React.useCallback(
    (to: number) => {
      Animated.spring(scale, {
        toValue: to,
        useNativeDriver: true,
        speed: 40,
        bounciness: 4,
      }).start();
    },
    [scale],
  );

  const size = targetSize;

  const iconColor = disabled
    ? (disabledTint ?? colors.text.onMediaMuted)
    : filled
      ? (filledTint ?? colors.text.inverse)
      : active
        ? colors.accent.gold
        : (tint ?? colors.text.onMediaSoft);

  /**
   * A chip is sized to its CONTENT (icon + gap + label + padding),
   * while a bare control is a fixed square. The width is expressed as a
   * style rather than a prop because the label length varies with the
   * state ("Off" vs "Repeat all", "CC" vs a language name) and a fixed
   * width would either clip the long one or leave a ragged edge on the
   * short one.
   *
   * `onMediaPill` / `onMediaPillBorder` are the always-dark on-media
   * tokens — deliberately NOT `background.floating` or `background
   // .highlight`, both of which flip to light-theme values that
   * disappear over a video frame. See the token doc comment.
   */
  const surface = chip
    ? {
        backgroundColor: active ? colors.accent.goldDim : colors.background.onMediaPill,
        borderColor: active ? colors.accent.gold : colors.background.onMediaPillBorder,
        borderWidth: StyleSheet.hairlineWidth * 2,
        width: undefined,
        height: CONTROL_TARGET,
        borderRadius: CONTROL_TARGET / 2,
        paddingHorizontal: spacing.md,
        flexDirection: 'row' as const,
        gap: spacing.xs,
      }
    : {
        backgroundColor:
          filled && !disabled ? colors.accent.gold : 'transparent',
        width: size,
        height: size,
        borderRadius: filled ? size / 2 : undefined,
      };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled,
        ...(accessibilityRole === 'switch'
          ? {checked: accessibilityChecked}
          : null),
      }}
      // No `hitSlop`: the control is already a full 44 pt target. Padding
      // the hit area beyond its own bounds is what made adjacent
      // controls in a row fight over the same taps.
      onPressIn={() => pressTo(PRESSED_SCALE)}
      onPressOut={() => pressTo(1)}
      style={[styles.base, surface, style]}
    >
      <Animated.View
        // Stable handle for the press-animated inner view, so the test
        // suite can assert the SCALE and the disabled MUTING directly
        // rather than inferring them from the outer target's style.
        testID={testID ? `${testID}__inner` : undefined}
        style={[
          styles.inner,
          chip ? styles.innerChip : null,
          {transform: [{scale}]},
          disabled ? styles.disabled : null,
        ]}
      >
        {icon ? (
          <SvgIcon name={icon} size={iconSize} color={iconColor} />
        ) : null}
        {chip && label ? (
          <AppText
            variant="caption"
            numberOfLines={1}
            color={
              disabled
                ? colors.text.onMediaMuted
                : active
                  ? colors.accent.gold
                  : colors.text.onMediaSoft
            }
          >
            {label}
          </AppText>
        ) : null}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerChip: {
    // The chip's inner row must NOT be centred vertically in a way that
    // fights the pill's own padding; it hugs its content horizontally
    // and centres the icon/label pair on the cross axis.
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
});

export default PlayerControl;
