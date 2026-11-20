/**
 * The All Videos page follows the browse grammar.
 *
 * ## What this pins
 *
 * 1. **THE PAGE IS A BROWSE PAGE.** It renders the shared shell's
 *    search field, its filter button and its header — instead of its
 *    own `SafeAreaView`, its own gradient, its own `BackButton` and
 *    title, and its own `SearchBar`.
 * 2. **THE SORT AND THE VIEW ARE OPTION GROUPS, NOT HEADER BUTTONS.**
 *    They used to be two header buttons that flipped between two
 *    states, so the page could not say which order it was in — the
 *    icon changed, and the icon was the only thing that said
 *    anything. Now they live in the shell's option sheet.
 * 3. **THE ROW STILL HAS ITS MENU.** The long-press menu is the app's
 *    ONE media menu, and it is still there.
 */

import {fireEvent, screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {AllVideosScreen} from '../../../src/screens/AllVideos';
import type {ScannedTrack} from '../../../src/state';

function makeTrack(over: Partial<ScannedTrack>): ScannedTrack {
  return {
    uri: 'file:///movies/clip.mp4',
    title: 'Clip',
    artist: 'Director',
    album: 'Reel',
    year: 2024,
    genre: '',
    trackNumber: 0,
    duration: 125,
    albumArtUri: '',
    folderPath: '/movies',
    folderId: 'local-folder:video',
    source: 'local',
    type: 'video',
    mediaType: 'video',
    ...over,
  };
}

const mockTracks: ScannedTrack[] = [
  makeTrack({uri: 'file:///movies/zeta.mp4', title: 'Zeta'}),
  makeTrack({uri: 'file:///movies/alpha.mp4', title: 'Alpha'}),
];

jest.mock('../../../src/state', () => {
  const actual = jest.requireActual('../../../src/state');
  return {
    ...actual,
    useMediaVideoTracks: () => mockTracks,
  };
});

// The scanner reaches for the file system on mount; the library is
// seeded instead.
jest.mock('../../../src/hooks/useMediaScanner', () => {
  const actual = jest.requireActual('../../../src/hooks/useMediaScanner');
  return {
    ...actual,
    useMediaScanner: () => ({startScan: jest.fn(), isScanning: false}),
  };
});

describe('the All Videos page — the browse grammar', () => {
  it('renders the shared shell — the search field, the filter button and the header', async () => {
    await renderWithProviders(AllVideosScreen, {routeName: 'AllVideosScreen'});

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search videos…')).toBeTruthy(),
    );
    // The shared shell's filter button.
    expect(screen.getByLabelText('Filter All Videos options')).toBeTruthy();
    // The shared shell's header.
    expect(screen.getByText('All Videos')).toBeTruthy();
    // The page's own rows are in the list.
    expect(screen.getByText('Zeta')).toBeTruthy();
  });

  it('draws NO header buttons for the sort and the view', async () => {
    await renderWithProviders(AllVideosScreen, {routeName: 'AllVideosScreen'});

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search videos…')).toBeTruthy(),
    );
    // The two header buttons are gone: the sort and the view are
    // option-sheet groups now.
    expect(screen.queryByLabelText('Change sort order')).toBeNull();
    expect(screen.queryByLabelText('Switch to list view')).toBeNull();
    expect(screen.queryByLabelText('Switch to grid view')).toBeNull();
  });

  it('keeps the row\'s media menu', async () => {
    await renderWithProviders(AllVideosScreen, {routeName: 'AllVideosScreen'});

    await waitFor(() => expect(screen.getByText('Zeta')).toBeTruthy());
    expect(screen.queryByText('Play Next')).toBeNull();

    fireEvent(screen.getByLabelText('Zeta'), 'longPress');

    await waitFor(() => expect(screen.getByText('Play Next')).toBeTruthy());
    expect(screen.getByText('Add to Queue')).toBeTruthy();
    expect(screen.getByText('Add to Playlist')).toBeTruthy();
  });
});