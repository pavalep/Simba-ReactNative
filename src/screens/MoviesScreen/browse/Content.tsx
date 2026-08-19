// ─── Movies Screen — per-screen Content copy ──────────────────────────
// Per-screen copy of the v10 SectionContent component (data + rows
// modes, skeletons, ErrorState/EmptyState). Copied so each screen owns
// its own shell without a shared `sections/` folder.

import React, {useRef} from 'react';
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
export type SectionViewMode = 'grid' | 'list';

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
  state: SectionContentState;
  error?: SectionErrorCopy;
  empty?: SectionEmptyCopy;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  data?: readonly T[];
  renderItem?: ListRenderItem<T>;
  keyExtractor?: (item: T, index: number) => string;
  view?: SectionViewMode;
  numColumns?: number;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  onEndReached?: (info: {distanceFromEnd: number}) => void;
  onEndReachedThreshold?: number;
  columnWrapperStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  removeClippedSubviews?: boolean;
  testID?: string;
  route?: string;
  tabKey?: string;
  children?: React.ReactNode;
}

export function SectionContent<T>(props: SectionContentProps<T>) {
  const {colors} = useTheme();
  const {
    state, error, empty, onRetry, refreshing = false, onRefresh,
    data, renderItem, keyExtractor, view = 'grid', numColumns,
    ListHeaderComponent, ListFooterComponent, onEndReached,
    onEndReachedThreshold = 0.4, columnWrapperStyle,
    contentContainerStyle, removeClippedSubviews, testID, route, tabKey,
    children,
  } = props;

  const dataMode = data !== undefined && renderItem !== undefined;
  const columns = view === 'list' ? 1 : numColumns ?? 2;
  const userDraggedRef = useRef(false);
  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent.gold}
      colors={[colors.accent.gold]}
    />
  );

  if (state === 'loading') {
    if (view === 'grid') return <SkeletonList count={6} view="grid" />;
    return (
      <View style={styles.padded}>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (dataMode) {
    const listTestID =
      testID ?? (route && tabKey ? `section-${route}-${tabKey}-list` : undefined);
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
            description={empty?.suggestion ?? 'Try a different search or category.'}
            actionLabel={empty?.actionLabel}
            onAction={empty?.onAction}
          />
        )}
      </View>
    ) : null;

    return (
      <FlatList
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
        onScrollBeginDrag={() => { userDraggedRef.current = true; }}
        onEndReached={info => {
          if (!userDraggedRef.current) return;
          onEndReached?.(info);
        }}
        onEndReachedThreshold={onEndReachedThreshold}
        removeClippedSubviews={columns > 1 ? false : removeClippedSubviews}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      />
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
    const emptySuggestion = empty?.suggestion ?? 'Try a different search or category.';
    return (
      <View style={styles.center} accessible accessibilityRole="summary"
        accessibilityLabel={`${emptyTitle}. ${emptySuggestion}`}>
        <EmptyState icon={empty?.icon ?? 'search'} title={emptyTitle}
          description={emptySuggestion} actionLabel={empty?.actionLabel}
          onAction={empty?.onAction} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.ready} contentContainerStyle={styles.readyContent}
      showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg},
  padded: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  ready: {flex: 1},
  readyContent: {paddingHorizontal: spacing.md, paddingBottom: spacing.xl},
  gridContent: {padding: spacing.sm},
  gridRow: {gap: spacing.sm, paddingHorizontal: spacing.sm, marginBottom: spacing.sm},
  listContent: {paddingHorizontal: spacing.md, paddingBottom: spacing.xl},
  listSlot: {paddingVertical: spacing.xl, alignItems: 'center'},
  listSlotGrow: {flexGrow: 1, justifyContent: 'center'},
});