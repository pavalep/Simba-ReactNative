// ─── Archive — List States ─────────────────────────────────────────────
// Renders through the FlatList ListEmptyComponent — loading / error /
// empty share one layout path (no flicker when the API resolves).
//
// The loading pill is the SHARED one (`_shared/BrowseLoadingState.tsx`):
// the browse family speaks ONE loading language, and the Archive screen
// no longer draws its own `Placeholder` states.

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
  /** Search mode drives the icon + copy. */
  isSearchActive: boolean;
  /** Raw error message from the query — shown under the generic line so
   *  the user can see WHY the request failed instead of a generic one. */
  errorMessage?: string | null;
  onRetry: () => void;
}

export const ListStates: React.FC<Props> = ({
  state,
  offline,
  isSearchActive,
  errorMessage,
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
        errorDetail={errorMessage ?? undefined}
        onRetry={onRetry}
      />
    );
  }

  return (
    <EmptyState
      icon={isSearchActive ? 'search' : 'archive'}
      title={
        isSearchActive
          ? text.states.emptySearchTitle
          : text.states.emptyScopeTitle
      }
      description={
        isSearchActive
          ? text.states.emptySearchSuggestion
          : text.states.emptyScopeSuggestion
      }
    />
  );
};
