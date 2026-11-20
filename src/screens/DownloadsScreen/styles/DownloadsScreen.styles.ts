// ─── Downloads — screen styles ─────────────────────────────────────────
// The list scaffolding owned by the content component.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';

export const createDownloadsScreenStyles = () =>
  StyleSheet.create({
    sectionRoot: {
      flex: 1,
    },
    glowWarm: {
      position: 'absolute',
      // The warm glow sits at the top-right of the CONTENT, not of the
      // screen: the shell's header is opaque, so a glow anchored to the
      // screen would be hidden behind it.
      top: 0,
      right: -80,
      width: 260,
      height: 260,
      borderRadius: 130,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
    },
    card: {
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '100%',
      borderRadius: 2,
    },
    policyWrap: {marginBottom: spacing.md},
    policyHeader: {gap: 2, marginBottom: spacing.sm},
    chipRow: {flexDirection: 'row', gap: spacing.xs},
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      minWidth: 44,
      alignItems: 'center',
    },
    chipLabel: {
      // 600 lives in the family key ('Inter' + 600 opens the 400 Regular).
      fontFamily: FONT_FAMILY.inter.semibold,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.sm + 2,
      marginBottom: spacing.sm,
      gap: spacing.sm + 2,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: {flex: 1, gap: 1},
    rowTitle: {
      // 600 lives in the family key ('Inter' + 600 opens the 400 Regular).
      fontFamily: FONT_FAMILY.inter.semibold,
    },
    rowActions: {flexDirection: 'row', gap: spacing.xs},
    actionBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyWrap: {flex: 1, justifyContent: 'center'},
  });