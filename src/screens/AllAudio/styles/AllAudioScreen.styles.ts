// ─── All Audio — screen styles ─────────────────────────────────────────
// FlatList scaffolding owned by the content component.
//
// The card and row styles live here too: they are the same two
// shapes the old hand-rolled screen drew, moved out of the component
// and into a factory, so the file that owns the layout is the file
// that owns the list.

import {StyleSheet, Dimensions} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
export const COLUMN_COUNT = 2;
export const GAP = 12;
 const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - GAP) / COLUMN_COUNT;

export const createAllAudioScreenStyles = () =>
  StyleSheet.create({
    sectionRoot: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    listContent: {
      // The page's one gutter — 16 dp, the same as the shell's search
      // field and chip strip above it.
      paddingHorizontal: spacing.lg,
      gap: GAP,
    },
    caption: {
      // The caption sits above the list and under the shell's own
      // chrome, so it carries the shell's gutter.
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    listSlotGrow: {
      // Let the empty slot fill the viewport so the centred
      // EmptyState has real height to anchor against.
      flexGrow: 1,
    },
    card: {
      width: CARD_WIDTH,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
      marginBottom: 4,
    },
    thumb: {
      width: '100%',
      aspectRatio: 16 / 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      paddingHorizontal: 10,
      paddingTop: spacing.sm,
      // 600 lives in the family key ('Inter' + 600 opens the 400 Regular).
      fontFamily: FONT_FAMILY.inter.semibold,
    },
    cardArtist: {
      paddingHorizontal: 10,
      paddingBottom: spacing.sm,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: spacing.xs,
      gap: spacing.md,
    },
    listThumb: {
      width: 44,
      height: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listInfo: {
      flex: 1,
    },
    emptyWrapper: {
      // The empty state is centred in the space the list would have
      // taken, so it does not sit at the top of an otherwise blank
      // page.
      justifyContent: 'center',
    },
  });
