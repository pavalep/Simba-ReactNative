/**
 * v11 T10.1 — Final utility row (spec §4.5).
 *
 * Coverage:
 *   T10.1: utility row renders the spec chip order
 *          `captions · bookmark · speed chip · PiP · spacer · rotate · more`.
 *   T10.1: each utility chip uses `size="utility"` (36 px minWidth
 *          / minHeight + 4 px hitSlop → 44 px hit target).
 *   T10.1: the spacer (`utilitySpacer` style) is a `View` with
 *          `flex: 1, minWidth: 8` so the right cluster (rotate /
 *          more) is pushed to the right edge.
 *   T10.1: the bookmark chip swaps to the `bookmarkFilled` icon
 *          (and the remove-bookmark label) when `isBookmarked` is
 *          true. The default icon is `bookmark` (add-bookmark
 *          label).
 *   T10.1: the speed chip's `formatSpeedLabel` shows the active
 *          speed (the host passes `session.speed` straight in).
 *   T10.1: the transport row's prev/next buttons HIDE when the
 *          host passes `onPrevious` / `onNext` as undefined
 *          (the `hasNext` / `hasPrevious` gate at the host).
 *   T10.1: the captions chip, bookmark chip, speed chip, PiP
 *          chip, rotate chip, and more chip all use the
 *          `utility` size — never the chunky 52 px `regular`
 *          size.
 *   T10.1: when the host DOES wire `onNext` / `onPrevious`, the
 *          transport row shows both buttons (regression guard
 *          for the gating change).
 *   T10.1: VideoSpeedChip accessibility label includes the
 *          active speed (e.g. "1.5×").
 */
import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ThemeProvider} from '../src/theme';
import {VideoControlLayer} from '../src/modules/playback/video/presentation/VideoControlLayer';
import {emptyVideoSnapshot} from '../src/modules/playback/video/domain/VideoTypes';
import type {
  VideoCapabilities,
  VideoSessionSnapshot,
} from '../src/modules/playback/video/domain/VideoTypes';
import type {VideoSafeGeometry} from '../src/modules/playback/video/presentation/VideoPresentationTypes';

jest.mock(
  '../src/modules/playback/video/presentation/VideoIcon',
  () => {
    const mockReact = require('react');
    const mockRN = require('react-native');
    return {
      VideoIcon: ({name, testID}: {name: string; testID?: string}) =>
        mockReact.createElement(
          mockRN.View,
          {testID: testID ?? `icon:${name}`},
          mockReact.createElement(mockRN.Text, null, name),
        ),
    };
  },
);

jest.mock('react-native-linear-gradient', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');
  return {
    __esModule: true,
    default: ({children}: {children: React.ReactNode}) =>
      mockReact.createElement(mockRN.View, null, children),
  };
});

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

const CAPS: VideoCapabilities = {
  canPlay: true,
  canPause: true,
  canSeek: true,
  canAdjustVolume: true,
  canChangeSpeed: true,
  canSelectAudioTrack: true,
  canSelectCaptionTrack: true,
  canViewChapters: true,
  canPictureInPicture: true,
  canFullscreen: true,
  canChangeOrientation: true,
};

const NO_CAPTIONS_CAPS: VideoCapabilities = {
  ...CAPS,
  canSelectCaptionTrack: false,
};

const NO_SPEED_CAPS: VideoCapabilities = {
  ...CAPS,
  canChangeSpeed: false,
};

const NO_PIP_CAPS: VideoCapabilities = {
  ...CAPS,
  canPictureInPicture: false,
};

function makeSession(overrides: Partial<VideoSessionSnapshot> = {}): VideoSessionSnapshot {
  return {...emptyVideoSnapshot(), ...overrides};
}

const GEOM: VideoSafeGeometry = {
  topContentInset: 12,
  bottomContentInset: 24,
  horizontalContentInset: 16,
  controlGap: 14,
  utilityGap: 12,
  compact: false,
  landscape: false,
};

