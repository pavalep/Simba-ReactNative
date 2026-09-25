/**
 * V19 W3 Phase 3.1 — `ModeControl` (compact one-value display).
 *
 * The single compact control on Row 3 of the TransportBar that
 * surfaces the current repeat mode. Renders a small label
 * (`Off` / `Repeat one` / `Repeat all`) next to a `repeat` icon;
 * the label is gold-accented when the mode is non-default
 * (`'one'` or `'all'`) and muted-secondary when it's the default
 * (`'off'`).
 *
 * Tap opens `ModeSheet`, which is mounted as a sibling INSIDE
 * this component so the open-state is local. The parent
 * TransportBar doesn't need to know about the sheet — it just
 * embeds `<ModeControl />` once and gets behavior for free.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.3 + TRACKER Phase 3.1.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {useTransport, type RepeatMode} from '../../../../infrastructure/player';
import {ModeSheet} from './ModeSheet';

const MODE_LABEL: Record<RepeatMode, string> = {
  off: 'Off',
  one: 'Repeat one',
  all: 'Repeat all',
};

export const ModeControl: React.FC = () => {
  const {state, commands} = useTransport();
  const {colors} = useTheme();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const isActive = state.repeatMode !== 'off';
  const label = MODE_LABEL[state.repeatMode];
  const labelColor = isActive ? colors.accent.gold : colors.text.tertiary;
  const iconColor = isActive ? colors.accent.gold : colors.text.secondary;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Repeat mode: ${label}. Tap to change.`}
        accessibilityHint="Opens the repeat-mode picker"
        hitSlop={8}
        style={({pressed}) => [
          styles.button,
          pressed ? {opacity: 0.7} : null,
        ]}
      >
        <SvgIcon name="repeat" size={16} color={iconColor} />
        <AppText
          variant="caption"
          style={[styles.label, {color: labelColor}]}
          numberOfLines={1}
        >
          {label}
        </AppText>
      </Pressable>

      <ModeSheet
        visible={sheetOpen}
        currentMode={state.repeatMode}
        onSelect={mode => commands.setRepeatMode(mode)}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 44, // a11y hit-target floor
    minWidth: 44,
    gap: spacing.xs,
  },
  label: {
    fontVariant: ['tabular-nums'],
  },
});

export default ModeControl;
