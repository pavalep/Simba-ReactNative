/**
 * The All Audio page follows the browse grammar — and its rows open the
 * app's media menu.
 *
 * ## What this pins
 *
 * 1. **THE PAGE IS A BROWSE PAGE.** It renders the shared shell's
 *    search field and filter button — the same affordances the Music,
 *    Movies and Audiobooks screens have — instead of its own header,
 *    its own search field and its own two header buttons.
 * 2. **THE SCOPE IS VISIBLE.** The Artist screen sends
 *    `filter: artistName`, and the page used to apply it with nothing on
 *    screen saying so. The artist is a filter AXIS now, so the chip
 *    strip carries it.
 * 3. **THE ROW HAS A MENU.** The All Audio rows had NO long-press menu
 *    at all, so an audio file could not be played next or queued from
 *    that list while the same file could be from every other list. The
 *    long press opens the app's ONE media menu (`MediaActionsSheet`)
 *    with the same three rows the All Videos list offers.
 */

import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {AllAudioScreen} from '../../../src/screens/AllAudio';
import type {ScannedTrack} from '../../../src/state';

function makeTrack(over: Partial<ScannedTrack>): ScannedTrack {
  return {
    uri: 'file:///music/track.mp3',
    title: 'Track',
    artist: 'Artist',
    album: 'Album',
    year: 2020,
    genre: 'Electronic',
    trackNumber: 1,
    duration: 200,
    albumArtUri: '',
    folderPath: '/music',
    folderId: 'local-folder:audio:/music',
    source: 'local',
    type: 'music',
    mediaType: 'audio',
    ...over,
  };
}

/**
 * The library's tracks.
 *
 * The `mock` prefix is REQUIRED: jest's hoist plugin refuses to let a
 * mock factory close over an out-of-scope binding whose name does not
 * start with `mock`.
 */
const mockTracks: ScannedTrack[] = [
  makeTrack({
    uri: 'file:///music/zeta.mp3',
    title: 'Zeta',
    artist: 'Kavinsky',
    album: 'OutRun',
    duration: 240,
  }),
  makeTrack({
    uri: 'file:///music/alpha.mp3',
    title: 'Alpha',
    artist: 'Autechre',
    album: 'Amber',
    duration: 180,
  }),
];

jest.mock('../../../src/state', () => {
  const actual = jest.requireActual('../../../src/state');
  return {
    ...actual,
    useMediaAudioTracks: () => mockTracks,
  };
});

describe('the All Audio page — the browse grammar', () => {
  it('renders the shared shell — the search field and the filter button', async () => {
    await renderWithProviders(AllAudioScreen, {routeName: 'AllAudioScreen'});

    // The shared shell's search field, with THIS page's placeholder.
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search audio…')).toBeTruthy(),
    );
    // The shared shell's filter button.
    expect(screen.getByLabelText('Filter All Audio options')).toBeTruthy();
    // The shared shell's header.
    expect(screen.getByText('All Audio')).toBeTruthy();
    // The page's own rows are in the list.
    expect(screen.getByText('Zeta')).toBeTruthy();
  });

  it('shows the ARTIST the route asked for in the chip strip', async () => {
    // The scope used to be applied with nothing on screen saying so.
    await renderWithProviders(AllAudioScreen, {
      routeName: 'AllAudioScreen',
      initialParams: {filter: 'Kavinsky'},
    });

    // The chip strip is the shell's own strip, so the chip is read from
    // inside it - the card's own artist line says 'Kavinsky' too.
    await waitFor(() =>
      expect(
        within(screen.getByTestId('browse-active-filters')).getByText('Kavinsky'),
      ).toBeTruthy(),
    );
    // The other artist's tracks are NOT in the list.
    expect(screen.queryByText('Alpha')).toBeNull();
  });

  it('opens the app\'s media menu on a row\'s long press', async () => {
    await renderWithProviders(AllAudioScreen, {routeName: 'AllAudioScreen'});

    await waitFor(() => expect(screen.getByText('Zeta')).toBeTruthy());
    // The menu is closed to begin with.
    expect(screen.queryByText('Play Next')).toBeNull();

    fireEvent(screen.getByLabelText('Zeta'), 'longPress');

    await waitFor(() => expect(screen.getByText('Play Next')).toBeTruthy());
    expect(screen.getByText('Add to Queue')).toBeTruthy();
    expect(screen.getByText('Add to Playlist')).toBeTruthy();
  });
});
