import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';

// The Home FAB's size, shape and position live in the ONE shared
// component (`components/core/Fab/Fab`). A second copy of "56" here is
// exactly the kind of number that drifts.
export const homeScreenStyles = StyleSheet.create({
  root: {flex: 1},
  scrollContent: {paddingTop: spacing.md},
});
