/**
 * The Downloads page follows the browse grammar.
 *
 * ## What this pins
 *
 * 1. **THE PAGE IS A BROWSE PAGE.** It renders the shared shell's
 *    header — instead of its own `SafeAreaView`, its own gradient, its
 *    own warm glow and its own two-line header.
 * 2. **THE BACK BUTTON NAMES ITS DESTINATION.** The page is reached
 *    from the Library, so the header's back action says "Back to
 *    Library" rather than relying on the history stack — a cold deep
 *    link has no history to go back to.
 * 3. **THE PAGE HAS NO FILTER BUTTON.** The auto-delete POLICY is not
 *    a scope the list answers, it is a setting the page reports, so it
 *    stays in the content and the shell draws no chip strip and no
 *    filter button.
 */

import {screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {DownloadsScreen} from '../../../src/screens/DownloadsScreen';

// The service's own jest.fn()s are created INSIDE the factory: a mock
// factory runs before this module's `const`s are initialised, so an
// outside reference would be read as `undefined` here.
jest.mock('../../../src/services/downloadService', () => ({
  downloadService: {
    ensureLoaded: jest.fn(async () => []),
    subscribe: jest.fn(() => jest.fn()),
    setKeepLastN: jest.fn(),
    getKeepLastN: jest.fn(() => 5),
    pauseDownload: jest.fn(),
    resumeDownload: jest.fn(),
    retryDownload: jest.fn(),
    removeDownload: jest.fn(),
  },
}));

jest.mock('../../../src/hooks/useDownloadsSync', () => ({
  useDownloadsSync: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    exists: jest.fn(() => Promise.resolve(true)),
    getFSInfo: jest.fn(() =>
      Promise.resolve({totalSpace: 1000, freeSpace: 500}),
    ),
    unlink: jest.fn(() => Promise.resolve()),
  },
}));

describe('the Downloads page — the browse grammar', () => {
  it('renders the shared shell — the header and the count', async () => {
    await renderWithProviders(DownloadsScreen, {routeName: 'Downloads'});

    // The shared shell's header.
    await waitFor(() => expect(screen.getByText('Downloads')).toBeTruthy());
    // The count is the header's plain subtitle.
    expect(screen.getByText('Offline playback')).toBeTruthy();
  });

  it('names where the back button goes', async () => {
    await renderWithProviders(DownloadsScreen, {routeName: 'Downloads'});

    await waitFor(() => expect(screen.getByText('Downloads')).toBeTruthy());
    expect(screen.getByLabelText('Back to Library')).toBeTruthy();
  });

  it('draws NO filter button — the auto-delete policy is not a scope', async () => {
    await renderWithProviders(DownloadsScreen, {routeName: 'Downloads'});

    await waitFor(() => expect(screen.getByText('Downloads')).toBeTruthy());
    expect(screen.queryByTestId('browse-active-filters')).toBeNull();
    expect(screen.queryByLabelText('Filter Downloads options')).toBeNull();
  });
});