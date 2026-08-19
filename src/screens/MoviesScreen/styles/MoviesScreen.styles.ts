// ─── Movies — screen styles ──────────────────────────────────────────
// FlatList scaffolding owned by index.tsx. Row styles live in
// MovieCard (inline), footer in MoviesFooter.styles, empty/error
// states in ListStates (the shared ErrorState/EmptyState).

import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createMoviesScreenStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    sectionRoot: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    listContent: {
      padding: 0,
    },
    gridRow: {
      // Full-bleed mosaic — zero gap, zero row spacing. Cards butt
      // against each other and the screen edge so they read as one
      // continuous image grid (Apple Photos / Spotify album grid
      // parity), not discrete "cards".
      gap: 0,
      marginBottom: 0,
    },
    listSlotGrow: {
      // Let the empty/error slot fill the viewport so the centered
      // EmptyState / ErrorState has real height to anchor against.
      flexGrow: 1,
    },
  });
