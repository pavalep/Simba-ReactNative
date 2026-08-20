import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';

export const styles = StyleSheet.create({
  root: {flex: 1},
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scopeSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 80,
  },
  separator: {height: spacing.sm},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: {flex: 1, gap: 2},
  name: {fontWeight: '600'},
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
