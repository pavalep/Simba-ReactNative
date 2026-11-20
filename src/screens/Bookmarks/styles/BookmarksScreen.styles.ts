// ─── Bookmarks — screen styles ─────────────────────────────────────────
// The list scaffolding owned by the content component.

import {StyleSheet} from 'react-native';

export const createBookmarksScreenStyles = () =>
  StyleSheet.create({
    sectionRoot: {
      flex: 1,
    },
    emptyWrapper: {
      flex: 1,
      justifyContent: 'center',
    },
  });