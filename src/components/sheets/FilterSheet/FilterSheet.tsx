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
import {FONT_FAMILY} from '../../../constants/fontFamily';
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
  /**
   * The option that is applied when the group has NO explicit
   * selection.
   *
   * It is drawn as the current state (gold) so the sheet says what is
   * actually applied, and it does NOT count towards the sheet's
   * "RESET FILTERS" footer: resetting a group that is already at its
   * default changes nothing, so the footer must not offer it.
   */
  defaultKey?: string;
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
            fontFamily: selected
              ? FONT_FAMILY.inter.semibold
              : FONT_FAMILY.inter.medium,
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
  /** The group's EXPLICIT selection — the raw `value` entry, without
   *  the group's default folded in. The press logic uses this one:
   *  a group that is merely at its default has no explicit selection,
   *  so tapping its default chip SELECTS it explicitly (and the
   *  parent's chip strip shows it) instead of clearing nothing. */
  explicitKeys: string[];
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
    explicitKeys,
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
          const next = explicitKeys.includes(rowKey)
            ? explicitKeys.filter(k => k !== rowKey)
            : [...explicitKeys, rowKey];
          onChange(next);
        } else {
          // Single-select: tapping the EXPLICITLY selected chip clears
          // it (the group falls back to its default); otherwise the
          // current array is replaced with the new key.
          onChange(explicitKeys[0] === rowKey ? [] : [rowKey]);
        }
      },
      [group.multiSelect, explicitKeys, onChange],
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
    // The sheet body scrolls, so true-sheet needs a handle on it to size
    // and scroll the sheet. Without this the body measures to zero and
    // the sheet shows only its footer.
    const bodyRef = useRef<ScrollView>(null);
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
    //
    // The group's DEFAULT option is folded into the selected keys when
    // the group has no explicit selection, so the sheet shows what is
    // actually applied. `hasActive` above reads the raw `value`, so a
    // group that is merely at its default never raises the "RESET
    // FILTERS" footer.
    const groupViews = useMemo(
      () =>
        groups.map(group => {
          const limit = group.collapsedRowLimit ?? 0;
          const collapsible = limit > 0 && group.rows.length > limit;
          const hiddenRows = collapsible ? group.rows.slice(limit) : [];
          const explicit = value[group.id] ?? [];
          const hiddenSelected = hiddenRows.some(
            r =>
              r.key !== '' && (explicit.length > 0 ? explicit : [group.defaultKey ?? '']).includes(r.key),
          );
          const selectedKeys =
            explicit.length > 0
              ? explicit
              : group.defaultKey
              ? [group.defaultKey]
              : [];
          const expanded =
            collapsible && (hiddenSelected || !!expandedGroups[group.id]);
          return {
            group,
            collapsible,
            expanded,
            selectedKeys,
            explicitKeys: explicit,
            visibleRows: collapsible && !expanded
              ? group.rows.slice(0, limit)
              : group.rows,
          };
        }),
      [groups, value, expandedGroups],
    );

    const anyExpanded = groupViews.some(g => g.expanded);

    // The sheet is presented with `insetAdjustment="never"` (see
    // `BottomSheet`), so the native sheet does NOT lift itself above the
    // system gesture bar — the consumer's last child has to carry the
    // bottom inset. The RESET footer does, but the BODY did not, so with
    // no active filter (no footer) the last chip row was drawn under the
    // gesture pill. The body therefore carries the inset whenever the
    // footer is not there to carry it.
    const footerShown = !!onReset && hasActive;

    const handleToggleGroup = useCallback((id: string) => {
      setExpandedGroups(prev => ({...prev, [id]: !prev[id]}));
    }, []);

    // Extend the sheet to its full detent while any group is expanded,
    // snap back to the compact detent when everything is hidden again.
    //
    // Keyed on `anyExpanded` alone: opening already presents at
    // `initialSnap`, so re-resizing on the open transition would only
    // race `present()`, which is still in flight at this point.
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
        // Rest at 'auto' so the sheet is exactly as tall as its content:
        // a fixed fraction either clips the last group plus the footer
        // (too short) or leaves a dead panel below them (too tall).
        // The wrapper caps 'auto' at the largest explicit detent, so a
        // long body grows to 92% and scrolls from there.
        snapPoints={['auto', '92%']}
        scrollableRef={bodyRef}
        initialSnap={anyExpanded ? 1 : 0}>
        <ScrollView
          ref={bodyRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              // The footer carries the bottom inset itself (it is the
              // last thing on screen), so the body adds none.
              paddingBottom: footerShown ? 0 : insets.bottom + spacing.sm,
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          {groupViews.map(
            ({group, collapsible, expanded, selectedKeys, explicitKeys, visibleRows}, idx) => (
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
                selectedKeys={selectedKeys}
                explicitKeys={explicitKeys}
                visibleRows={visibleRows}
                onChange={keys => onChange(group.id, keys)}
                collapsible={collapsible}
                expanded={expanded}
                onToggle={() => handleToggleGroup(group.id)}
              />
            </React.Fragment>
          ))}

          {/* The RESET FILTERS footer lives INSIDE the scrollable body.
              It used to be a SIBLING of the body, pinned under it — and
              the body takes the sheet's whole height, so a group opened
              with SHOW MORE (the Podcasts sheet has 100+ categories, the
              Movies sheet 21) pushed the footer off the bottom of the
              sheet entirely and RESET became unreachable. As the body's
              last item it is always reachable: in the collapsed sheet
              it sits under the chips, and in the expanded sheet it is
              the end of the scroll. */}
          {footerShown ? (
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
        </ScrollView>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  scroll: {
    // No `flex: 1`. true-sheet measures the content view unconstrained,
    // and a `flexBasis: 0` child measures to ZERO in that pass — the
    // body disappears and only the intrinsic-height footer survives.
    // A natural-height body is what lets the sheet size itself to it.
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
    // The weight lives in the FAMILY key, not in a `fontWeight` prop:
    // `fontWeight: '600'` on the family `Inter` asks Android for
    // `fonts/Inter.ttf` (the rule in `constants/fontFamily.ts` drops the
    // suffix below weight 700), so the SemiBold face was unreachable and
    // the heading was drawn in Inter REGULAR.
    fontFamily: FONT_FAMILY.inter.semibold,
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