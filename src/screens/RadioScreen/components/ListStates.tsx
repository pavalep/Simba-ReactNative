// ─── Radio — List States ─────────────────────────────────────────────
// Renders through the FlatList's `ListEmptyComponent`, so loading, error
// and empty share one layout path — the same component the Music and
// Audiobooks lists use.
//
// The loading pill is the SHARED one (`_shared/BrowseLoadingState`), so
// the browse family speaks ONE loading language. The words stay with
// the surface — "Loading stations…" — because the pill says what is
// loading.
//
// The ERROR state is the house `ErrorState` card with its OWN retry
// button. It used to be a `Placeholder` whose message said "Use Retry at
// the bottom of the screen to try again." — and there is no bottom
// retry: the button it named did not exist.

import React from 'react';
import {ErrorState} from '../../../components/feedback/ErrorState/ErrorState';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {BrowseLoadingState} from '../../_shared/BrowseLoadingState';
import text from '../related/textContent.json';

interface Props {
  /** 'loading' | 'error' | 'empty'. */
  state: 'loading' | 'error' | 'empty';
  /** Global offline flag — swaps the copy for the offline-aware message. */
  offline: boolean;
  /** Search mode drives the copy (search results vs filters). */
  isSearchActive: boolean;
  /** Is any filter axis active? */
  hasFilters: boolean;
  /**
   * The raw error message from the query — surfaced under the friendly
   * copy, so the user can report what actually went wrong.
   */
  error?: string | null;
  /**
   * Retry the failed load.
   *
   * It is OPTIONAL, because the loading state has nothing to retry: the
   * loading branch never draws a button, and a handler that pretends to
   * work is worse than no handler at all.
   */
  onRetry?: () => void;
}

export const ListStates: React.FC<Props> = ({
  state,
  offline,
  isSearchActive,
  hasFilters,
  error,
  onRetry,
}) => {
  if (state === 'loading') {
    return <BrowseLoadingState label={text.pills.loading} />;
  }

  if (state === 'error') {
    return (
      <ErrorState
        title={offline ? text.states.errorOfflineTitle : text.states.errorTitle}
        message={
          offline ? text.states.errorOfflineMessage : text.states.errorMessage
        }
        errorDetail={error ?? undefined}
        onRetry={onRetry}
      />
    );
  }

  const title = isSearchActive
    ? text.states.emptySearchTitle
    : hasFilters
    ? text.states.emptyFilterTitle
    : text.states.emptyAllTitle;
  const description = isSearchActive
    ? text.states.emptySearchSuggestion
    : hasFilters
    ? text.states.emptyFilterSuggestion
    : text.states.emptyAllSuggestion;

  return (
    <EmptyState
      icon={isSearchActive ? 'search' : 'radioTower'}
      title={title}
      description={description}
    />
  );
};
