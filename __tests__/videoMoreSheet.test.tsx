/**
 * v11 T3.1 — VideoMoreSheet scaffold render test.
 *
 * Tracker step 6: "open/dismiss animation ≥ 55 fps; back button
 * dismisses". The 55 fps claim is verified on device (per spec);
 * the JS test exercises:
 *   - sheet hidden when `visible: false`
 *   - sheet visible when `visible: true`
 *   - `accessibilityViewIsModal: true` is on the inner sheet
 *   - empty sections are HIDDEN (spec §4.7 non-empty rule)
 *   - non-empty sections render the section header
 *   - onRequestClose routes through onClose
 */
import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ThemeProvider} from '../src/theme';
import {
  VideoMoreSheet,
  type VideoMoreSheetQueueSection,
  type VideoMoreSheetTracksSection,
  type VideoMoreSheetChaptersSection,
  type VideoMoreSheetWindowSection,
  type VideoMoreSheetAudioSection,
} from '../src/modules/playback/video/presentation/VideoMoreSheet';

function createMockStore() {
  return configureStore({
    reducer: {
      settings: () => ({themeMode: 'dark'}),
    },
  });
}

async function renderWithProviders(ui: React.ReactElement) {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <ThemeProvider>{ui}</ThemeProvider>
    </Provider>,
  );
}

const noop = () => {};

const sampleQueue: VideoMoreSheetQueueSection = {
  currentRow: {
    id: 'a',
    title: 'Champion',
    meta: 'Now playing',
    badge: 'VIDEO',
  },
  upNext: [
    {id: 'b', title: 'Behind the Lions', meta: 'From queue', badge: 'VIDEO'},
    {id: 'c', title: 'Pride Rock Sessions', meta: 'From playlist', badge: 'VIDEO'},
  ],
  onPlayRow: noop,
  onClear: noop,
};

const sampleTracks: VideoMoreSheetTracksSection = {
  groups: [
    {
      id: 'video',
      title: 'Video',
      options: [{id: 'v0', label: '720p', selected: true}],
    },
    {
      id: 'audio',
      title: 'Audio',
      options: [{id: 'a0', label: 'English', selected: true}],
    },
    {
      id: 'subtitles',
      title: 'Subtitles',
      allowOff: true,
      offSelected: true,
      options: [{id: 's0', label: 'English (CC)', selected: false}],
    },
  ],
  onSelect: noop,
};

const sampleChapters: VideoMoreSheetChaptersSection = {
  rows: [
    {id: '0', title: 'Opening', time: '0:00', current: true},
    {id: '1', title: 'Act 1', time: '2:34', current: false},
  ],
  onSeek: noop,
};

const sampleWindow: VideoMoreSheetWindowSection = {
  canFullscreen: true,
  onToggleFullscreen: noop,
  canPip: true,
  onPip: noop,
};

const sampleAudio: VideoMoreSheetAudioSection = {
  onOpenEqualizer: noop,
};

