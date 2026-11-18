// ─── Live TV — List States ────────────────────────────────────────────
// Renders through the FlatList's ListEmptyComponent — loading / error /
// empty share one layout path.
//
// The loading pill is the SHARED one (`_shared/BrowseLoadingState.tsx`):
// the browse family speaks ONE loading language, and Live TV's own copy of
// the geometry is gone.
//
// The empty state names the SCOPE: a search says so, a category says its
// own name, and an empty catalogue says the plain thing. It used to be a
// single "No channels match your filters." for every scope that was not a
// search — which was a sentence about a filter that may not even have been
// applied.

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
  /** Search mode drives the icon + copy (search results vs a category). */
  isSearchActive: boolean;
  /** The active category's NAME for the "{category}" empty-state token. */
  categoryLabel?: string;
  /**
   * The raw error message from the hook — surfaced under the friendly
   * copy, so the user can see WHY the request failed instead of a bare
   * adapter string.
   */
  error?: string | null;
  onRetry: () => void;
}

export const ListStates: React.FC<Props> = ({
  state,
  offline,
  isSearchActive,
  categoryLabel,
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
    : categoryLabel
    ? text.states.emptyCategoryTitle.replace('{category}', categoryLabel)
    : text.states.emptyAllTitle;
  const description = isSearchActive
    ? text.states.emptySearchSuggestion
    : categoryLabel
    ? text.states.emptyCategorySuggestion
    : text.states.emptyAllSuggestion;

  return (
    <EmptyState
      icon={isSearchActive ? 'search' : 'video'}
      title={title}
      description={description}
    />
  );
};
