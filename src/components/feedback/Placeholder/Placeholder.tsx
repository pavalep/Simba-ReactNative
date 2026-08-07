import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon, IconName} from '../../utility/SvgIcon';
import {ActivityOrb} from '../ActivityOrb/ActivityOrb';

export type PlaceholderVariant =
  /** Spinner + caption. Use while data is being fetched. */
  | 'loading'
  /** Icon + title + optional subtitle. Use for empty/error/prompt states. */
  | 'empty'
  /** Just an icon. Use for the simplest "nothing here" states. */
  | 'icon';

export interface PlaceholderProps {
  /** Visual layout. Defaults to 'empty'. */
  variant?: PlaceholderVariant;
  /**
   * Anchor for the placeholder.
   * - 'top-third' (default): pinned ~30% from the top of the available
   *   area. Use this in list areas where the placeholder is the only
   *   thing on screen and a vertical-centre anchor feels too far from
   *   the search/filter/tab UI above.
   * - 'center': dead-centre of the available area. Use on full-page
   *   detail screens where the placeholder is the entire content.
   * - 'top': pinned to the very top (just under the header). Use when
   *   the placeholder should sit right below the header without
   *   needing to scroll.
   */
  anchor?: 'top-third' | 'center' | 'top';
  /** Title text. Used by 'empty' (and rendered as caption by 'loading'). */
  title?: string;
  /** Optional secondary line. Used by 'empty'. */
  message?: string;
  /**
   * Icon name for the 'empty' / 'icon' variants. Required for 'icon',
   * optional for 'empty' (the 'empty' variant renders an icon
   * circle only when an icon is provided).
   */
  icon?: IconName;
  /**
   * Tint of the icon circle (when icon is provided). Defaults to the
   * theme's accent gold.
   */
  iconColor?: string;
  /** Tint of the icon circle background. Defaults to a dim gold wash. */
  iconBackground?: string;
  /** Optional children rendered below the default content. */
  children?: React.ReactNode;
  /** Extra style overrides (e.g. for paddingBottom on screens with a tab bar). */
  style?: ViewStyle;
}

/**
 * The single canonical placeholder for every screen in the app.
 *
 * Replaces the dozen hand-rolled `centerState` / `centerContainer` /
 * `centerContent` / `emptyContainer` style blocks that were scattered
 * across screens, each implementing the same "icon + text + centered
 * layout" with subtle variations. Now there is one place to tweak
 * layout, anchor, icon style, or typography.
 *
 * Three variants cover the common cases:
 * - `loading`   — spinner + caption. Use for "Loading…"
 * - `empty`     — optional icon + title + optional message. Use for
 *                 "No results", "Couldn't load", "Type to search"
 * - `icon`      — just a single icon. Use for the simplest prompts.
 *
 * Three anchors cover the layout:
 * - `top-third` (default) — ~30% from the top. Best for list areas
 *   with a search/filter row at the top; matches YouTube/Netflix
 *   conventions.
 * - `center`   — dead-centre. Use on full-page detail screens
 *   where the placeholder is the entire content.
 * - `top`      — just below the header. Use sparingly.
 */
export const Placeholder: React.FC<PlaceholderProps> = ({
  variant = 'empty',
  anchor = 'top-third',
  title,
  message,
  icon,
  iconColor,
  iconBackground,
  children,
  style,
}) => {
  const {colors} = useTheme();

  const isLoading = variant === 'loading';
  const isIcon = variant === 'icon';
  const accent = iconColor ?? colors.accent.gold;
  const iconBg = iconBackground ?? colors.accent.goldDim;

  const justifyContent =
    anchor === 'center'
      ? 'center'
      : anchor === 'top'
        ? 'flex-start'
        : 'flex-start';
  const paddingTop =
    anchor === 'center' ? 0 : anchor === 'top' ? spacing.md : '30%';

  return (
    <View style={[styles.root, {justifyContent, paddingTop}, style]}>
      {isLoading && <ActivityOrb size={36} />}

      {!isLoading && icon && (
        <View style={[styles.iconCircle, {backgroundColor: iconBg}]}>
          <SvgIcon name={icon} size={isIcon ? 64 : 48} color={accent} />
        </View>
      )}

      {!isLoading && title && (
        <AppText
          variant={isIcon ? 'h3' : 'body1'}
          color="primary"
          style={styles.title}>
          {title}
        </AppText>
      )}

      {!isIcon && message && (
        <AppText
          variant="body2"
          color="tertiary"
          style={styles.message}>
          {message}
        </AppText>
      )}

      {isLoading && title && (
        <AppText
          variant="body2"
          color="tertiary"
          style={styles.message}>
          {title}
        </AppText>
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
