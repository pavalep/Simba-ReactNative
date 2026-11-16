// ─── Music — List States ───────────────────────────────────────────
// Renders through the FlatList ListEmptyComponent — loading / error /
// empty share one layout path. The centered loading pill mirrors
// `PodcastsOverlays.centerLoader` from PodcastsScreen — same
// ActivityOrb + caption language, same elevated pill surface.

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
  /** Search mode drives the icon + copy (search results vs genre). */
  isSearchActive: boolean;
  /** Genre display name for the "{genre}" empty-state token. */
  genreLabel?: string;
  /** Raw error message from the hook — surfaced in the error UI so
   *  users can see WHY the request failed (e.g. invalid Jamendo
   *  `client_id`) instead of the generic "Couldn't load tracks." */
  error?: string | null;
  onRetry: () => void;
}

export const ListStates: React.FC<Props> = ({
  state,
  offline,
  isSearchActive,
  genreLabel,
  error,
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
        // The friendly copy is the MESSAGE; the raw reason goes UNDER it
        // as `errorDetail`, so the user can report what actually went
        // wrong. The raw message used to BE the message — which meant the
        // friendly copy ("Couldn't load tracks.") could never render, and
        // the screen showed a bare adapter string.
        message={
          offline ? text.states.errorOfflineMessage : text.states.errorLoadFailed
        }
        errorDetail={error ?? undefined}
        onRetry={onRetry}
      />
    );
  }

  // Empty
  const title = isSearchActive
    ? text.states.emptySearchTitle
    : genreLabel
    ? text.states.emptyGenreTitle.replace('{genre}', genreLabel)
    : text.states.emptyAllTitle;
  const description = isSearchActive
    ? text.states.emptySearchSuggestion
    : genreLabel
    ? text.states.emptyGenreSuggestion
    : text.states.emptyAllSuggestion;

  return (
    <EmptyState
      icon={isSearchActive ? 'search' : 'music'}
      title={title}
      description={description}
    />
  );
};
