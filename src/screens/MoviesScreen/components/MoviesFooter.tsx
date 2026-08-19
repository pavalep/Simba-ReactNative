// ─── Movies — In-flow Footer ──────────────────────────────────────────
// Lives INSIDE the FlatList (ListFooterComponent) so it sits glued to the
// last row. The wrap reserves a FIXED minHeight across all branches
// (loading / retry / caught-up / spacer) so switching state never reflows
// the FlatList's bottom edge (Podcasts parity).

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
  onLoadMore: () => void;
}

export const MoviesFooter: React.FC<Props> = ({
  isLoadingMore,
  hasLoaded,
  error,
  reachedEnd,
  onLoadMore,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createMoviesFooterStyles(colors), [colors]);

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
      ) : reachedEnd ? (
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
