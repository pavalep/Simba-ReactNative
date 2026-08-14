// ─── v10: Unified Section Content — States + List Scaffolding ───────────
// Wave 2 (Phase 2.3) → Wave 4 (Phase 4.3). Every section tab renders
// through SectionContent (spec §5: "Grid/List scaffolding + states"):
//
//   loading → skeleton
//   error   → ErrorState + retry
//   empty   → EmptyState
//   ready   → DATA mode (FlatList grid/list) OR ROWS mode (ScrollView rows)
//
// Phase 4.3 adds DATA MODE: a FlatList driven by `data`/`renderItem` with
// the shared grid/list math (Movies-parity spacing — see styles), a
// ListHeaderComponent slot (chips that scroll with content, Radio parity),
// pagination pass-through (onEndReached), empty/error slots rendered INSIDE
// the list (so pull-to-refresh still works on empty/error screens), the
// gold RefreshControl on the list root, `removeClippedSubviews={false}` on
// grids (Android blank-cell fix) and the `section-{route}-{tabKey}-list`
// testID convention. The list remounts on a numColumns change (`key`) so
// grid ↔ list toggles can never render with a stale column count.
//
// ROWS MODE (`children`, Phase 2.3) stays for row-based sections — the
// ScrollView owns scrolling; children MUST be non-scrollable.
//
// Offline is NOT a slot: cached data keeps rendering under a shell-level
// banner strip (see SectionBrowseLayout). Pull-to-refresh contract:
//   • data mode: RefreshControl is attached to the FlatList root here;
//   • rows mode: it wraps children in a ScrollView with the same control.

import React from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  View,
  StyleSheet,
  type ListRenderItem,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {ErrorState} from '../../../components/feedback/ErrorState/ErrorState';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {SkeletonList} from '../../../components/core/Skeleton/SkeletonList';
import type {IconName} from '../../../components/utility/SvgIcon';

export type SectionContentState = 'loading' | 'error' | 'empty' | 'ready';

/** Grid vs single-column list — mirrors the options-sheet `view` group
 *  keys (`ctx.options.view === 'list' ? 'list' : 'grid'`). */
export type SectionViewMode = 'grid' | 'list';

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

export interface SectionContentProps<T> {
  /** Which state slot to render. */
  state: SectionContentState;
  /** Error-slot copy (ErrorState). */
  error?: SectionErrorCopy;
  /** Empty-slot copy (EmptyState). */
  empty?: SectionEmptyCopy;
  /** Error-slot retry button → ctx.onRetry. */
  onRetry?: () => void;
  /** Pull-to-refresh: in-flight flag. */
  refreshing?: boolean;
  /** Pull-to-refresh trigger. */
  onRefresh?: () => void;

  // ── DATA MODE (FlatList scaffold) ──────────────────────────────────────
  /** Rows to render. Provide with `renderItem` to enable data mode. */
  data?: readonly T[];
  /** Card/row renderer — cards must be non-scrollable. */
  renderItem?: ListRenderItem<T>;
  /** Stable per-item key (recommended; falls back to the index). */
  keyExtractor?: (item: T, index: number) => string;
  /** 'grid' = 2 columns, 'list' = single column (driven by options.view). */
  view?: SectionViewMode;
  /** Override the grid column count (default 2). */
  numColumns?: number;
  /** Slot ABOVE the rows — chips that scroll with content (Radio parity). */
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  /** Slot BELOW the rows — load-more footer (pagination). */
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  /** Pagination trigger (Movies parity: threshold 0.4). */
  onEndReached?: (info: {distanceFromEnd: number}) => void;
  onEndReachedThreshold?: number;
  /** Grid row wrapper override — default matches the Movies grid math. */
  columnWrapperStyle?: StyleProp<ViewStyle>;
  /** Container override — defaults differ per view mode. */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Android blank-cell fix: grids force false; overridable for lists. */
  removeClippedSubviews?: boolean;
  /** testID override; default follows `section-{route}-{tabKey}-list`. */
  testID?: string;
  /** Route key for the standard testID (sections pass config.route). */
  route?: string;
  /** Tab key for the standard testID (sections pass tab.key). */
  tabKey?: string;

