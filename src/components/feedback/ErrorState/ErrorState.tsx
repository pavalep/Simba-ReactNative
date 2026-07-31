// ────────────────────────────────────────────────────────
// Simba Player — ErrorState Component (Phase 54.7)
// Standard retry/error card reused by every screen that
// loads remote data (podcasts today, TV/radio later).
// ────────────────────────────────────────────────────────

import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import type {IconName} from '../../utility/SvgIcon';

interface ErrorStateProps {
  /** Short headline (default "Something went wrong") */
  title?: string;
  /** Primary message, e.g. the fetch error text */
  message: string;
  /** Show a retry button that calls this */
  onRetry?: () => void;
  retryLabel?: string;
  /** Icon shown above the title (default alertCircle) */
  icon?: IconName;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
  icon = 'alertCircle',
}) => {
  const {colors} = useTheme();

  return (
    <View style={styles.root} accessibilityRole="alert">
      <SvgIcon name={icon} size={44} color={colors.semantic.error} />
      <AppText
        variant="body1"
        color="primary"
        style={styles.title}
        accessibilityRole="header">
        {title}
      </AppText>
      <AppText
        variant="body2"
        color="tertiary"
        style={styles.message}>
        {message}
      </AppText>
      {onRetry && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          style={[
            styles.retryButton,
            {backgroundColor: colors.accent.gold},
          ]}>
          <AppText variant="button" style={styles.retryText}>
            {retryLabel}
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 24,
  },
  retryText: {
    color: '#08080A',
    fontWeight: '600',
  },
});
