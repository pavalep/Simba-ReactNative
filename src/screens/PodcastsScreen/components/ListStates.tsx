// ─── Podcasts — List States ───────────────────────────────────────────
// Renders through the FlatList ListEmptyComponent so loading, error and
// the empty state share one layout path (PodcastDetailScreen parity) —
// no flicker when the API resolves. The centered "loading" pill from the
// old overlay still covers FIRST resolve (see PodcastsScreen); this
// component owns everything else.

import React, {useMemo} from 'react';
import {TouchableOpacity} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {createListStatesStyles} from '../styles';
import text from '../related/textContent.json';

interface Props {
  isLoading: boolean;
  error: string | null;
  /** Global offline flag — swaps the copy for the offline-aware message. */
  offline: boolean;
  /** Search mode drives the icon + copy (search results vs category). */
  isSearchActive: boolean;
  /** Category display name for the "{category}" empty-state token. */
  categoryLabel: string;
  /** Active category id ('all' → the trending stream). */
  categoryId: string;
  onRetry: () => void;
}

export const ListStates: React.FC<Props> = ({
  isLoading,
  error,
  offline,
  isSearchActive,
  categoryLabel,
  categoryId,
  onRetry,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createListStatesStyles(colors), [colors]);

  const hasError = !!error;

  const title = hasError
    ? offline
      ? text.errors.offlineTitle
      : text.errors.loadFailed
    : isSearchActive
    ? text.empty.searchNoResults
    : categoryId === 'all'
    ? text.empty.noResultsHere
    : text.empty.noResultsInCategory.replace('{category}', categoryLabel);

  // When we have a real error message (from the API client), surface it
  // — the generic "Couldn't load podcasts" hides the actual cause and
  // makes debugging search / network failures impossible.
  const message = hasError
    ? offline
      ? text.errors.offlineMessage
      : error ?? text.errors.loadFailed
    : isSearchActive
    ? text.empty.searchSuggestion
    : text.empty.categorySuggestion;

  return (
    <Placeholder
      variant="empty"
      anchor="top-third"
      icon={hasError ? 'alertCircle' : isSearchActive ? 'search' : 'micVocal'}
      iconColor={hasError ? colors.semantic.error : undefined}
      title={title}
      message={message}>
      {hasError && (
        <TouchableOpacity
          style={styles.retryButton}
          activeOpacity={0.7}
          onPress={onRetry}
          accessibilityLabel={text.listStates.retry}
          accessibilityRole="button">
          <AppText variant="button" style={styles.retryText}>
            {text.listStates.retry}
          </AppText>
        </TouchableOpacity>
      )}
    </Placeholder>
  );
};
