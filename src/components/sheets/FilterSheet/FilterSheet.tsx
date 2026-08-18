// ─── Filter Sheet (universal) ──────────────────────────────────────────
// v10.2 FAB-only filter sheet: ONE bottom sheet for every section's FAB.
// Pure data-driven: the caller passes `groups` (id, title, multiSelect,
// rows[]) + current `value` {[id]: keys[]} + an `onChange(id, keys[])`
// callback.
//
//   • Each group renders as a WRAPPING flow of chip buttons (no horizontal
//     scroll — every option stays visible without extra gestures).
//   • `multiSelect: true` → multiple keys may be active (e.g. Movies
//     categories: "Classic Films + Documentaries"). `multiSelect: false`
//     → at most one key (e.g. Sort by: "Most popular" XOR "Newest").
//     Tapping the active chip in single-select mode clears the group.
//   • Selected chip: SOLID gold fill + dark inverse label.
//   • Unselected chip: neutral surface + primary text + subtle border.
//   • Groups with `collapsedRowLimit` collapse to the first N chips under
//     a "SHOW MORE"/"HIDE" toggle — expanding ALSO extends the sheet to
//     its full detent so every category stays visible in one glance.
//   • First group reserves a 40px zone for true-sheet's native grabber so
//     the heading text never sits at the same y as the handle.
//   • Reset row only appears when something is active.
//
// Data model: every group is `string[]` (0+ keys). Empty array = cleared.
// Single-select groups just have arrays of length 0 or 1.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {
  BottomSheet,
  type BottomSheetHandle,
} from '../BottomSheet/BottomSheet';
import {SvgIcon} from '../../utility/SvgIcon/SvgIcon';
import {AppText} from '../../core/AppText/AppText';

export interface FilterSheetRow {
  key: string;            // '' = "no filter" placeholder row (clears the group)
  label: string;
}

