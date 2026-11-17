/**
 * The Library page — the title dropdown, after the playlists mode went.
 *
 * ## Why this exists
 *
 * The Library used to have a "Playlists" CONTENT MODE: the title
 * dropdown switched what the page rendered, and a "+" FAB created a
 * playlist from there. All Playlists owns the playlist list and the kind
 * chips (spec §6.4), so the mode is gone: the Library always renders
 * its own segments, and the dropdown's "Playlists" entry NAVIGATES to
 * All Playlists.
 *
 * ## What this pins
 *
 *  1. The Library always shows its four segments (Folders / Audio /
 *     Artists / Albums) — there is no second content mode to switch to.
 *  2. The dropdown is a MENU, and it says so: the sheet's header reads
 *     "Go to", not "Select View", because one of its entries leaves the
 *     page.
 *  3. The two entries are "Library" (the page you are on) and
 *     "Playlists" (the page that owns the playlists).
 *  4. The create-playlist FAB is gone — All Playlists owns creation.
 */

import React from 'react';
import {screen, fireEvent} from '@testing-library/react-native';

import {renderChrome} from '../../helpers/renderChrome';

// The screen's hook is mocked, but its CONSTANTS are the real ones: the
// segment rail and the menu are the app's own lists, and a test that
// copied them would keep passing after the app changed them.
jest.mock('../../../src/features/library/presentation/hooks/useLibraryScreen', () => {
  const config = jest.requireActual(
    '../../../src/features/library/presentation/related/localFilesConfig',
  );
  return {
    useLibraryScreen: jest.fn(),
    SEGMENTS: config.LOCAL_FILE_SEGMENTS,
    FILTER_CHIPS: config.LOCAL_MEDIA_FILTERS,
    SORT_OPTIONS: config.LOCAL_SORT_OPTIONS,
    LIBRARY_MENU_ENTRIES: config.LOCAL_LIBRARY_MENU_ENTRIES,
    GRID_GAP: config.LOCAL_GRID_GAP,
  };
});

// The segments and the scan banner read the media store.
jest.mock('../../../src/state', () => ({
  useMediaStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      tracks: [],
      isScanning: false,
      scanProgress: null,
      scanHistory: null,
      cancelRequested: false,
      permissionRevokedFolders: [],
    }),
  useSettingsStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      themeMode: 'dark',
      videoFolders: [],
      audioFolders: [],
      lastScanTimestamp: null,
    }),
}));

import {useLibraryScreen} from '../../../src/features/library/presentation/hooks/useLibraryScreen';
import {LibraryScreen} from '../../../src/features/library/presentation/components/LibraryScreenContent';
import type {LibraryScreenProps} from '../../../src/navigation/types';

const mockUseLibraryScreen = useLibraryScreen as jest.MockedFunction<typeof useLibraryScreen>;

const mockMenuSelect = jest.fn();

const colors = {
  background: {primary: '#000000', elevated: '#111111'},
  text: {primary: '#ffffff', secondary: '#aaaaaa'},
  accent: {gold: '#c9a84c', goldDim: '#3a3218'},
  border: {subtle: '#222222'},
};

function fakeResult() {
  return {
    theme: 'dark',
    colors,
    isDark: true,
    insets: {top: 0, bottom: 0, left: 0, right: 0},
    fabBottomInset: 0,
    contentBottomInset: 80,
    activeSegment: 'folders',
    setActiveSegment: jest.fn(),
    showDropdown: false,
    setShowDropdown: jest.fn(),
    viewMode: 'list',
    setViewMode: jest.fn(),
    sortBy: 'name',
    setSortBy: jest.fn(),
    filterType: 'all',
    setFilterType: jest.fn(),
    sortPickerVisible: false,
    setSortPickerVisible: jest.fn(),
    videoFolders: [],
    audioFolders: [],
    lastScanTimestamp: null,
    scannedTrackCount: 0,
    scannedTracks: [],
    selectedSortLabel: 'Name',
    showSortControls: false,
    showFilterChips: false,
    showViewToggle: false,
    isScanning: false,
    scanProgress: null,
    scanHistory: null,
    cancelScan: jest.fn(),
    isRefreshing: false,
    hasAnimated: true,
    isAudioPlaying: false,
    currentAudioUri: null,
    handleRefresh: jest.fn(),
    navigateToLinkedFolders: jest.fn(),
    navigateToFolderBrowser: jest.fn(),
    handleLinkFolder: jest.fn(),
    handleArtistPress: jest.fn(),
    handleAlbumPress: jest.fn(),
    handleScanAudioFolders: jest.fn(),
    handleMediaPress: jest.fn(),
    handleLibraryMenuSelect: mockMenuSelect,
  };
}

async function renderLibrary() {
  // The dropdown's open state is REAL state here: pressing the title has
  // to open the sheet, and a mocked `setShowDropdown` that changes
  // nothing would leave the sheet closed and the test would pass on a
  // page that cannot be opened.
  mockUseLibraryScreen.mockImplementation(() => {
    const [showDropdown, setShowDropdown] = React.useState(false);
    return {
      ...fakeResult(),
      showDropdown,
      setShowDropdown,
    } as unknown as ReturnType<typeof useLibraryScreen>;
  });
  const props = {
    navigation: {navigate: jest.fn()},
    route: {name: 'Library', key: 'library', params: undefined},
  } as unknown as LibraryScreenProps;
  return renderChrome(<LibraryScreen {...props} />, {theme: true});
}

describe('the Library page — the segments', () => {
  beforeEach(() => {
    mockMenuSelect.mockReset();
  });

  it('shows the four library segments', async () => {
    await renderLibrary();

    expect(screen.getByText('Folders')).toBeOnTheScreen();
    expect(screen.getByText('Audio')).toBeOnTheScreen();
    expect(screen.getByText('Artists')).toBeOnTheScreen();
    expect(screen.getByText('Albums')).toBeOnTheScreen();
  });

  it('has no playlist list and no create-playlist FAB', async () => {
    await renderLibrary();

    expect(screen.queryByText('Playlists')).toBeNull();
    expect(screen.queryByLabelText('Create playlist')).toBeNull();
  });
});

describe('the Library page — the title dropdown', () => {
  beforeEach(() => {
    mockMenuSelect.mockReset();
  });

  it('opens a menu that says what it does', async () => {
    await renderLibrary();

    await fireEvent.press(screen.getByText('Library'));

    expect(screen.getByText('Go to')).toBeOnTheScreen();
    expect(screen.queryByText('Select View')).toBeNull();
  });

  it('offers the Library and the Playlists page', async () => {
    await renderLibrary();

    await fireEvent.press(screen.getByText('Library'));

    // The title says "Library" too, so the sheet's own entry is the
    // SECOND one.
    expect(screen.getAllByText('Library')).toHaveLength(2);
    expect(screen.getByText('Playlists')).toBeOnTheScreen();
  });

  it('hands the chosen entry to the page', async () => {
    await renderLibrary();

    await fireEvent.press(screen.getByText('Library'));
    await fireEvent.press(screen.getByText('Playlists'));

    expect(mockMenuSelect).toHaveBeenCalledWith('playlists');
  });
});
