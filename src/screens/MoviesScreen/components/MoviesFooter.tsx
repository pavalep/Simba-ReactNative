// ─── Movies — In-flow Footer ──────────────────────────────────────────
// Lives INSIDE the FlatList (ListFooterComponent) so it sits glued to the
// last row. The wrap reserves a FIXED minHeight across all branches
// (loading / retry / caught-up / spacer) so switching state never reflows
// the FlatList's bottom edge (Podcasts parity).
//
// The four branches are the four things that can be true of a paged
// list, and each one says what is happening:
//
//   loading   — the next page is on its way.
//   error     — the next page failed; tapping retries it.
//   caught up — the source has given everything it has.
//   window    — the source has more, but the ARCHIVE refuses to page
//               past 10,000 rows (measured: HTTP 507 on page 251), so
//               the list ends here. The line says so, with both
//               numbers, instead of claiming "You're all caught up".

import React, {useMemo} from 'react';
import {View, TouchableOpacity} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import {createMoviesFooterStyles} from '../styles';
import text from '../related/textContent.json';

interface Props {
  isLoadingMore: boolean;
  hasLoaded: boolean;
  error: string | null;
  /** Terminal state — no more pages to fetch. */
  reachedEnd: boolean;
  /** How many items are on screen. */
  shown: number;
  /** How many the source says it has. */
  total: number;
  onLoadMore: () => void;
}

export const MoviesFooter: React.FC<Props> = ({
  isLoadingMore,
  hasLoaded,
  error,
  reachedEnd,
  shown,
  total,
  onLoadMore,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createMoviesFooterStyles(colors), [colors]);

  const windowEnd = useMemo(
    () =>
      text.footer.windowEnd
        .replace('{shown}', shown.toLocaleString())
        .replace('{total}', total.toLocaleString()),
    [shown, total],
  );

  return (
    <View style={styles.footerWrap}>
      {isLoadingMore ? (
        <View style={styles.footerRow}>
          <ActivityOrb size={22} />
          <AppText variant="caption" color="secondary" style={styles.footerText}>
            {text.footer.loadingMore}
          </AppText>
        </View>
      ) : !!error && hasLoaded ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onLoadMore}
          style={styles.loadMoreRetry}
          accessibilityRole="button">
          <AppText variant="caption" color="secondary">
            {text.footer.loadMoreRetry}
          </AppText>
        </TouchableOpacity>
      ) : reachedEnd && total > shown && shown > 0 ? (
        <AppText variant="caption" color="secondary" style={styles.footerText}>
          {windowEnd}
        </AppText>
      ) : reachedEnd && shown > 0 ? (
        // Only when there IS a list — an empty result set already says
        // "No movies match your search." above it, and a second
        // end-of-list line under an empty list says nothing.
        <AppText variant="caption" color="secondary" style={styles.footerText}>
          {text.footer.caughtUp}
        </AppText>
      ) : (
        // Idle spacer — same visual footprint as the active branches so
        // the FlatList's bottom edge doesn't jump as the footer toggles.
        <View style={styles.footerSpacer} />
      )}
    </View>
  );
};
