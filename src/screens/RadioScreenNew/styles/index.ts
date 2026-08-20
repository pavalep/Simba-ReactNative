import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';

export const styles = StyleSheet.create({
  root: {flex: 1},
  searchSection: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: {fontWeight: '600'},
  listContent: {padding: spacing.md, paddingBottom: spacing.xxl + 80},
  separator: {height: spacing.sm},
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    minHeight: 56,
  },
  loadMoreRetry: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
