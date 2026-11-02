import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon, IconName} from '../../utility/SvgIcon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /**
   * 'default' — the full treatment: a card with its own chrome, a 72 px
   *            gold disc and a 48 px glyph. For a surface that has
   *            nothing else on it.
   * 'compact' — the inline treatment: NO card chrome (the shelf around
   *            it already frames it), a 52 px disc and a 24 px glyph.
   *            For a rail that carries its own SectionHeader and its
   *            own gutter.
   *
   * One component, two modes. The app used to ship TWO EmptyState
   * components for these two jobs, and they had already drifted.
   */
  variant?: 'default' | 'compact';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
}) => {
  const {colors, spacing: s} = useTheme();
  const isCompact = variant === 'compact';

  // The compact disc is deliberately smaller: it sits inside a rail
  // that already has a header, and a 72 px disc there reads as a
  // second card.
  const discSize = isCompact ? 52 : 72;
  const iconSize = isCompact ? 24 : 48;

  return (
    <View
      style={[
        styles.root,
        isCompact
          ? styles.rootCompact
          : {
              backgroundColor: colors.background.floating,
              borderColor: colors.border.subtle,
            },
      ]}
      accessibilityRole={isCompact ? 'text' : undefined}
      accessibilityLabel={isCompact ? `${title}. ${description}` : undefined}>
      {/* Gold-accented icon wrapper */}
      <View
        style={[
          styles.iconWrapper,
          {
            backgroundColor: colors.accent.goldDim,
            width: discSize,
            height: discSize,
            borderRadius: discSize / 2,
          },
        ]}>
        <SvgIcon
          name={icon}
          size={iconSize}
          color={colors.accent.gold}
        />
      </View>

      <AppText
        variant={isCompact ? 'bodySmall' : 'h3'}
        color="primary"
        style={isCompact ? styles.titleCompact : {marginTop: s.md}}>
        {title}
      </AppText>

      <AppText
        variant={isCompact ? 'caption' : 'body2'}
        color="tertiary"
        style={{marginTop: s.xs, textAlign: 'center'}}>
        {description}
      </AppText>

      {actionLabel && onAction && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.accent.gold,
              marginTop: isCompact ? spacing.md : s.lg,
            },
          ]}>
          <AppText
            variant="body2"
            color="primary"
            style={isCompact ? styles.actionLabelCompact : undefined}>
            {actionLabel}
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
    padding: spacing.xxxl,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  // The compact mode lives inside a rail that already frames it — a card
  // of its own here would double-frame the empty state.
  rootCompact: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: 0,
    borderWidth: 0,
    borderRadius: 0,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCompact: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontWeight: '700',
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  actionLabelCompact: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
