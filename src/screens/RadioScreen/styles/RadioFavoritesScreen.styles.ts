// ─── Radio — favourites screen styles ────────────────────────────────
// The Radio FAVORITES screen is a SEPARATE route (`RadioFavoritesScreen`),
// not a browse page: it is a plain list of the stations the user saved,
// and it keeps its own chrome.
//
// Its styles live here so the styles barrel can be a barrel of
// FACTORIES — one owner per style group — without this screen having to
// adopt the browse shell's furniture.

import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';

export const createRadioFavoritesStyles = () =>
  StyleSheet.create({
    root: {flex: 1},
    listContent: {padding: spacing.md, paddingBottom: spacing.xxl + 80},
  });
