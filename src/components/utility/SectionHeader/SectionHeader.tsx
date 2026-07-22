import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';

interface SectionHeaderProps {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  actionLabel,
  onAction,
}) => {
  const {colors} = useTheme();

  return (
    <View style={styles.root}>
      <AppText variant="overline" color="secondary" style={{letterSpacing: 0.5}}>
        {label}
      </AppText>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <AppText variant="caption" color="accent">
            {actionLabel}
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
