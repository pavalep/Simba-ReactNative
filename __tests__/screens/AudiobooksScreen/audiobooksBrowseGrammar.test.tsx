/**
 * The Audiobooks screen follows the browse grammar.
 *
 * ## What this pins
 *
 * The Audiobooks screen used to be a browse page of its own: its own
 * `InternalHeader`, its own `SearchBar`, its own `FilterChips` row, its
 * own `Placeholder` states and an `ActivityOrb` "footer". It also ran
 * TWO parallel infinite queries — one for "by term", one for "by genre" —
 * and enabled NEITHER when the user had done neither, so the screen
 * opened on an empty list and a "search for audiobooks" prompt.
 *
 * It is now the shared browse shell, with ONE scope-driven query. The
 * claims under test are:
 *
 *   1. THE DEFAULT SCOPE IS THE CATALOGUE. With no term and no genre the
 *      feed is asked for its own listing. The old screen showed nothing
 *      until the user browsed.
 *   2. THE SCOPE IS ONE THING AT A TIME. A term makes the feed answer
 *      the term; a genre makes it answer the genre. LibriVox cannot do
 *      both in one request, so the hook asks for exactly one.
 *   3. THE SCREEN IS A BROWSE SCREEN. It renders the shared shell's
 *      search field and its filter button — the same affordances the
 *      Music, Movies and Podcasts screens have — instead of its own.
 *   4. PULL-TO-REFRESH REFRESHES. The old screen's `refreshControl` was a
 *      no-op `<View>`: the gesture was advertised and inert.
 *
 * The REAL hook, the REAL TanStack query and the REAL `usePullToRefresh`
 * are used — only the LibriVox adapter is stubbed, so the scope and the
 * pagination are driven exactly as the app drives them.
 */

import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {useAudiobooksScreen} from '../../../src/screens/AudiobooksScreen/hooks/useAudiobooksScreen';
import {AudiobooksScreen} from '../../../src/screens/AudiobooksScreen';
import type {AudiobookResult} from '../../../src/types/api';

// LibriVox is the network. The adapter is stubbed so the scope and the
// pagination can be driven on purpose.
jest.mock('../../../src/infrastructure/api/librivox/adapter', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/api/librivox/adapter',
  );
  return {
    ...actual,
    searchAudiobooks: jest.fn(),
    searchByGenre: jest.fn(),
    getRecentAudiobooks: jest.fn(),
  };
});

const {searchAudiobooks: mockSearch} = jest.requireMock(
  '../../../src/infrastructure/api/librivox/adapter',
) as {searchAudiobooks: jest.Mock};
const {searchByGenre: mockGenre} = jest.requireMock(
  '../../../src/infrastructure/api/librivox/adapter',
) as {searchByGenre: jest.Mock};
const {getRecentAudiobooks: mockAll} = jest.requireMock(
  '../../../src/infrastructure/api/librivox/adapter',
) as {getRecentAudiobooks: jest.Mock};

function makeBook(n: number): AudiobookResult {
  return {
    id: n,
    title: `Book ${n}`,
    author: 'An Author',
    description: '',
    urlZipFile: '',
    urlLibrivox: '',
    urlIArchive: '',
    totalTime: 3600,
    language: 'English',
  };
}

/**
 * The hook's state, rendered as text so the test can read it.
 *
 * The scope is changed from INSIDE the harness, because the scope is the
 * harness's own state — the same way the screen changes it: the shell
 * pushes the filter and the search field down into the provider, and the
 * provider hands them to the hook.
 */
const Harness: React.FC = () => {
  const [genre, setGenre] = useState('');
  const [searchTerm, setTerm] = useState('');
  const {items, scopeKind, scopeLabel, refreshing, refresh} =
    useAudiobooksScreen({genre, searchTerm});
  return (
    <View>
      <Text testID="scopeKind">{scopeKind}</Text>
      <Text testID="scopeLabel">{scopeLabel ?? ''}</Text>
      <Text testID="count">{String(items.length)}</Text>
      <Text testID="refreshing">{String(refreshing)}</Text>
      <Pressable
        testID="set-term"
        onPress={() => {
          setTerm('alice');
        }}
      />
      <Pressable
        testID="set-genre"
        onPress={() => {
          setGenre('Mystery');
        }}
      />
      <Pressable
        testID="pull"
        onPress={() => {
          refresh().catch(() => {});
        }}
      />
    </View>
  );
};

