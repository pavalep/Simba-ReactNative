// ─── Music — In-flow Footer ─────────────────────────────────────────
// Lives INSIDE the FlatList (ListFooterComponent). Only renders when
// the user has a loaded scope — page-1 failures show the shared
// ErrorState in the empty slot instead, so we never double-error.
//
//   • isLoadingMore → spinner + "Loading more…"
//   • !!error && hasLoaded → tap-to-retry pill
//   • otherwise → nothing (no spacer — the FlatList reserves its own
//     bottom space via `paddingBottom`)

import React, {useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import {createMusicFooterStyles} from '../styles';
import text from '../related/textContent.json';

interface Props {
  isLoadingMore: boolean;
  hasLoaded: boolean;
  error: string | null;
  onLoadMore: () => void;
}

export const MusicFooter: React.FC<Props> = ({
  isLoadingMore,
  hasLoaded,
  error,
  onLoadMore,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createMusicFooterStyles(colors), [colors]);

  return (
    <View style={styles.footerWrap}>
      {isLoadingMore ? (
        <View style={styles.footerRow}>
          <ActivityOrb size={22} />
          <AppText variant="caption" color="tertiary">
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
      ) : null}
    </View>
  );
};
