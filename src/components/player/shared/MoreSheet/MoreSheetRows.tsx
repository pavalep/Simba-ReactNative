/**
 * WAVE B15 — the ROW GRAMMAR of the player's more sheet.
 *
 * ## Why these are shared
 *
 * The value-row design is a rule, not a look: a setting with a small
 * fixed set of values is `label ......... value ›` and reveals its
 * options inline when tapped, so the HEIGHT of a setting does not depend
 * on how many values it has. That rule is why the sheet stopped being 90%
 * of the screen — the old chip wall grew taller with every speed option.
 *
 * A rule that lives in two places is a rule that will be broken in one of
 * them. Both lanes now draw their rows with these three primitives.
 *
 * ## The three row kinds
 *
 *   - `ValueRow`  — a setting with values (Speed, Sleep timer).
 *   - `ToggleRow` — a boolean, set explicitly. NOT two chips: the old
 *                    two-chip form called `toggle()` from BOTH chips, so
 *                    pressing the chip labelled "Off" while already off
 *                    turned it ON. A control that lies.
 *   - `ActionRow` — a one-shot action. No value, no state.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md` §1.4.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing, radius} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../../components/utility/SvgIcon';

/* ─────────────────────────────────────────────────────────────────────────
 *                             THE GROUP LABEL
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * A small uppercase group label.
 *
 * Was `variant="h2"` display type, six times. Six display headers in a
 * settings panel makes it read as a document rather than a menu, and
 * each one ate a whole line of vertical space.
 */