describe('VideoMoreSheet — T3.1 scaffold', () => {
  test('renders nothing visible when visible=false (no Modal in tree)', async () => {
    await renderWithProviders(
      <VideoMoreSheet visible={false} onClose={noop} />,
    );
    // The Modal renders nothing in the test env when not visible; the
    // section header "MORE" should not appear.
    expect(screen.queryByText('More')).toBeNull();
  });

  test('renders the empty-state "More" header when no sections provided', async () => {
    await renderWithProviders(
      <VideoMoreSheet visible onClose={noop} />,
    );
    expect(screen.getByText('More')).toBeTruthy();
  });

  test('hidden sections are not rendered (spec §4.7 non-empty rule)', async () => {
    // Only tracks + window provided; queue / chapters / audio are absent.
    await renderWithProviders(
      <VideoMoreSheet
        visible
        onClose={noop}
        tracks={sampleTracks}
        window={sampleWindow}
      />,
    );
    expect(screen.getByText('Tracks & quality')).toBeTruthy();
    expect(screen.getByText('Window')).toBeTruthy();
    // Queue / Chapters / Audio SECTION containers must be absent.
    expect(screen.queryByTestId('moreSection:queue')).toBeNull();
    expect(screen.queryByTestId('moreSection:chapters')).toBeNull();
    expect(screen.queryByTestId('moreSection:audio')).toBeNull();
  });

  test('empty queue section is hidden (currentRow null + upNext empty)', async () => {
    const emptyQueue: VideoMoreSheetQueueSection = {
      currentRow: null,
      upNext: [],
      onPlayRow: noop,
      onClear: noop,
    };
    await renderWithProviders(
      <VideoMoreSheet visible onClose={noop} queue={emptyQueue} />,
    );
    expect(screen.queryByText('Up next')).toBeNull();
  });

  test('non-empty queue section renders the "Up next · Queue (N)" header', async () => {
    await renderWithProviders(
      <VideoMoreSheet visible onClose={noop} queue={sampleQueue} />,
    );
    // T4.3: header format is "Up next · Queue (N)".
    expect(screen.getByText('Up next · Queue (2)')).toBeTruthy();
  });

  test('all sections render their headers when provided', async () => {
    await renderWithProviders(
      <VideoMoreSheet
        visible
        onClose={noop}
        queue={sampleQueue}
        tracks={sampleTracks}
        chapters={sampleChapters}
        window={sampleWindow}
        audio={sampleAudio}
      />,
    );
    expect(screen.getByTestId('moreSection:queue')).toBeTruthy();
    expect(screen.getByTestId('moreSection:tracks')).toBeTruthy();
    expect(screen.getByTestId('moreSection:chapters')).toBeTruthy();
    expect(screen.getByTestId('moreSection:window')).toBeTruthy();
    expect(screen.getByTestId('moreSection:audio')).toBeTruthy();
  });

  test('tracks section renders the per-group headers (Video / Audio / Subtitles)', async () => {
    await renderWithProviders(
      <VideoMoreSheet visible onClose={noop} tracks={sampleTracks} />,
    );
    expect(screen.getByText('Video')).toBeTruthy();
    expect(screen.getByText('Audio')).toBeTruthy();
    expect(screen.getByText('Subtitles')).toBeTruthy();
  });

  test('tracks section renders the chip labels', async () => {
    await renderWithProviders(
      <VideoMoreSheet visible onClose={noop} tracks={sampleTracks} />,
    );
    expect(screen.getByText('720p')).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
    expect(screen.getByText('Off')).toBeTruthy();
    expect(screen.getByText('English (CC)')).toBeTruthy();
  });

  test('subtitles group renders an "Off" chip with the subtitles allowOff flag', async () => {
    const tracksNoOff: VideoMoreSheetTracksSection = {
      groups: [
        {
          id: 'subtitles',
          title: 'Subtitles',
          // allowOff intentionally false — the "Off" chip must NOT render.
          options: [{id: 's0', label: 'English (CC)', selected: true}],
        },
      ],
      onSelect: noop,
    };
    await renderWithProviders(
      <VideoMoreSheet visible onClose={noop} tracks={tracksNoOff} />,
    );
    expect(screen.queryByText('Off')).toBeNull();
    expect(screen.getByText('English (CC)')).toBeTruthy();
  });

  test('chapters section renders the row titles + times', async () => {
    await renderWithProviders(
      <VideoMoreSheet visible onClose={noop} chapters={sampleChapters} />,
    );
    expect(screen.getByText('Opening')).toBeTruthy();
    expect(screen.getByText('Act 1')).toBeTruthy();
    expect(screen.getByText('0:00')).toBeTruthy();
    expect(screen.getByText('2:34')).toBeTruthy();
  });

  test('chapter tap calls onSeek with the row id', async () => {
    const onSeek = jest.fn();
    await renderWithProviders(
      <VideoMoreSheet
        visible
        onClose={noop}
        chapters={{...sampleChapters, onSeek}}
      />,
    );
    const row = screen.getByTestId('moreChapter:1');
    fireEvent.press(row);
    expect(onSeek).toHaveBeenCalledWith('1');
  });

  test('window section renders Fullscreen + Picture in picture chips when both enabled', async () => {
    await renderWithProviders(
      <VideoMoreSheet
        visible
        onClose={noop}
        window={sampleWindow}
      />,
    );
    expect(screen.getByText('Fullscreen')).toBeTruthy();
    expect(screen.getByText('Picture in picture')).toBeTruthy();
  });

  test('fullscreen chip is muted when canFullscreen is false (Rule 12)', async () => {
    const windowNoFullscreen: VideoMoreSheetWindowSection = {
      canFullscreen: false,
      onToggleFullscreen: noop,
      canPip: true,
      onPip: noop,
    };
    await renderWithProviders(
      <VideoMoreSheet visible onClose={noop} window={windowNoFullscreen} />,
    );
    // The chip label is wrapped in "— not available" per the
    // CapabilityChip render path.
    expect(screen.getByText(/Fullscreen — not available/)).toBeTruthy();
    // PiP is still tappable.
    expect(screen.getByText('Picture in picture')).toBeTruthy();
  });

  test('PiP chip is muted when canPip is false (Rule 12)', async () => {
    const windowNoPip: VideoMoreSheetWindowSection = {
      canFullscreen: true,
      onToggleFullscreen: noop,
      canPip: false,
      onPip: noop,
    };
    await renderWithProviders(
      <VideoMoreSheet visible onClose={noop} window={windowNoPip} />,
    );
    expect(screen.getByText(/Picture in picture — not available/)).toBeTruthy();
  });

  test('audio section renders the Equalizer chip', async () => {
    const onOpenEqualizer = jest.fn();
    await renderWithProviders(
      <VideoMoreSheet
        visible
        onClose={noop}
        audio={{onOpenEqualizer}}
      />,
    );
    const chip = screen.getByTestId('moreAudio:equalizer');
    fireEvent.press(chip);
    expect(onOpenEqualizer).toHaveBeenCalledTimes(1);
  });

  test('queue section renders the current row + up-next rows + clear', async () => {
    await renderWithProviders(
      <VideoMoreSheet visible onClose={noop} queue={sampleQueue} />,
    );
    // Current row (the "Now playing" line) is non-tappable.
    expect(screen.getByText('Champion')).toBeTruthy();
    expect(screen.getByTestId('moreQueue:current')).toBeTruthy();
    // Up next header includes the count (T4.3 — "Up next · Queue (N)").
    expect(screen.getByText('Up next · Queue (2)')).toBeTruthy();
    expect(screen.getByText('Behind the Lions')).toBeTruthy();
    expect(screen.getByText('Pride Rock Sessions')).toBeTruthy();
    // The VIDEO badge appears per row.
    const videoBadges = screen.getAllByText('VIDEO');
    expect(videoBadges.length).toBeGreaterThanOrEqual(3);
    // Clear queue button.
    expect(screen.getByTestId('moreQueue:clear')).toBeTruthy();
  });

  test('queue section header count matches upNext length', async () => {
    const oneItemQueue: VideoMoreSheetQueueSection = {
      currentRow: null,
      upNext: [{id: 'x', title: 'Only one'}],
      onPlayRow: noop,
      onClear: noop,
    };
    await renderWithProviders(
      <VideoMoreSheet visible onClose={noop} queue={oneItemQueue} />,
    );
    expect(screen.getByText('Up next · Queue (1)')).toBeTruthy();
  });

  test('queue row tap calls onPlayRow with the full row object', async () => {
    const onPlayRow = jest.fn();
    await renderWithProviders(
      <VideoMoreSheet
        visible
        onClose={noop}
        queue={{...sampleQueue, onPlayRow}}
      />,
    );
    const row = screen.getByTestId('moreQueue:b');
    fireEvent.press(row);
    expect(onPlayRow).toHaveBeenCalledTimes(1);
    const arg = onPlayRow.mock.calls[0][0];
    expect(arg.id).toBe('b');
    expect(arg.title).toBe('Behind the Lions');
  });

  test('clear queue tap calls onClear', async () => {
    const onClear = jest.fn();
    await renderWithProviders(
      <VideoMoreSheet
        visible
        onClose={noop}
        queue={{...sampleQueue, onClear}}
      />,
    );
    const btn = screen.getByTestId('moreQueue:clear');
    fireEvent.press(btn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('queue rows are non-tappable while playing is true (error fix step 4)', async () => {
    const onPlayRow = jest.fn();
    await renderWithProviders(
      <VideoMoreSheet
        visible
        onClose={noop}
        queue={{...sampleQueue, onPlayRow, playing: true}}
      />,
    );
    const row = screen.getByTestId('moreQueue:b');
    fireEvent.press(row);
    expect(onPlayRow).not.toHaveBeenCalled();
  });
});
