import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';

interface SettingsRowProps {
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}

export const SettingsRow: React.FC<SettingsRowProps> = React.memo<SettingsRowProps>(({
  label,
  description,
  trailing,
  onPress,
}) => {
  const {colors} = useTheme();

  const content = (
    <View style={[styles.root, {borderBottomColor: colors.border.subtle}]}>
      <View style={styles.textCol}>
        <AppText variant="body2" color="primary">
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
        accessibilityLabel={description ? `${label}, ${description}` : label}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
});

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
