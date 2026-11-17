// ─── Movies — List States ────────────────────────────────────────────
// Renders through the FlatList ListEmptyComponent — loading / error /
// empty share one layout path (no flicker when the API resolves).
//
// The loading pill is the SHARED one (`_shared/BrowseLoadingState.tsx`):
// the browse family speaks ONE loading language, and Movies' own copy of
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
  /** Search mode drives the icon + copy (search results vs category). */
  isSearchActive: boolean;
  onRetry: () => void;
  /** Optional raw error message from the query — shown under the
   *  generic "Couldn't load movies." line so users can report
   *  what actually went wrong (timeout, network, parse error, etc.).
   *  B-008: without this, the error UI hides the diagnostic and
   *  every failure looks identical. */
  errorMessage?: string | null;
}

export const ListStates: React.FC<Props> = ({
  state,
  offline,
  isSearchActive,
  onRetry,
  errorMessage,
}) => {
  if (state === 'loading') {
    return <BrowseLoadingState label={text.pills.loading} />;
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
        // B-008: surface the raw error message (timeout, network
        // failure, parse error, ...) under the generic copy so
        // users can report what's actually wrong.
        errorDetail={errorMessage ?? undefined}
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