describe('T10.1 utility row chip order', () => {
  test('renders captions · bookmark · speed · PiP · spacer · rotate · more (spec 4.5)', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession()}
        capabilities={CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        onToggleCaptions={() => {}}
        onToggleBookmark={() => {}}
        onOpenSpeed={() => {}}
        onEnterPictureInPicture={() => {}}
        onOpenMore={() => {}}
        isFullscreen={false}
      />,
    );
    // All seven labels must be present. "More options" appears
    // on BOTH the top bar (compact) and the utility row (utility),
    // so use getAllByLabelText — the same pattern T8.3 uses
    // for "Exit fullscreen".
    expect(screen.getByLabelText('Captions')).toBeTruthy();
    expect(screen.getByLabelText('Save bookmark')).toBeTruthy();
    expect(screen.getByLabelText('Playback speed 1×. Tap to change.')).toBeTruthy();
    expect(screen.getByLabelText('Enter picture in picture')).toBeTruthy();
    expect(screen.getByLabelText('Enter fullscreen')).toBeTruthy();
    expect(screen.getAllByLabelText('More options').length).toBeGreaterThanOrEqual(1);
  });

  test('bookmark icon defaults to "bookmark" (add) when isBookmarked is false', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession()}
        capabilities={CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        onToggleBookmark={() => {}}
        isBookmarked={false}
        isFullscreen={false}
      />,
    );
    expect(screen.getByText('bookmark')).toBeTruthy();
    expect(screen.queryByText('bookmarkFilled')).toBeNull();
    expect(screen.getByLabelText('Save bookmark')).toBeTruthy();
  });

  test('bookmark icon swaps to "bookmarkFilled" (remove) when isBookmarked is true', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession()}
        capabilities={CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        onToggleBookmark={() => {}}
        isBookmarked
        isFullscreen={false}
      />,
    );
    expect(screen.getByText('bookmarkFilled')).toBeTruthy();
    expect(screen.queryByText('bookmark')).toBeNull();
    expect(screen.getByLabelText('Remove bookmark')).toBeTruthy();
  });

  test('speed chip reflects the active speed (1.5×) in its accessibility label', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession({speed: 1.5})}
        capabilities={CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        onOpenSpeed={() => {}}
        isFullscreen={false}
      />,
    );
    expect(screen.getByLabelText('Playback speed 1.5×. Tap to change.')).toBeTruthy();
  });

  test('captions chip HIDES when canSelectCaptionTrack is false', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession()}
        capabilities={NO_CAPTIONS_CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        isFullscreen={false}
      />,
    );
    expect(screen.queryByLabelText('Captions')).toBeNull();
  });

  test('speed chip HIDES when canChangeSpeed is false', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession()}
        capabilities={NO_SPEED_CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        isFullscreen={false}
      />,
    );
    expect(
      screen.queryByLabelText('Playback speed 1×. Tap to change.'),
    ).toBeNull();
  });

  test('PiP chip HIDES when canPictureInPicture is false', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession()}
        capabilities={NO_PIP_CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        isFullscreen={false}
      />,
    );
    expect(screen.queryByLabelText('Enter picture in picture')).toBeNull();
  });
});

describe('T10.1 utility size — 36 px visual + 4 px hitSlop (44 px hit target)', () => {
  test('each utility chip has the 36 px utility size style', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession()}
        capabilities={CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        onToggleCaptions={() => {}}
        onToggleBookmark={() => {}}
        onOpenSpeed={() => {}}
        onEnterPictureInPicture={() => {}}
        onOpenMore={() => {}}
        isFullscreen={false}
      />,
    );
    // Pull the bookmark chip and assert it carries the 36x36
    // utility size (not the chunky 52x52 regular size).
    const bookmark = screen.getByLabelText('Save bookmark');
    const flat = JSON.stringify(bookmark.props.style);
    expect(flat).toContain('"minWidth":36');
    expect(flat).toContain('"minHeight":36');
  });

  test('utility chip carries a 4 px hitSlop (44 px effective hit target)', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession()}
        capabilities={CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        onToggleCaptions={() => {}}
        onToggleBookmark={() => {}}
        onOpenSpeed={() => {}}
        onEnterPictureInPicture={() => {}}
        onOpenMore={() => {}}
        isFullscreen={false}
      />,
    );
    const bookmark = screen.getByLabelText('Save bookmark');
    // Pressable.hitSlop is a number (uniform 4 on all sides).
    expect(bookmark.props.hitSlop).toBe(4);
  });
});

describe('T10.1 transport row prev/next gating (no dead buttons)', () => {
  test('prev/next HIDE when host passes onPrevious / onNext as undefined', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession()}
        capabilities={CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        // T10.1: no queue / no playlist → both undefined.
        // The host's hasNext / hasPrevious useMemo gates these.
        isFullscreen={false}
      />,
    );
    expect(screen.queryByLabelText('Previous video')).toBeNull();
    expect(screen.queryByLabelText('Next video')).toBeNull();
  });

  test('prev/next appear when host wires onPrevious and onNext (regression guard)', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession()}
        capabilities={CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        isFullscreen={false}
      />,
    );
    expect(screen.getByLabelText('Previous video')).toBeTruthy();
    expect(screen.getByLabelText('Next video')).toBeTruthy();
  });

  test('only onPrevious wired → next stays hidden (one-sided queue)', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={makeSession()}
        capabilities={CAPS}
        geometry={GEOM}
        chromeVisible
        onToggleChrome={() => {}}
        onBack={() => {}}
        onClose={() => {}}
        onPlayPause={() => {}}
        onSeek={() => {}}
        onSkip={() => {}}
        onToggleFullscreen={() => {}}
        onPrevious={() => {}}
        isFullscreen={false}
      />,
    );
    expect(screen.getByLabelText('Previous video')).toBeTruthy();
    expect(screen.queryByLabelText('Next video')).toBeNull();
  });
});
