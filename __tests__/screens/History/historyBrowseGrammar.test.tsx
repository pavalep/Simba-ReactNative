/**
 * The History page follows the browse grammar.
 *
 * ## What this pins
 *
 * 1. **THE PAGE IS A BROWSE PAGE.** It renders the shared shell's
 *    search field, its filter button and its header — instead of its
 *    own header, its own `SearchBar` and its own row of four filter
 *    chips.
 * 2. **THE MEDIA-TYPE FILTER IS A FILTER AXIS.** "All / Video /
 *    Audio / Streaming" is a scope the list answers, so it belongs to
 *    the option model: the chip strip carries what is applied and one
 *    tap removes it.
 * 3. **THE WIPE IS A NAMED CONTROL IN THE HEADER.** The clear-all is
 *    the header's destructive action, in the error colour.
 */

import {fireEvent, screen, waitFor, within} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {HistoryScreen} from '../../../src/screens/History';
import type {RecentHistoryEntry} from '../../../src/features/recentHistory';

const entry: RecentHistoryEntry = {
  fileUri: 'file:///movies/film.mkv',
  title: 'The Film',
  position: 120,
  duration: 3600,
  lastPlayedAt: '2026-11-02T10:00:00.000Z',
  thumbnailPath: '',
  mediaType: 'video',
  type: 'video',
  source: 'local',
};

const mockEntries: RecentHistoryEntry[] = [entry];

jest.mock('../../../src/features/recentHistory', () => {
  const actual = jest.requireActual('../../../src/features/recentHistory');
  return {
    ...actual,
    useRecentHistory: () => ({
      list: mockEntries,
      getRecent: () => mockEntries,
      addRecent: jest.fn(),
      removeRecent: jest.fn(),
      clearRecent: jest.fn(),
    }),
  };
});

describe('the History page — the browse grammar', () => {
  it('renders the shared shell — the search field, the filter button and the header', async () => {
    await renderWithProviders(HistoryScreen, {routeName: 'History'});

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search history…')).toBeTruthy(),
    );
    // The shared shell's filter button.
    expect(screen.getByLabelText('Filter History options')).toBeTruthy();
    // The shared shell's header.
    expect(screen.getByText('History')).toBeTruthy();
  });

  it('puts the media type in the chip strip once it is applied', async () => {
    await renderWithProviders(HistoryScreen, {routeName: 'History'});

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search history…')).toBeTruthy(),
    );

    // Nothing is applied yet: the group's DEFAULT is 'all', and a
    // default is not an explicit selection. The strip's SLOT is there —
    // the page HAS a filter axis — but it carries no chip.
    expect(
      within(screen.getByTestId('browse-active-filters')).queryByText('Video'),
    ).toBeNull();

    // Pick a type in the shell's option sheet.
    fireEvent.press(screen.getByLabelText('Filter History options'));
    await waitFor(() => expect(screen.getByText('Video')).toBeTruthy());
    fireEvent.press(screen.getByText('Video'));

    // The applied scope is now in the chip strip, and one tap removes
    // it.
    await waitFor(() =>
      expect(
        within(screen.getByTestId('browse-active-filters')).getByText('Video'),
      ).toBeTruthy(),
    );
  });

  it('keeps the wipe as a NAMED control in the header', async () => {
    await renderWithProviders(HistoryScreen, {routeName: 'History'});

    await waitFor(() => expect(screen.getByText('History')).toBeTruthy());
    expect(screen.getByLabelText('Clear history')).toBeTruthy();
    expect(screen.getByText('Clear All')).toBeTruthy();
  });
});