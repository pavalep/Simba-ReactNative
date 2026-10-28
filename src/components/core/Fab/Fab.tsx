/**
 * V22 W32 (2026-10-28) — the app's ONE floating action button.
 *
 * ## Why this component exists
 *
 * The app had THREE implementations of the same button:
 *
 *   • `screens/Home/components/HomeFab.tsx` — a gold "play" disc;
 *   • `screens/{Movies,Music,Podcasts}Screen/components/BrowseFab.tsx` —
 *     three byte-identical copies of a gold "filter" disc;
 *   • `screens/{Radio,LiveTV}ScreenNew/browse/Fab.tsx` — two more
 *     byte-identical copies of the same disc;
 *   • and the Library's, drawn inline in the screen's stylesheet.
 *
 * Six files, one button. Every one of them positioned itself by hand,
 * which is how they drifted: the Home one floated `spacing.lg` from the
 * right edge, the other five floated `spacing.xl`, the Home one had a
 * neutral shadow and the other five had a gold glow, and the Home one
 * used `zIndex: 99` where the rest used `10`.
 *
 * ## What ONE component buys
 *
 * The whole point of the bottom-chrome rule (see
 * `infrastructure/player/miniPlayerChrome`) is that a floating button
 * clears the mini-player dock. A rule that lives in seven call sites is
 * not a rule — it is seven chances to get it wrong, and the mini player
 * was already under all of them. With one component there is ONE place
 * that decides where a FAB sits, so the rule cannot be forgotten on the
 * next screen that adds one.
 *
 * ## The visual
 *
 * The treatment is the one six of the seven already used: a 56 dp gold
 * disc, a gold glow, `spacing.xl` from the right edge. The Home button
 * was the outlier (a neutral shadow, `spacing.lg`, `zIndex: 99`) and was
 * normalised onto it. Nothing about the button is new — it is the same
 * disc the app has been shipping.
 *
 * ## The glyph
 *
 * `icon` takes an `SvgIconName`. `label` takes a short text glyph for
 * the one case the icon set does not cover — the Library's "+", which is
 * the universal create affordance and was already drawn as text. The two
 * are mutually exclusive in the type, so a call site cannot quietly end
 * up with both.
 */

import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {SvgIcon, type SvgIconName} from '../../utility/SvgIcon/SvgIcon';
import {AppText} from '../AppText/AppText';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';

/**
 * The button's edge length (dp).
 *
 * Exported because the screens that own a FAB have to reserve room for
 * it at the bottom of their scroll content, and a second copy of "56"
 * is exactly the kind of number that drifts.
 */
export const FAB_SIZE = 56;

/** The glyph inside the disc. Either an icon or a short text glyph. */
export type FabContent =
  | {icon: SvgIconName; label?: never}
  | {icon?: never; label: string};

export type FabProps = FabContent & {
  /** The action. */
  onPress: () => void;
  /** What a screen reader announces. */
  accessibilityLabel: string;
  /** Render nothing at all when false. */
  visible?: boolean;
  /** A count on the corner. `0` draws no badge. */
  badgeCount?: number;
};

/** The glyph's edge length (dp). */
const FAB_ICON_SIZE = 24;

export const Fab: React.FC<FabProps> = ({
  onPress,
  accessibilityLabel,
  icon,
  label,
  visible = true,
  badgeCount = 0,
}) => {
  const {colors} = useTheme();
  // The rule, not a hand-written offset. With no mini player up this is
  // the app's long-standing `insets.bottom + spacing.lg`; with one up it
  // lifts the button clear of the dock.
  const bottom = useBottomChromeInset();

  if (!visible) return null;

  return (
    <View style={[styles.overlay, {bottom}]} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          badgeCount > 0
            ? `${accessibilityLabel}, ${badgeCount} active`
            : accessibilityLabel
        }
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent.gold,
            shadowColor: colors.accent.gold,
          },
        ]}>
        {icon ? (
          <SvgIcon name={icon} size={FAB_ICON_SIZE} color={colors.text.inverse} />
        ) : (
          <AppText style={styles.fabLabel}>{label}</AppText>
        )}
      </TouchableOpacity>

      {badgeCount > 0 ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.background.primary,
              borderColor: colors.accent.gold,
            },
          ]}>
          <AppText variant="caption" color="accent" style={styles.badgeText}>
            {badgeCount}
          </AppText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    right: spacing.xl,
    zIndex: 10,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  fabLabel: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '400',
  },
});

export default Fab;