function stateOf(testID: string): string {
  return screen.getByTestId(testID).props.children as string;
}

describe('the Audiobooks screen — the browse grammar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockResolvedValue([]);
    mockGenre.mockResolvedValue([]);
    mockAll.mockResolvedValue([]);
  });

  it('asks the feed for its OWN listing when there is no term and no genre', async () => {
    // The old screen enabled NO query in this state, so the list was
    // empty until the user searched or picked a genre.
    mockAll.mockResolvedValue([makeBook(1), makeBook(2)]);

    await renderWithProviders(Harness, {routeName: 'AudiobooksScreen'});

    await waitFor(() => expect(stateOf('count')).toBe('2'));
    expect(stateOf('scopeKind')).toBe('all');
    expect(mockAll).toHaveBeenCalledTimes(1);
    expect(mockSearch).not.toHaveBeenCalled();
    expect(mockGenre).not.toHaveBeenCalled();
  });

  it('asks the feed for the TERM when there is a term', async () => {
    mockSearch.mockResolvedValue([makeBook(7)]);

    await renderWithProviders(Harness, {routeName: 'AudiobooksScreen'});
    await waitFor(() => expect(stateOf('scopeKind')).toBe('all'));
    // The opening scope already asked for the listing — forget that, so
    // the assertion below is about the scope change and nothing else.
    mockAll.mockClear();

    await act(async () => {
      fireEvent.press(screen.getByTestId('set-term'));
    });

    await waitFor(() => expect(stateOf('scopeKind')).toBe('term'));
    expect(stateOf('count')).toBe('1');
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch.mock.calls[0][0]).toBe('alice');
    // The listing is NOT asked for while a term is on screen.
    expect(mockAll).not.toHaveBeenCalled();
  });

  it('asks the feed for the GENRE when there is a genre', async () => {
    mockGenre.mockResolvedValue([makeBook(3)]);

    await renderWithProviders(Harness, {routeName: 'AudiobooksScreen'});
    await waitFor(() => expect(stateOf('scopeKind')).toBe('all'));
    // The opening scope already asked for the listing — forget that, so
    // the assertion below is about the scope change and nothing else.
    mockAll.mockClear();

    await act(async () => {
      fireEvent.press(screen.getByTestId('set-genre'));
    });

    await waitFor(() => expect(stateOf('scopeKind')).toBe('genre'));
    expect(stateOf('scopeLabel')).toBe('Mystery');
    expect(stateOf('count')).toBe('1');
    expect(mockGenre).toHaveBeenCalledTimes(1);
    expect(mockGenre.mock.calls[0][0]).toBe('Mystery');
    expect(mockSearch).not.toHaveBeenCalled();
    expect(mockAll).not.toHaveBeenCalled();
  });

  it('renders the shared shell — the search field and the filter button', async () => {
    await renderWithProviders(AudiobooksScreen, {
      routeName: 'AudiobooksScreen',
    });

    // The shared shell's search field, with THIS screen's placeholder.
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText('Search titles or authors…'),
      ).toBeTruthy(),
    );
    // The shared shell's filter button.
    expect(screen.getByLabelText('Filter Audiobooks options')).toBeTruthy();
    // The shared shell's header.
    expect(screen.getByText('Audiobooks')).toBeTruthy();
  });

  it('pull-to-refresh actually refetches', async () => {
    // The old screen's `refreshControl` was a no-op `<View>` — the
    // gesture was advertised and inert.
    mockAll.mockResolvedValue([makeBook(1)]);

    await renderWithProviders(Harness, {routeName: 'AudiobooksScreen'});
    await waitFor(() => expect(stateOf('count')).toBe('1'));
    expect(mockAll).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('pull'));
    });

    // The gesture ran the query again.
    await waitFor(() => expect(mockAll).toHaveBeenCalledTimes(2));
    expect(stateOf('refreshing')).toBe('false');
  });
});
