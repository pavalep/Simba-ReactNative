// ─── v10: Unified Section Browse — SectionFab ────────────────────────────
// Wave 3 (Phase 3.1). The single "more things this section can do" button
// (spec §3.3): bottom-right, gold, opens the section's SectionOptionsSheet.
//
// Visual precedents (Phase 3.1 step 1):
//   • Library's inline gold "+" FAB — 56×56, pill radius, gold fill,
//     gold glow shadow (elevation 8 / offset {0,4} / opacity 0.35).
//   • Home's play FAB — same size/radius/fill, absolute bottom-right.
//
// Config-driven visibility: the SHELL decides whether to render this
// (sections without `options.groups` never show it — they render nothing,
// so no dead button). The shell also owns sheet visibility; this component
// is purely "the button + its press contract".

import React from 'react';
import {TouchableOpacity, View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {useKeyboard} from '../../../hooks/useKeyboard';
import {SvgIcon} from '../../../components/utility/SvgIcon/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';

export interface SectionFabProps {
  /** Opens the SectionOptionsSheet (the shell owns sheet visibility). */
  onPress: () => void;
  /** Screen-reader label — e.g. "Filter movies options". */
  accessibilityLabel: string;
  /** Config-driven visibility: false when the section defines no options. */
  visible?: boolean;
  /** Active option count — renders a small badge when > 0 (Phase 3.3). */
  badgeCount?: number;
}

export const SectionFab: React.FC<SectionFabProps> = ({
  onPress,
  accessibilityLabel,
  visible = true,
  badgeCount = 0,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  // Phase 5.3 step 6: while the keyboard is open the FAB is dead weight
  // (the options sheet can't open over it anyway) — hide it so it never
  // floats above the typing UI.
  const {keyboardVisible} = useKeyboard();

  if (!visible || keyboardVisible) return null;

  return (
    // `pointerEvents="box-none"` is the press-through fix (Phase 3.1 step 8):
    // the overlay box lets taps land on the tab scenes beneath; ONLY the
    // FAB circle itself intercepts touches. Without it the invisible box
    // would swallow every gesture on the right edge of the content.
    <View
      style={[styles.overlay, {bottom: insets.bottom + spacing.lg}]}
      pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          console.log('[FAB] press', accessibilityLabel);
          onPress();
        }}
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
            // Gold glow shadow — matches the Library FAB (inline; module-
            // scope styles are color-free per file convention).
            shadowColor: colors.accent.gold,
          },
        ]}>
        <SvgIcon name="sliders" size={24} color={colors.text.inverse} />
      </TouchableOpacity>

      {/* ── Active-options badge (Phase 3.3 step 4) ── */}
      {/* Counts filters + sort applied; dark pill with gold text/border so it
          reads as "premium" on the gold FAB instead of a flat-black dot. */}
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
    // Above the tab scenes (rendered after TabView in the shell tree, so
    // zIndex 10 keeps it on top on Android too).
    zIndex: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    // Library FAB shadow geometry (static values live here; the color is
    // theme-driven and applied inline).
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
});
