// ─── Movies — List States ────────────────────────────────────────────
// Renders through the FlatList ListEmptyComponent — loading / error /
// empty share one layout path (no flicker when the API resolves).
//
// The centered loading pill mirrors `PodcastsOverlays.centerLoader` from
// PodcastsScreen — same `ActivityOrb + caption` language, same elevated
// pill surface, anchored at ~20% from the top so it reads as a status
// pill, not a splash-screen placeholder. Co-located here (instead of a
// separate overlays component) to keep the screen KISS.

import React, {useMemo} from 'react';
import {View} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import {ErrorState} from '../../../components/feedback/ErrorState/ErrorState';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {createListStatesStyles} from '../styles';
import text from '../related/textContent.json';

interface Props {
  /** 'loading' | 'error' | 'empty'. */
  state: 'loading' | 'error' | 'empty';
  /** Global offline flag — swaps copy for the offline-aware message. */
  offline: boolean;
  /** Search mode drives the icon + copy (search results vs category). */
  isSearchActive: boolean;
  onRetry: () => void;
}

export const ListStates: React.FC<Props> = ({
  state,
  offline,
  isSearchActive,
  onRetry,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createListStatesStyles(), []);

  if (state === 'loading') {
    return (
      <View style={styles.centerLoader}>
        <View
          style={[
            styles.centerLoaderPill,
            {backgroundColor: colors.background.elevated},
          ]}>
          <ActivityOrb size={24} />
          <AppText
            variant="caption"
            color="secondary"
            style={styles.centerLoaderText}>
            {text.pills.loading}
          </AppText>
        </View>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <ErrorState
        title={offline ? text.states.errorOfflineTitle : undefined}
        message={
          offline
            ? text.states.errorOfflineMessage
            : text.states.errorLoadFailed
        }
        onRetry={onRetry}
      />
    );
  }

  return (
    <EmptyState
      icon={isSearchActive ? 'search' : 'folder'}
      title={
        isSearchActive
          ? text.states.emptySearchTitle
          : text.states.emptyCategoryTitle
      }
      description={
        isSearchActive
          ? text.states.emptySearchSuggestion
          : text.states.emptyCategorySuggestion
      }
    />
  );
};
