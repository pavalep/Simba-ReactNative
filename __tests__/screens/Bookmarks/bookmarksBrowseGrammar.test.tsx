/**
 * The Bookmarks page follows the browse grammar.
 *
 * ## What this pins
 *
 * 1. **THE PAGE IS A BROWSE PAGE.** It renders the shared shell's
 *    search field and the shared shell's header — instead of its own
 *    `SafeAreaView`, its own `InternalHeader` and its own `SearchBar`.
 * 2. **THE PAGE HAS NO FILTER BUTTON.** The page declares no option
 *    groups, so the shell draws no chip strip and no filter button,
 *    and the sheet has nothing to show. A bookmark list is grouped by
 *    file and ordered by position — that is the shared `BookmarkList`
 *    component's job, not an option sheet's.
 * 3. **THE COUNT IS INFORMATION AND THE WIPE IS A NAMED CONTROL.** The
 *    count is the header's plain subtitle; the destructive action is a
 *    NAMED "Clear All" in the error colour. The count used to BE the
 *    destructive action, so a user who tapped "12 saved" because it
 *    looked like information was offered a wipe of every bookmark they
 *    had (`md/CONTENT_OWNERSHIP.md` §6.3.1).
 */

import {screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {BookmarksScreen} from '../../../src/screens/Bookmarks';
import type {Bookmark} from '../../../src/state';

function makeBookmark(over: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'bookmark-1',
    fileUri: 'file:///movies/film.mkv',
    title: 'The Film',
    position: 120,
    duration: 3600,
    createdAt: '2026-11-01T10:00:00.000Z',
    label: '',
    mediaType: 'video',
    type: 'video',
    source: 'local',
    ...over,
  };
}

/**
 * The user's bookmarks.
 *
 * The `mock` prefix is REQUIRED: jest's hoist plugin refuses to let a
 * mock factory close over an out-of-scope binding whose name does not
 * start with `mock`.
 */
const mockBookmarks: Bookmark[] = [
  makeBookmark({id: 'bookmark-1', title: 'The Film'}),
  makeBookmark({id: 'bookmark-2', title: 'The Film', position: 600}),
];

jest.mock('../../../src/features/bookmarks', () => {
  const actual = jest.requireActual('../../../src/features/bookmarks');
  return {
    ...actual,
    useBookmarks: () => ({
      allBookmarks: mockBookmarks,
      bookmarksForFile: [],
      bookmarkCount: mockBookmarks.length,
      bookmarkCountForFile: 0,
      getBookmarks: () => mockBookmarks,
      addBookmark: jest.fn(),
      updateBookmarkPosition: jest.fn(),
      removeBookmark: jest.fn(),
      updateBookmarkLabel: jest.fn(),
      clearBookmarks: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
      updateLabel: jest.fn(),
      clearAll: jest.fn(),
    }),
  };
});

describe('the Bookmarks page — the browse grammar', () => {
  it('renders the shared shell — the search field and the header', async () => {
    await renderWithProviders(BookmarksScreen, {routeName: 'Bookmarks'});

    // The shared shell's search field, with THIS page's placeholder.
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search bookmarks…')).toBeTruthy(),
    );
    // The shared shell's header.
    expect(screen.getByText('Bookmarks')).toBeTruthy();
  });

  it('draws NO filter button — the page declares no option groups', async () => {
    await renderWithProviders(BookmarksScreen, {routeName: 'Bookmarks'});

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search bookmarks…')).toBeTruthy(),
    );
    expect(screen.queryByLabelText('Filter Bookmarks options')).toBeNull();
    expect(screen.queryByTestId('browse-active-filters')).toBeNull();
  });

  it('keeps the count as INFORMATION and the wipe as a NAMED control', async () => {
    await renderWithProviders(BookmarksScreen, {routeName: 'Bookmarks'});

    // The count is the header's plain subtitle.
    await waitFor(() => expect(screen.getByText('2 saved')).toBeTruthy());

    // The destructive action is a NAMED button, not the count.
    expect(screen.getByLabelText('Clear all bookmarks')).toBeTruthy();
    expect(screen.getByText('Clear All')).toBeTruthy();
  });
});