export interface FilterSheetGroup {
  /** Stable id — used as the key in `value`. */
  id: string;
  /** Group heading shown above the row of chips. */
  title: string;
  /**
   * Multi-select toggle. `true` = tap to add/remove from the selection
   * (e.g. Movies categories). `false` = tap to set as the only key
   * (e.g. Sort by). Defaults to `false` for backward compatibility.
   */
  multiSelect?: boolean;
  /**
   * When set, the group renders only the first `collapsedRowLimit` chips
   * plus a "SHOW MORE"/"HIDE" toggle that reveals the rest AND extends
   * the sheet to its full detent (long category lists). Omit for short
   * groups (sort / view).
   */
  collapsedRowLimit?: number;
  rows: FilterSheetRow[];
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  groups: FilterSheetGroup[];
  /** Current selection — a partial record {groupId: selectedKeys[]}. */
  value: Record<string, string[]>;
  /**
   * Called when the user toggles a chip. Receives the FULL new selection
   * for that group (NOT a single key) — multi-select callers can just
   * assign the array; single-select callers read the first element.
   */
  onChange: (groupId: string, keys: string[]) => void;
  /** When provided, shows a "Reset" row at the bottom if anything is active. */
  onReset?: () => void;
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const Chip: React.FC<ChipProps> = React.memo(({label, selected, onPress}) => {
  const {colors} = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole={selected ? 'radio' : 'button'}
      accessibilityState={{selected}}
      accessibilityLabel={label}
      style={[
        styles.chip,
        selected
          ? {
              backgroundColor: colors.accent.gold,
              borderColor: colors.accent.gold,
            }
          : {
              backgroundColor: colors.background.primary,
              borderColor: colors.border.subtle,
            },
      ]}>
      <AppText
        style={[
          styles.chipLabel,
          {
            color: selected
              ? colors.background.primary
              : colors.text.primary,
            fontWeight: selected ? '700' : '500',
          },
        ]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
});

/** One group: heading + wrapping row of chips. Extracted so each
 *  group's `useCallback` lives at the top level (rules-of-hooks). */
const GroupChipRow: React.FC<{
  group: FilterSheetGroup;
  isFirstGroup: boolean;
  selectedKeys: string[];
  /** Rows actually rendered — the collapsed subset when the group is
   *  collapsible and not expanded. */
  visibleRows: FilterSheetRow[];
  onChange: (keys: string[]) => void;
  /** Group has more rows than `collapsedRowLimit` → show toggle. */
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}> = React.memo(
  ({
    group,
    isFirstGroup,
    selectedKeys,
    visibleRows,
    onChange,
    collapsible,
    expanded,
    onToggle,
  }) => {
    const {colors} = useTheme();

    const handlePress = useCallback(
      (rowKey: string) => {
        const multi = group.multiSelect === true;
        // The empty-key row (`''`) is always single-select semantics:
        // tapping it clears the group regardless of multiSelect mode.
        if (rowKey === '') {
          onChange([]);
          return;
        }
        if (multi) {
          // Toggle: include or exclude `rowKey` from the current array.
          const next = selectedKeys.includes(rowKey)
            ? selectedKeys.filter(k => k !== rowKey)
            : [...selectedKeys, rowKey];
          onChange(next);
        } else {
          // Single-select: tapping the active chip clears; otherwise
          // replaces the current array with the new key.
          onChange(selectedKeys[0] === rowKey ? [] : [rowKey]);
        }
      },
      [group.multiSelect, selectedKeys, onChange],
    );

    return (
      <View style={[styles.group, isFirstGroup ? styles.groupFirst : null]}>
        <AppText style={[styles.groupTitle, {color: colors.text.secondary}]}>
          {group.title.toUpperCase()}
        </AppText>
        <View style={styles.chipWrap}>
          {visibleRows.map(row => (
            <Chip
              key={row.key || `${group.id}-empty`}
              label={row.label}
              selected={selectedKeys.includes(row.key) && row.key !== ''}
              onPress={() => handlePress(row.key)}
            />
          ))}
        </View>
        {collapsible ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? 'Hide categories' : 'Show more categories'
            }
            style={styles.toggleRow}>
            <AppText style={[styles.toggleLabel, {color: colors.accent.gold}]}>
              {expanded ? 'HIDE' : 'SHOW MORE'}
            </AppText>
            <SvgIcon
              name={expanded ? 'chevronUp' : 'chevronDown'}
              size={14}
              color={colors.accent.gold}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  },
);

export const FilterSheet: React.FC<FilterSheetProps> = React.memo(
  ({visible, onClose, title = 'Filter', groups, value, onChange, onReset}) => {
    const {colors} = useTheme();
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetHandle>(null);
    // Per-group expansion state (ephemeral UI — resets when the sheet
    // unmounts; filter SELECTIONS live in the parent via `value`).
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
      {},
    );
    const hasActive = Object.values(value).some(
      keys => Array.isArray(keys) && keys.length > 0,
    );

    // Per-group render plan: a group is collapsible when it has more rows
    // than `collapsedRowLimit`. It renders expanded when the user tapped
    // "SHOW MORE" OR when a SELECTED chip sits below the fold (deep-link
    // presets) — otherwise it would hide an active selection.
    const groupViews = useMemo(
      () =>
        groups.map(group => {
          const limit = group.collapsedRowLimit ?? 0;
          const collapsible = limit > 0 && group.rows.length > limit;
          const hiddenRows = collapsible ? group.rows.slice(limit) : [];
          const hiddenSelected = hiddenRows.some(
            r =>
              r.key !== '' && (value[group.id] ?? []).includes(r.key),
          );
          const expanded =
            collapsible && (hiddenSelected || !!expandedGroups[group.id]);
          return {
            group,
            collapsible,
            expanded,
            visibleRows: collapsible && !expanded
              ? group.rows.slice(0, limit)
              : group.rows,
          };
        }),
      [groups, value, expandedGroups],
    );

    const anyExpanded = groupViews.some(g => g.expanded);

    const handleToggleGroup = useCallback((id: string) => {
      setExpandedGroups(prev => ({...prev, [id]: !prev[id]}));
    }, []);

    // Extend the sheet to its full detent while any group is expanded,
    // snap back to the compact detent when everything is hidden again.
    useEffect(() => {
      if (!visible) return;
      sheetRef.current?.resize(anyExpanded ? 1 : 0);
    }, [visible, anyExpanded]);

    return (
      <BottomSheet
        ref={sheetRef}
        visible={visible}
        onClose={onClose}
        title={undefined}
        snapPoints={['48%', '88%']}
        initialSnap={anyExpanded ? 1 : 0}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          {groupViews.map(({group, collapsible, expanded, visibleRows}, idx) => (
            <React.Fragment key={group.id}>
              {idx > 0 ? (
                <View
                  style={[
                    styles.divider,
                    {backgroundColor: colors.border.subtle},
                  ]}
                />
              ) : null}
              <GroupChipRow
                group={group}
                isFirstGroup={idx === 0}
                selectedKeys={value[group.id] ?? []}
                visibleRows={visibleRows}
                onChange={keys => onChange(group.id, keys)}
                collapsible={collapsible}
                expanded={expanded}
                onToggle={() => handleToggleGroup(group.id)}
              />
            </React.Fragment>
          ))}
        </ScrollView>

        {onReset && hasActive ? (
          <>
            <View
              style={[
                styles.footerDivider,
                {backgroundColor: colors.border.subtle},
              ]}
            />
            <View
              style={[
                styles.footer,
                {paddingBottom: insets.bottom + spacing.lg},
              ]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onReset}
                accessibilityRole="button"
                accessibilityLabel="Reset filters"
                style={[
                  styles.resetButton,
                  {
                    backgroundColor: colors.accent.goldDim,
                    borderColor: colors.accent.gold,
                  },
                ]}>
                <AppText
                  style={[styles.resetText, {color: colors.accent.gold}]}>
                  RESET FILTERS
                </AppText>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  group: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
  },
  // Reserved zone for true-sheet's native grabber (~20px tall).
  groupFirst: {
    paddingTop: 40,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
    columnGap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    minHeight: 32,
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 13,
    lineHeight: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
  },
  footer: {
    paddingTop: spacing.sm,
  },
  resetButton: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});