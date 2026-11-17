/**
 * `useDownloadsScreen` — playing a finished download.
 *
 * The row's half of the §6.3.2 fix is in `DownloadsRow.test.tsx`. This
 * suite pins the hook's half:
 *
 *   1. the launch goes through the app's OWN seam
 *      (`useResumeAwareLaunch`) with the LOCAL path — never the remote
 *      `uri` the file was fetched from;
 *   2. a file that is no longer on disk is NOT launched, and the user is
 *      told so with the app's toast;
 *   3. a finished record can never reach `resumeDownload`, which
 *      RESTARTS the transfer and would re-download the file.
 *
 * The player facade and the download service are mocked: this suite is
 * about the DECISION this hook makes (which path, or no launch at all),
 * and the seam and the service each have their own suites.
 */

import React, {type ReactNode} from 'react';
import {act, renderHook, screen} from '@testing-library/react-native';
import RNFS from 'react-native-fs';

const mockOpenPlayer = jest.fn(async () => true);

jest.mock('../../../src/infrastructure/player', () => ({
  useResumeAwareLaunch: () => ({openPlayer: mockOpenPlayer}),
  resolveStreamType: (mediaType: string) => mediaType,
}));

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

// The shared `react-native-fs` mock has no `exists` — the check this
// hook makes before it launches anything.
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

import {useDownloadsScreen} from '../../../src/screens/DownloadsScreen/hooks/useDownloadsScreen';
import {ThemeProvider} from '../../../src/theme';
import {ToastProvider} from '../../../src/components/feedback/Toast';
import {
  downloadService,
  type DownloadRecord,
} from '../../../src/services/downloadService';

/** The mocked service, with its methods as mocks. */
const service = downloadService as jest.Mocked<typeof downloadService>;

function makeRecord(overrides: Partial<DownloadRecord> = {}): DownloadRecord {
  return {
    uri: 'https://example.test/song.mp3',
    localPath: '/data/downloads/song.mp3',
    title: 'Song',
    size: 1024,
    received: 1024,
    status: 'done',
    mediaType: 'audio',
    type: 'music',
    source: 'api',
    downloadedAt: 1_700_000_000_000,
    ...overrides,
  };
}

function Wrapper({children}: {children: ReactNode}) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

async function renderDownloadsHook() {
  return renderHook(() => useDownloadsScreen(), {wrapper: Wrapper});
}

describe('useDownloadsScreen — playing a finished download', () => {
  beforeEach(() => {
    mockOpenPlayer.mockClear();
    service.pauseDownload.mockClear();
    service.resumeDownload.mockClear();
    service.retryDownload.mockClear();
    service.removeDownload.mockClear();
    (RNFS.exists as unknown as jest.Mock).mockReset();
    (RNFS.exists as unknown as jest.Mock).mockResolvedValue(true);
  });

  it('launches the LOCAL file through the app seam, not the remote source', async () => {
    const record = makeRecord();
    const {result} = await renderDownloadsHook();

    await act(async () => {
      await result.current.handlePlay(record);
    });

    expect(mockOpenPlayer).toHaveBeenCalledTimes(1);
    expect(mockOpenPlayer).toHaveBeenCalledWith({
      uri: record.localPath,
      title: record.title,
      type: 'audio',
    });
    // The remote address the file was fetched FROM is never what plays.
    expect(mockOpenPlayer).not.toHaveBeenCalledWith(
      expect.objectContaining({uri: record.uri}),
    );
  });

  it('does not launch a file that is no longer on disk, and says so', async () => {
    (RNFS.exists as unknown as jest.Mock).mockResolvedValue(false);
    const record = makeRecord();
    const {result} = await renderDownloadsHook();

    await act(async () => {
      await result.current.handlePlay(record);
    });

    expect(mockOpenPlayer).not.toHaveBeenCalled();
    expect(
      await screen.findByText('This file is no longer on the device.'),
    ).toBeOnTheScreen();
    // Nothing is deleted behind the user's back.
    expect(service.removeDownload).not.toHaveBeenCalled();
  });

  it('never resumes a finished record — that would re-download it', async () => {
    const {result} = await renderDownloadsHook();

    await act(async () => {
      result.current.handlePauseResume('https://example.test/song.mp3', 'done');
    });

    expect(service.resumeDownload).not.toHaveBeenCalled();
    expect(service.pauseDownload).not.toHaveBeenCalled();
  });

  it('still pauses a running transfer and resumes a paused one', async () => {
    const {result} = await renderDownloadsHook();

    await act(async () => {
      result.current.handlePauseResume('uri', 'downloading');
    });
    expect(service.pauseDownload).toHaveBeenCalledWith('uri');
    expect(service.resumeDownload).not.toHaveBeenCalled();

    await act(async () => {
      result.current.handlePauseResume('uri', 'paused');
    });
    expect(service.resumeDownload).toHaveBeenCalledWith('uri');
  });
});
