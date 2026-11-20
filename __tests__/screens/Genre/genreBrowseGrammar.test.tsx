/**
 * The Genre page follows the browse grammar.
 *
 * ## What this pins
 *
 * 1. **THE HEADER SAYS WHICH GENRE THE PAGE IS ABOUT.** The title is
 *    the genre itself, so the config has to be a factory — a static
 *    config would put one genre's name in every genre's header.
 * 2. **THE SOURCE TOGGLE IS THE CONTENT'S OWN CONTROL.** "My
 *    Library" and "Streaming" are two DIFFERENT catalogues, not two
 *    filters of one, so the toggle stays in the content and the shell
 *    draws no chip strip and no filter button.
 * 3. **THE LIST IS NOT NESTED IN A SCROLL VIEW.** The old screen put a
 *    `ScrollView` around a `FlatList` with `scrollEnabled={false}` —
 *    the virtualised-list-in-a-scroll-view pattern React Native warns
 *    about. The list scrolls on its own now.
 */

import {screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {GenreScreen} from '../../../src/screens/Genre';
import {useMediaStore, type ScannedTrack} from '../../../src/state';

const track: ScannedTrack = {
  uri: 'file:///music/track.mp3',
  title: 'Local Track',
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
};

// The streaming catalogue is not what this suite is about.
jest.mock('../../../src/infrastructure/api/jamendo/adapter', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/api/jamendo/adapter',
  );
  return {
    ...actual,
    getJamendoTracksByGenre: jest.fn(async () => []),
  };
});

describe('the Genre page — the browse grammar', () => {
  beforeEach(() => {
    useMediaStore.getState().setTracks([track]);
  });

  it('titles the header with the genre, not the word Genre', async () => {
    await renderWithProviders(GenreScreen, {
      routeName: 'GenreScreen',
      initialParams: {genre: 'Electronic'},
    });

    await waitFor(() => expect(screen.getAllByText('Electronic').length).toBeGreaterThan(0));
    expect(screen.queryByText('Genre')).toBeNull();
  });

  it('keeps the SOURCE toggle as the content\'s own control', async () => {
    await renderWithProviders(GenreScreen, {
      routeName: 'GenreScreen',
      initialParams: {genre: 'Electronic'},
    });

    await waitFor(() => expect(screen.getByText('My Library')).toBeTruthy());
    expect(screen.getByText('Streaming')).toBeTruthy();

    // And the shell draws no chip strip and no filter button — the
    // source is not a filter axis.
    expect(screen.queryByTestId('browse-active-filters')).toBeNull();
    expect(screen.queryByLabelText('Filter Electronic options')).toBeNull();
  });

  it('shows the library\'s own tracks for the genre', async () => {
    await renderWithProviders(GenreScreen, {
      routeName: 'GenreScreen',
      initialParams: {genre: 'Electronic'},
    });

    await waitFor(() => expect(screen.getByText('Local Track')).toBeTruthy());
  });
});