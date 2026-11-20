// ─── History — screen styles ───────────────────────────────────────────
// The list scaffolding owned by the content component.

import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';

export const createHistoryScreenStyles = () =>
  StyleSheet.create({
    sectionRoot: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      minHeight: 56,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: {
      flex: 1,
    },
    progressTrack: {
      height: 3,
      borderRadius: 2,
      marginTop: 6,
      overflow: 'hidden',
    },
    progressFill: {
      height: 3,
      borderRadius: 2,
    },
    emptyWrap: {
      flex: 1,
      justifyContent: 'center',
      paddingBottom: 60,
    },
  });