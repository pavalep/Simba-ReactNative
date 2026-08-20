import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';

export const homeScreenStyles = StyleSheet.create({
  root: {flex: 1},
  scrollContent: {paddingTop: spacing.md},
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    zIndex: 99,
  },
});
