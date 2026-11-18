// ─── Shows — List States ────────────────────────────────────────────────
// Renders through the FlatList ListEmptyComponent — loading / error /
// empty share one layout path.
//
// The loading pill is the SHARED one (`_shared/BrowseLoadingState.tsx`):
// the browse family speaks ONE loading language, and the Shows screen's
// own `Placeholder` states are gone with the rest of its hand-rolled
// shell.

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
  /** Search mode drives the icon + copy (search results vs the list). */
  isSearchActive: boolean;
  /** True when the scope is the schedule — "nothing is on today". */
  isTodayScope: boolean;
  /** Raw error message from the hook — surfaced in the error UI so the
   *  user can see WHY the request failed instead of the generic line. */
  error?: string | null;
  onRetry: () => void;
}

export const ListStates: React.FC<Props> = ({
  state,
  offline,
  isSearchActive,
  isTodayScope,
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
        // wrong.
        message={
          offline ? text.states.errorOfflineMessage : text.states.errorLoadFailed
        }
        errorDetail={error ?? undefined}
        onRetry={onRetry}
      />
    );
  }

  // Empty — the copy says WHICH scope came back empty.
  const title = isSearchActive
    ? text.states.emptySearchTitle
    : isTodayScope
    ? text.states.emptyTodayTitle
    : text.states.emptyAllTitle;
  const description = isSearchActive
    ? text.states.emptySearchSuggestion
    : isTodayScope
    ? text.states.emptyTodaySuggestion
    : text.states.emptyAllSuggestion;

  return (
    <EmptyState
      icon={isSearchActive ? 'search' : 'video'}
      title={title}
      description={description}
    />
  );
};
