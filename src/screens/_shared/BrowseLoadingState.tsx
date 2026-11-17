// ─── The browse list's loading state — the ONE owner ───────────────────
//
// Grammar element 5. Every paged browse list has exactly four content
// states, and this is the first one: the page is loading.
//
// WHY THIS FILE EXISTS
// --------------------
// The app had TWO loading languages, and the second one was a copy of the
// first:
//
//   A — the pill: an `ActivityOrb` (24) beside a caption, inside an
//       elevated rounded pill, anchored 20 % from the top of the list
//       area. Music, Movies and Podcasts each had their OWN copy of the
//       geometry — three identical files (`MusicScreen/styles/
//       ListStates.styles.ts`, `MoviesScreen/styles/ListStates.styles.ts`,
//       `PodcastsScreen/styles/PodcastsOverlays.styles.ts`).
//
//   B — the placeholder: the shared `Placeholder variant="loading"` — an
//       orb of 36, a `body2` caption, at 30 % from the top, with no pill
//       at all. Radio, Live TV, Audiobooks, Archive, Shows, Genre, Search
//       and FolderBrowser drew this.
//
// So navigating from Music to Radio changed the loading component. The
// wave's own grammar (`md/WAVE_B13_MUSIC_RADIO.md` §2, element 5) names A:
// *"loading (an `ActivityOrb` in an elevated pill)"*.
//
// The words stay with the surface — "Loading tracks…", "Loading movies…",
// "Loading podcasts…", "Loading stations…", "Loading channels…" — because
// the pill says what is loading. The COMPONENT and its geometry are one.
//
// The pill is anchored at 20 %, not in the middle: it reads as a status
// pill over the page, the way a music app's now-playing spinner sits over
// its own content — not as a splash screen.

import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';

import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {ColorTokens} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';

export interface BrowseLoadingStateProps {
  /** What is loading. Each surface says its own. */
  label?: string;
}

export const BrowseLoadingState: React.FC<BrowseLoadingStateProps> = ({
  label = 'Loading…',
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createBrowseLoadingStyles(colors), [colors]);

  return (
    <View style={styles.root} testID="browse-loading-state">
      <View style={styles.pill}>
        <ActivityOrb size={24} />
        <AppText variant="caption" color="secondary" style={styles.text}>
          {label}
        </AppText>
      </View>
    </View>
  );
};

const createBrowseLoadingStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      // Anchored at ~20 % from the top of the list area, so the pill reads
      // as a status pill and not as a splash-screen placeholder.
      paddingTop: '20%',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background.elevated,
    },
    text: {
      opacity: 0.85,
    },
  });
