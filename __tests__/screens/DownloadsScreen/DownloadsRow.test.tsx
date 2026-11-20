/**
 * `DownloadsScreen` — a finished download must be PLAYABLE, and its
 * action must not re-download it.
 *
 * §6.3.2 of `md/CONTENT_OWNERSHIP.md` found two defects on this page:
 * the row body was a plain `View`, so a completed download could not be
 * opened from the list; and the first action button on a `done` row drew
 * a download glyph but called `resumeDownload` — which RESTARTS the
 * transfer, i.e. it re-downloaded the file that was already on the
 * device.
 *
 * These tests pin the ROW's half of the fix, one state at a time:
 *
 *   - `done`        → the body is a button ("Play <title>") and the first
 *                     action is "Play download" — and it PLAYS, it does
 *                     not resume.
 *   - `paused`      → the body is NOT pressable; the action resumes.
 *   - `downloading` → the body is NOT pressable; the action pauses.
 *   - `error`       → the body is NOT pressable; the action retries.
 *
 * The screen's hook is mocked: this suite is about the row's wiring. The
 * hook's own half — the local-file check and the launch — is covered by
 * `useDownloadsScreen.play.test.tsx`.
 */

import {fireEvent, screen} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';

jest.mock('../../../src/screens/DownloadsScreen/hooks/useDownloadsScreen', () => ({
  useDownloadsScreen: jest.fn(),
}));

// The ICON NAME is one of the things under test, and the SVG assets are
// mocked to placeholder Views — so the name would be invisible in the
// rendered tree. The mock keeps it as a testID.
jest.mock('../../../src/components/utility/SvgIcon', () => {
  const ReactActual = jest.requireActual('react');
  const {View} = jest.requireActual('react-native');
  return {
    SvgIcon: ({name}: {name: string}) =>
      ReactActual.createElement(View, {testID: `icon-${name}`}),
  };
});

import {useDownloadsScreen} from '../../../src/screens/DownloadsScreen/hooks/useDownloadsScreen';
import type {DownloadsScreenResult} from '../../../src/screens/DownloadsScreen/hooks/useDownloadsScreen';
import {DownloadsScreen} from '../../../src/screens/DownloadsScreen';
import type {DownloadRecord} from '../../../src/services/downloadService';

const mockUseDownloadsScreen =
  useDownloadsScreen as jest.MockedFunction<typeof useDownloadsScreen>;

const mockOnPlay = jest.fn();
const mockOnPauseResume = jest.fn();
const mockOnRetry = jest.fn();
const mockOnDelete = jest.fn();

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

async function renderRow(record: DownloadRecord) {
  const result: DownloadsScreenResult = {
    records: [record],
    downloadsBytes: record.size,
    autoDeleteDownloads: 5,
    storage: {total: 1000, free: 500, loaded: true},
    confirmUri: null,
    confirmRecord: null,
    setConfirmUri: mockOnDelete,
    handlePolicyChange: jest.fn(),
    handlePauseResume: mockOnPauseResume,
    handleRetry: mockOnRetry,
    handlePlay: mockOnPlay,
    handleDelete: jest.fn(),
  };
  mockUseDownloadsScreen.mockReturnValue(result);
  return renderWithProviders(DownloadsScreen, {routeName: 'Downloads'});
}

describe('DownloadsScreen — the download row', () => {
  beforeEach(() => {
    mockOnPlay.mockReset();
    mockOnPauseResume.mockReset();
    mockOnRetry.mockReset();
    mockOnDelete.mockReset();
  });

  it('makes a finished row\'s body pressable, and names the item', async () => {
    await renderRow(makeRecord({status: 'done'}));

    const body = screen.getByLabelText('Play Song');
    expect(body.props.accessibilityRole).toBe('button');
  });

  it('plays the finished row when its body is pressed', async () => {
    const record = makeRecord({status: 'done'});
    await renderRow(record);

    await fireEvent.press(screen.getByLabelText('Play Song'));

    expect(mockOnPlay).toHaveBeenCalledWith(record);
    expect(mockOnPauseResume).not.toHaveBeenCalled();
  });

  it('makes the finished row\'s first action PLAY, not resume', async () => {
    const record = makeRecord({status: 'done'});
    await renderRow(record);

    const action = screen.getByLabelText('Play download');
    await fireEvent.press(action);

    expect(mockOnPlay).toHaveBeenCalledWith(record);
    // The defect: this button used to call `resumeDownload`, which
    // re-downloaded the file that was already on the device.
    expect(mockOnPauseResume).not.toHaveBeenCalled();
    expect(mockOnRetry).not.toHaveBeenCalled();
  });

  it('draws the play glyph on the finished row\'s action', async () => {
    await renderRow(makeRecord({status: 'done'}));

    expect(screen.getAllByTestId('icon-play').length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId('icon-download')).toHaveLength(0);
  });

  it('does not make a paused row pressable, and keeps Resume', async () => {
    const record = makeRecord({status: 'paused'});
    await renderRow(record);

    expect(screen.queryByLabelText('Play Song')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Resume download'));

    expect(mockOnPauseResume).toHaveBeenCalledWith(record.uri, 'paused');
    expect(mockOnPlay).not.toHaveBeenCalled();
  });

  it('does not make a downloading row pressable, and keeps Pause', async () => {
    const record = makeRecord({
      status: 'downloading',
      received: 512,
      size: 1024,
    });
    await renderRow(record);

    expect(screen.queryByLabelText('Play Song')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Pause download'));

    expect(mockOnPauseResume).toHaveBeenCalledWith(record.uri, 'downloading');
    expect(mockOnPlay).not.toHaveBeenCalled();
  });

  it('does not make a failed row pressable, and keeps Retry', async () => {
    const record = makeRecord({status: 'error', error: 'HTTP 404'});
    await renderRow(record);

    expect(screen.queryByLabelText('Play Song')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Retry download'));

    expect(mockOnRetry).toHaveBeenCalledWith(record.uri);
    expect(mockOnPlay).not.toHaveBeenCalled();
  });

  it('leaves the delete action exactly as it was', async () => {
    const record = makeRecord({status: 'done'});
    await renderRow(record);

    await fireEvent.press(screen.getByLabelText('Delete download'));

    expect(mockOnDelete).toHaveBeenCalledWith(record.uri);
    expect(mockOnPlay).not.toHaveBeenCalled();
  });
});
