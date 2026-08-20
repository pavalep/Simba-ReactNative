import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';

export const styles = StyleSheet.create({
  root: {flex: 1},
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: spacing.xs,
  },
  chipText: {fontWeight: '600'},
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl + 80,
  },
  separator: {height: spacing.sm},
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loadMoreRetry: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
