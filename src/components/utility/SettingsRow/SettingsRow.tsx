import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';

interface SettingsRowProps {
  label: string;
  description?: string | React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  /**
   * Overrides the spoken label.
   *
   * The default is the visible label (plus the description), which is
   * right for a plain row. A row that carries a COUNT in its trailing
   * cluster says it here, because the count is otherwise invisible to
   * a screen reader.
   */
  accessibilityLabel?: string;
  /**
   * The label's colour.
   *
   * `primary` is the default for every row. `error` is for the ONE
   * destructive row a list carries — three red rows in a row read as
   * an error screen, so the destructive action is marked once and the
   * rest stay quiet.
   */
  labelColor?: 'primary' | 'error';
}

export const SettingsRow: React.FC<SettingsRowProps> = React.memo<SettingsRowProps>(
  ({
    label,
    description,
    trailing,
    onPress,
    accessibilityLabel,
    labelColor = 'primary',
  }) => {
    const {colors} = useTheme();

    const content = (
      <View style={[styles.root, {borderBottomColor: colors.border.subtle}]}>
        <View style={styles.textCol}>
          <AppText variant="body2" color={labelColor}>
            {label}
          </AppText>
          {description && (
            <AppText variant="caption" color="tertiary" style={{marginTop: 2}}>
              {description}
            </AppText>
          )}
        </View>
        {trailing && <View style={styles.trailing}>{trailing}</View>}
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={
            accessibilityLabel ??
            (description ? `${label}, ${description}` : label)
          }>
          {content}
        </TouchableOpacity>
      );
    }
    return content;
  },
);

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  textCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  trailing: {
    flexShrink: 0,
  },
});
