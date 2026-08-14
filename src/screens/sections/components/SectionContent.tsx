// ─── v10: Unified Section Content — States Scaffolding ──────────────────
// Wave 2 (Phase 2.3). Every section tab renders through one of 4 content
// slots (spec §5: "Grid/List scaffolding + states"):
//
//   loading → SkeletonList             (no spinner flash — skeleton convention)
//   error   → ErrorState + retry       (a11y alert; retry → ctx.onRetry)
//   empty   → EmptyState               (section-aware title + suggestion)
//   ready   → ScrollView + RefreshControl (gold tint) wrapping non-scrollable rows
//
// Offline is NOT a slot: cached data keeps rendering under a shell-level
// banner strip (see SectionBrowseLayout). Pull-to-refresh contract:
//   • row-based sections render children inside SectionContent's ScrollView;
//   • FlatList sections (Movies grid etc.) must NOT nest lists — drop the
//     exported SectionRefreshControl into their own list's `refreshControl`
//     prop instead (Phase 2.3 error fix — RefreshControl-in-ScrollView
//     double-scroll warning).

import React from 'react';
import {RefreshControl, ScrollView, View, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {ErrorState} from '../../../components/feedback/ErrorState/ErrorState';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {SkeletonList} from '../../../components/core/Skeleton/SkeletonList';
import type {IconName} from '../../../components/utility/SvgIcon';

export type SectionContentState = 'loading' | 'error' | 'empty' | 'ready';

/** Empty-slot copy — section-aware title + suggestion (replaces Music's
 *  bespoke "prompt" empties without losing their copy). */
export interface SectionEmptyCopy {
  icon?: IconName;
  title: string;
  suggestion: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface SectionErrorCopy {
  title?: string;
  message: string;
}

export interface SectionContentProps {
  /** Which state slot to render. */
  state: SectionContentState;
  /** Error-slot copy (ErrorState). */
  error?: SectionErrorCopy;
  /** Empty-slot copy (EmptyState). */
  empty?: SectionEmptyCopy;
  /** Error-slot retry button → ctx.onRetry. */
  onRetry?: () => void;
  /** Ready-slot pull-to-refresh: in-flight flag. */
  refreshing?: boolean;
  /** Ready-slot pull-to-refresh trigger. */
  onRefresh?: () => void;
  /** Ready-slot rows — MUST be non-scrollable (SectionContent owns the scroll). */
  children?: React.ReactNode;
}

export const SectionContent: React.FC<SectionContentProps> = ({
  state,
  error,
  empty,
  onRetry,
  refreshing = false,
  onRefresh,
  children,
}) => {
  const {colors} = useTheme();

  if (state === 'loading') {
    return (
      <View style={styles.padded}>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.center}>
        <ErrorState
          title={error?.title}
          message={error?.message ?? 'Could not load this section.'}
          onRetry={onRetry}
        />
      </View>
    );
  }

  if (state === 'empty') {
    const emptyTitle = empty?.title ?? 'Nothing here yet';
    const emptySuggestion =
      empty?.suggestion ?? 'Try a different search or category.';
    return (
      // One grouped announcement (title + suggestion) for screen readers.
      <View
        style={styles.center}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`${emptyTitle}. ${emptySuggestion}`}>
        <EmptyState
          icon={empty?.icon ?? 'search'}
          title={emptyTitle}
          description={emptySuggestion}
          actionLabel={empty?.actionLabel}
          onAction={empty?.onAction}
        />
      </View>
    );
  }

  // ready — the shell's single scroll surface per tab.
  return (
    <ScrollView
      style={styles.ready}
      contentContainerStyle={styles.readyContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent.gold}
          colors={[colors.accent.gold]}
        />
      }>
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  padded: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ready: {
    flex: 1,
  },
  readyContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
});

/**
 * RefreshControl for sections that render their own FlatList/ScrollView
 * (gold tint per app convention). Never nest it inside SectionContent's own
 * ScrollView — use it on the section's list `refreshControl` prop instead.
 */
export const SectionRefreshControl: React.FC<{
  refreshing: boolean;
  onRefresh?: () => void;
}> = ({refreshing, onRefresh}) => {
  const {colors} = useTheme();
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent.gold}
      colors={[colors.accent.gold]}
    />
  );
};
