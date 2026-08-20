// ─── Music — screen styles ──────────────────────────────────────────
// FlatList scaffolding owned by index.tsx.

import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';

export const createMusicScreenStyles = () =>
  StyleSheet.create({
    sectionRoot: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: spacing.md,
    },
    listSlotGrow: {
      flexGrow: 1,
      justifyContent: 'center',
    },
  });
