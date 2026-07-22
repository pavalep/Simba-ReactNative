import React from 'react';
import {View, Image, ImageSourcePropType, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {AppButton} from '../../core/AppButton/AppButton';

interface EmptyStateProps {
  icon?: ImageSourcePropType;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  const {spacing: s} = useTheme();

  return (
    <View style={styles.root}>
      {icon && (
        <Image
          source={icon}
          style={[styles.icon, {tintColor: useTheme().colors.text.tertiary}]}
        />
      )}
      <AppText variant="h3" color="secondary" style={{marginTop: s.md}}>
        {title}
      </AppText>
      {subtitle && (
        <AppText
          variant="body2"
          color="tertiary"
          style={{marginTop: s.xs, textAlign: 'center'}}>
          {subtitle}
        </AppText>
      )}
      {actionLabel && onAction && (
        <AppButton
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          style={{marginTop: s.lg}}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  icon: {
    width: 64,
    height: 64,
    opacity: 0.4,
  },
});
