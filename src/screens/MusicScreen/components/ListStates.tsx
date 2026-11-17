// ─── Music — List States ───────────────────────────────────────────
// Renders through the FlatList ListEmptyComponent — loading / error /
// empty share one layout path.
//
// The loading pill is the SHARED one (`_shared/BrowseLoadingState.tsx`):
// the browse family speaks ONE loading language, and Music's own copy of
// the geometry is gone.

import React from 'react';
import {ErrorState} from '../../../components/feedback/ErrorState/ErrorState';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {BrowseLoadingState} from '../../_shared/BrowseLoadingState';
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
  if (state === 'loading') {
    return <BrowseLoadingState label={text.pills.loading} />;
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