  // ── ROWS MODE (ScrollView scaffold) ────────────────────────────────────
  /** Ready-slot rows — MUST be non-scrollable (SectionContent owns the scroll). */
  children?: React.ReactNode;
}

export const SectionContent = <T,>(props: SectionContentProps<T>) => {
  const {colors} = useTheme();
  const {
    state,
    error,
    empty,
    onRetry,
    refreshing = false,
    onRefresh,
    data,
    renderItem,
    keyExtractor,
    view = 'grid',
    numColumns,
    ListHeaderComponent,
    ListFooterComponent,
    onEndReached,
    onEndReachedThreshold = 0.4,
    columnWrapperStyle,
    contentContainerStyle,
    removeClippedSubviews,
    testID,
    route,
    tabKey,
    children,
  } = props;

  const dataMode = data !== undefined && renderItem !== undefined;
  const columns = view === 'list' ? 1 : numColumns ?? 2;

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent.gold}
      colors={[colors.accent.gold]}
    />
  );

  if (state === 'loading') {
    return (
      <View style={styles.padded}>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (dataMode) {
    // Standard testID convention (Phase 4.3 step 7).
    const listTestID =
      testID ??
      (route && tabKey ? `section-${route}-${tabKey}-list` : undefined);
    // Empty/error slots live INSIDE the list (ListEmptyComponent) so
    // pull-to-refresh still works on empty/error screens (step 4).
    const isEmptySlot = state === 'empty' || state === 'error';
    const emptySlot = isEmptySlot ? (
      <View style={styles.listSlot}>
        {state === 'error' ? (
          <ErrorState
            title={error?.title}
            message={error?.message ?? 'Could not load this section.'}
            onRetry={onRetry}
          />
        ) : (
          <EmptyState
            icon={empty?.icon ?? 'search'}
            title={empty?.title ?? 'Nothing here yet'}
            description={
              empty?.suggestion ?? 'Try a different search or category.'
            }
            actionLabel={empty?.actionLabel}
            onAction={empty?.onAction}
          />
        )}
      </View>
    ) : null;

    return (
      <FlatList
        // Remount on column-count change — FlatList can't switch numColumns
        // in place (grid ↔ list toggle via the options sheet).
        key={`section-list-${columns}`}
        testID={listTestID}
        style={styles.ready}
        data={state === 'ready' ? data : []}
        renderItem={renderItem}
        keyExtractor={keyExtractor ?? ((_, index) => String(index))}
        numColumns={columns}
        columnWrapperStyle={
          columns > 1 ? columnWrapperStyle ?? styles.gridRow : undefined
        }
        contentContainerStyle={[
          view === 'list' ? styles.listContent : styles.gridContent,
          contentContainerStyle,
          isEmptySlot ? styles.listSlotGrow : null,
        ]}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={emptySlot}
        onEndReached={onEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        removeClippedSubviews={
          columns > 1 ? false : removeClippedSubviews
        }
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      />
    );
  }

  // ── ROWS MODE ──────────────────────────────────────────────────────────
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
      refreshControl={refreshControl}>
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
  // Grid contract (Movies parity — step 8): container 8px + row 8px
  // horizontal padding → 16px edge; 8px column gap; 8px row margin +
  // 8px container → 16px row gap. Reproduces the pre-migration grid
  // exactly so Wave 5's card re-parent is snapshot-identical.
  gridContent: {
    padding: spacing.sm,
  },
  gridRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  // List contract: matches the rows-mode edge padding so grid ↔ list
  // toggle never drifts the outer margin rhythm.
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  listSlot: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  listSlotGrow: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

/**
 * RefreshControl for sections that render their own FlatList/ScrollView
 * (gold tint per app convention). Never nest it inside SectionContent's own
 * ScrollView — use it on the section's list `refreshControl` prop instead.
 * Data-mode sections get it automatically from SectionContent.
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
