// ─── Recent Searches ─────────────────────────────────────────────────────
// The page's own search history: the terms the user has run.
//
// 2026-11-12 (SEARCH_PAGE_REDESIGN):
//
//   • the terms are ROWS, not chips. The page had a THIRD chip grammar
//     here (a third size, a third border, a third active state) on a
//     page that already had two. Every result on the page is a row
//     now, and a recent search is a result.
//
//   • the title is the app's gold Cormorant divider (`SubsectionTitle`),
//     the same one every other section on the page uses. It was
//     `SectionHeader` in its PLAIN skin — Inter SemiBold 20 — sitting
//     directly above a gold Cormorant 18 divider further down the page:
//     two title grammars on one screen.
//
//   • the action is named "Clear all", not "Clear". It removes the whole
//     history, and a button that removes everything should say so. (This
//     is the same direction as the Bookmarks' destructive chip in the R3
//     wave: a plain label and a named action, never a destructive chip.)
//
//   • the divider gained an optional action slot for it
//     (`SubsectionTitle`'s `actionLabel` + `onAction`), so the page
//     keeps ONE title grammar instead of growing a second one for a
//     single action.

import React from 'react';
import {View} from 'react-native';
import {SubsectionTitle} from '../../../components/utility/SubsectionTitle/SubsectionTitle';
import {SearchResultRow} from './SearchResultRow';

interface RecentSearchesProps {
  recentSearches: string[];
  /** Re-run a term. */
  onSelect: (term: string) => void;
  /** Empty the history. */
  onClear: () => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  recentSearches,
  onSelect,
  onClear,
}) => {
  if (recentSearches.length === 0) {
    return null;
  }

  return (
    <View>
      <SubsectionTitle
        label="Recent searches"
        variant="displaySerif"
        actionLabel="Clear all"
        onAction={onClear}
      />
      {recentSearches.map(term => (
        <SearchResultRow
          key={term}
          title={term}
          icon="history"
          onPress={() => onSelect(term)}
        />
      ))}
    </View>
  );
};