export const MoreSheetSection: React.FC<React.PropsWithChildren> = ({children}) => {
  const {colors} = useTheme();
  return (
    <AppText
      variant="overline"
      color={colors.text.onMediaMuted}
      style={styles.sectionHeader}
    >
      {children}
    </AppText>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
 *                                 VALUE ROW
 * ──────────────────────────────────────────────────────────────────────── */

export interface SettingOption {
  key: string;
  label: string;
  active: boolean;
  onPress: () => void;
}

interface ValueRowProps {
  label: string;
  /** The current value, shown on the right so the state is never a guess. */
  value: string;
  description?: string;
  expanded: boolean;
  onToggle: () => void;
  options: ReadonlyArray<SettingOption>;
  testID?: string;
}

/**
 * A setting with a small fixed set of values: `label ......... value ›`,
 * revealing its options inline when tapped.
 *
 * The height of a setting is therefore INDEPENDENT of how many values it
 * has. That is the whole point — the old chip wall grew taller with the
 * number of speed options, which is what forced the sheet to 90% of the
 * screen.
 */
export const ValueRow: React.FC<ValueRowProps> = ({
  label,
  value,
  description,
  expanded,
  onToggle,
  options,
  testID,
}) => {
  const {colors} = useTheme();
  return (
    <View style={styles.settingBlock}>
      <Pressable
        testID={testID}
        onPress={onToggle}
        style={({pressed}) => [styles.settingRow, pressed ? styles.pressed : null]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        accessibilityHint={expanded ? 'Hides the options' : 'Shows the options'}
        accessibilityState={{expanded}}
      >
        <AppText variant="body1" color={colors.text.bright}>
          {label}
        </AppText>
        <View style={styles.settingValueGroup}>
          <AppText
            variant="body1"
            color={colors.accent.gold}
            style={styles.settingValue}
          >
            {value}
          </AppText>
          <SvgChevron open={expanded} color={colors.text.onMediaMuted} />
        </View>
      </Pressable>

      {description ? (
        <AppText
          variant="caption"
          color={colors.text.onMediaMuted}
          style={styles.settingDescription}
        >
          {description}
        </AppText>
      ) : null}

      {expanded ? (
        <View
          testID={testID ? `${testID}-options` : undefined}
          style={[
            styles.options,
            {backgroundColor: colors.background.onMediaPill},
          ]}
        >
          {options.map(opt => (
            <Pressable
              key={opt.key}
              testID={testID ? `${testID}-option-${opt.key}` : undefined}
              onPress={opt.onPress}
              style={({pressed}) => [
                styles.optionRow,
                pressed ? styles.pressed : null,
              ]}
              accessibilityRole="menuitem"
              accessibilityLabel={opt.label}
              accessibilityState={{selected: opt.active}}
            >
              <AppText
                variant="body1"
                color={opt.active ? colors.accent.gold : colors.text.onMediaSoft}
              >
                {opt.label}
              </AppText>
              {opt.active ? (
                <AppText
                  variant="body1"
                  color={colors.accent.gold}
                  style={styles.optionCheck}
                >
                  ✓
                </AppText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
 *                                TOGGLE ROW
 * ──────────────────────────────────────────────────────────────────────── */

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onPress: () => void;
  testID?: string;
}

/**
 * A boolean setting: ONE row that sets an explicit value.
 *
 * The old two-chip form ("Skip silence: Off" / "Skip silence: On") had
 * a defect, not just a look: both chips called `toggle()`, so pressing
 * the chip that said "Off" while it was already off turned it on. An
 * explicit setter makes that state unrepresentable.
 */
export const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  value,
  onPress,
  testID,
}) => {
  const {colors} = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({pressed}) => [
        styles.settingRow,
        styles.settingBlockRow,
        pressed ? styles.pressed : null,
      ]}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{checked: value}}
    >
      <AppText variant="body1" color={colors.text.bright}>
        {label}
      </AppText>
      <View style={styles.settingValueGroup}>
        <AppText
          variant="body1"
          color={value ? colors.accent.gold : colors.text.onMediaMuted}
          style={styles.settingValue}
        >
          {value ? 'On' : 'Off'}
        </AppText>
        {/* The switch track is a second, non-colour channel for the
            state, so it does not rely on gold-vs-grey alone. */}
        <View
          style={[
            styles.switchTrack,
            {
              backgroundColor: value
                ? colors.accent.gold
                : colors.background.onMediaPillBorder,
            },
          ]}
        >
          <View
            style={[
              styles.switchThumb,
              // W8.7: was `text.inverse`, i.e. the near-black ink. On
              // a GOLD track that happened to be the right contrast by
              // accident, but on the OFF track it is a black dot on a
              // 16%-white pill — invisible. `text.bright` is correct on
              // both states and reads as one switch, not two.
              {backgroundColor: colors.text.bright},
              value ? styles.switchThumbOn : styles.switchThumbOff,
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
 *                                ACTION ROW
 * ──────────────────────────────────────────────────────────────────────── */

interface ActionRowProps {
  label: string;
  onPress: () => void;
  testID?: string;
  isLast?: boolean;
}

/** A one-shot action — no value, no state, nothing to expand. */
export const ActionRow: React.FC<ActionRowProps> = ({
  label,
  onPress,
  testID,
  isLast,
}) => {
  const {colors} = useTheme();
  return (
    <>
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({pressed}) => [
          styles.settingRow,
          styles.settingBlockRow,
          pressed ? styles.pressed : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <AppText variant="body1" color={colors.text.bright}>
          {label}
        </AppText>
        <SvgChevron open={false} color={colors.text.onMediaMuted} />
      </Pressable>
      {!isLast ? (
        <View
          style={[styles.listDivider, {backgroundColor: colors.border.emphasis}]}
        />
      ) : null}
    </>
  );
};

/**
 * Chevron affordance. Rotates to point UP when its row is expanded.
 *
 * This is a PLAIN GLYPH, deliberately not a `PlayerControl`. It was
 * first written as one with a no-op `onPress`, which is precisely the
 * defect this sheet exists to remove: a focusable, labelled, tappable
 * node that does nothing when tapped. A decorative indicator must not
 * be in the accessibility tree or the tap order at all — the ROW is
 * the control, and the chevron only reports its state.
 */
const SvgChevron: React.FC<{open: boolean; color: string}> = ({
  open,
  color,
}) => (
  <View pointerEvents="none" style={styles.chevron} accessibilityElementsHidden>
    <SvgIcon
      name={open ? 'chevronUp' : 'chevronDown'}
      size={18}
      color={color}
    />
  </View>
);

/* ─────────────────────────────────────────────────────────────────────────
 *                                  STYLES
 * ──────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    letterSpacing: 1.2,
  },
  settingBlock: {
    marginBottom: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // 52 px, above the 44 pt floor, because these are the sheet's
    // primary targets and they sit densely.
    minHeight: 52,
    paddingHorizontal: spacing.xs,
  },
  settingBlockRow: {
    paddingHorizontal: 0,
  },
  pressed: {
    opacity: 0.6,
  },
  settingValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: {
    fontVariant: ['tabular-nums'],
  },
  settingDescription: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  options: {
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  optionCheck: {
    marginLeft: spacing.sm,
  },
  chevron: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    // The fill is `text.bright` (the app's bright ink) — the correct
    // pairing for a thumb sitting on the gold track. It is applied
    // inline in `ToggleRow` rather than here, because these are
    // module-scope styles and `colors` is only in reach inside a
    // component.
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    alignSelf: 'flex-start',
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
