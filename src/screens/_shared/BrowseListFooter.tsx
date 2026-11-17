// ─── The browse lists' in-flow footer — the ONE owner ────────────────
//
// Grammar element 7. Every paged browse list ends with a footer that
// lives INSIDE the list (the FlatList's `ListFooterComponent`), and it
// has exactly four branches — the four things that can be true of a
// paged list:
//
//   loading   — the next page is on its way.
//   error     — the next page failed; tapping retries it.
//   caught up — the source has given everything it has.
//   spacer    — nothing to say, but the same footprint, so the list's
//               bottom edge does not jump as the footer toggles.
//
// WHY THIS FILE EXISTS
// --------------------
// Music had a four-branch footer. Radio and Live TV had a two-branch
// one (an orb, and a retry pill) and neither could reach either of its
// own branches — and neither ever said the list was finished. Three
// surfaces, three copies, and the copies disagreed about what a footer
// is. The rule is now here, once.
//
// The three strings live here too, because they are the same words on
// every surface: "Loading more…", "Couldn't load more — tap to retry",
// "You're all caught up." A surface that needs different words passes
// its own; it does not re-implement the branches.
//
// GEOMETRY
// --------
// The footer pulls ITSELF down into the clearance the list reserved for
// the FAB, so the loader row lands on the button's own line instead of
// floating 68 dp above the bottom edge — see `./browseFooter.ts`.

import React, {useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';

import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import type {ColorTokens} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {BROWSE_FOOTER_MARGIN_BOTTOM} from './browseFooter';

export interface BrowseFooterProps {
  /** The next page is in flight. */
  isLoadingMore: boolean;
  /** The scope has loaded at least once. */
  hasLoaded: boolean;
  /** The last fetch failed. */
  error: string | null;
  /** Terminal state — the source has no more pages. */
  reachedEnd: boolean;
  /** How many rows are on screen. */
  shown: number;
  /** Retry the page that failed. */
  onLoadMore: () => void;
  /**
   * The line to say when the list ends — for a source whose end is not
   * simply "everything".
   *
   * The archive refuses to page past 10,000 rows (measured: HTTP 507 on
   * page 251), so the Movies list ends at a WINDOW and says so, with both
   * numbers, instead of claiming "You're all caught up." That is a LABEL
   * on this footer, not a second footer: the branches are the same four.
   */
  endLabel?: string;
  /** Optional overrides — the branches are the same, the words may not be. */
  loadingMoreLabel?: string;
  loadMoreRetryLabel?: string;
  caughtUpLabel?: string;
}

const DEFAULT_LABELS = {
  loadingMore: 'Loading more…',
  loadMoreRetry: "Couldn't load more — tap to retry",
  caughtUp: "You're all caught up.",
};

export const BrowseFooter: React.FC<BrowseFooterProps> = ({
  isLoadingMore,
  hasLoaded,
  error,
  reachedEnd,
  shown,
  onLoadMore,
  endLabel,
  loadingMoreLabel = DEFAULT_LABELS.loadingMore,
  loadMoreRetryLabel = DEFAULT_LABELS.loadMoreRetry,
  caughtUpLabel = DEFAULT_LABELS.caughtUp,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createBrowseFooterStyles(colors), [colors]);

  return (
    <View style={styles.footerWrap}>
      {isLoadingMore ? (
        <View style={styles.footerRow}>
          <ActivityOrb size={22} />
          <AppText variant="caption" color="tertiary">
            {loadingMoreLabel}
          </AppText>
        </View>
      ) : !!error && hasLoaded ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onLoadMore}
          style={styles.loadMoreRetry}
          accessibilityRole="button"
          accessibilityLabel={loadMoreRetryLabel}>
          <AppText variant="caption" color="secondary">
            {loadMoreRetryLabel}
          </AppText>
        </TouchableOpacity>
      ) : reachedEnd && shown > 0 ? (
        // Only when there IS a list — an empty result set already says
        // "No popular tracks found." above it, and a second end-of-list
        // line under an empty list says nothing.
        //
        // `endLabel` is the source's own ending, when it has one.
        <AppText variant="caption" color="secondary" style={styles.footerText}>
          {endLabel ?? caughtUpLabel}
        </AppText>
      ) : (
        // Idle spacer — the same footprint as the active branches, so the
        // FlatList's bottom edge does not jump as the footer toggles.
        <View style={styles.footerSpacer} />
      )}
    </View>
  );
};

const createBrowseFooterStyles = (colors: ColorTokens) =>
  ({
    footerWrap: {
      // `minHeight` pins the slot's geometry across all branches
      // (nothing / loading / retry / caught up), so switching state never
      // reflows the FlatList's bottom edge.
      paddingVertical: spacing.md,
      minHeight: 56,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      // The footer gives the list's FAB clearance back, so the loader row
      // lands on the button's own line instead of floating 68 dp above the
      // bottom edge. See `./browseFooter.ts`.
      marginBottom: BROWSE_FOOTER_MARGIN_BOTTOM,
    },
    footerSpacer: {
      // Height identical to `footerRow`'s visual footprint so the bottom
      // edge doesn't jump as the footer state toggles.
      height: 28,
    },
    footerRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    footerText: {
      opacity: 0.85,
    },
    loadMoreRetry: {
      borderWidth: 1,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderColor: colors.background.highlight,
      // The app's touch-target floor, and this pill was 28 dp.
      //
      // Its own height was `borderWidth 1 + paddingVertical 4 + a caption
      // at lineHeight 18` = 28 — under the 44 dp the app states as its
      // minimum everywhere else (`PlayerControl.tsx` CONTROL_TARGET = 44,
      // "Never smaller"; `AudioSeekBar.tsx`; `FollowedPodcastsScreen`).
      // The text and the border do not change: the pill is the same, with
      // the height a finger can actually hit.
      //
      // The footer's own slot is `minHeight: 56`, so the list's bottom edge
      // does not move, and no board draws this pill.
      minHeight: 44,
      justifyContent: 'center' as const,
    },
  });
