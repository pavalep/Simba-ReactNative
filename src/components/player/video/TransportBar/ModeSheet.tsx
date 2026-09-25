/**
 * V19 W3 Phase 3.1 — `ModeSheet` (single-choice popover).
 *
 * A small Modal that anchors visually above the bottom transport
 * row (the SPEC describes it as "anchored to the control" — we
 * position it ~80 px above the bottom of the screen so it floats
 * over the transport row without occluding the progress track).
 *
 * Three options, exactly one active at a time:
 *
 *   - Off          — `repeatMode === 'off'`
 *   - Repeat one   — `repeatMode === 'one'` (lib `loop-file`)
 *   - Repeat all   — `repeatMode === 'all'` (lib `loop-playlist`)
 *
 * The selected option is gold-highlighted (gold-tinted background
 * + dark inverse label) so users can scan the sheet and see the
 * current mode at a glance — Apple-Music single-choice semantics.
 *
 * The sheet is NOT a chain of nested Modals; closing it (tap
 * outside, back button, or selecting an option) fully unmounts
 * the Modal instance. Selecting an option closes the sheet
 * BEFORE invoking the callback, so the chrome's chrome-auto-hide
 * timer (W3.5) can reset correctly.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.3 + TRACKER Phase 3.1.
 */

import * as React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../../theme';
import {radius, spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import type {RepeatMode} from '../../../../infrastructure/player';

export interface ModeOption {
  /** V19 mode vocabulary. */
  mode: RepeatMode;
  /** User-facing label. */
  label: string;
}

export const MODE_OPTIONS: readonly ModeOption[] = [
  {mode: 'off', label: 'Off'},
  {mode: 'one', label: 'Repeat one'},
  {mode: 'all', label: 'Repeat all'},
] as const;

export interface ModeSheetProps {
  visible: boolean;
  currentMode: RepeatMode;
  onSelect: (mode: RepeatMode) => void;
  onClose: () => void;
}

export const ModeSheet: React.FC<ModeSheetProps> = ({
  visible,
  currentMode,
  onSelect,
  onClose,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      accessibilityViewIsModal
    >
      {/* Scrim — tap-outside closes without changing the mode. */}
      <Pressable
        style={[styles.scrim, {backgroundColor: colors.background.scrimDim}]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close repeat mode"
      >
        {/* Card — pointerEvents="box-none" so taps inside the card
            do NOT propagate to the scrim. */}
        <View
          pointerEvents="box-none"
          style={[
            styles.cardContainer,
            {paddingBottom: insets.bottom + 88},
          ]}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.background.elevated,
                borderColor: colors.border.emphasis,
                shadowColor: colors.shadow,
              },
            ]}
            accessibilityRole="menu"
          >
            {MODE_OPTIONS.map(option => {
              const isActive = option.mode === currentMode;
              return (
                <TouchableOpacity
                  key={option.mode}
                  onPress={() => {
                    // Close the sheet BEFORE invoking onSelect so
                    // the chrome's auto-hide timer resets and the
                    // underlying transport row re-renders with the
                    // new mode label.
                    onClose();
                    onSelect(option.mode);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="menuitem"
                  accessibilityLabel={option.label}
                  accessibilityState={{selected: isActive}}
                  style={[
                    styles.row,
                    isActive
                      ? {backgroundColor: colors.accent.goldSoft}
                      : null,
                  ]}
                >
                  <AppText
                    variant="body2"
                    color={isActive ? 'accent' : 'primary'}
                    style={styles.label}
                  >
                    {option.label}
                  </AppText>
                  {isActive ? (
                    <View
                      accessibilityElementsHidden
                      style={[
                        styles.dot,
                        {backgroundColor: colors.accent.gold},
                      ]}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardContainer: {
    paddingHorizontal: spacing.lg,
    alignItems: 'stretch',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    // Shadow to lift the popover off the chrome. Color comes
    // from the theme via the inline style override above.
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44, // a11y hit-target floor
  },
  label: {
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default ModeSheet;
