/**
 * v11 T8.3 — Chrome adaptation + rotate affordances.
 *
 * Coverage:
 *   T8.3: utility-row rotate button (VideoControlButton with the
 *         expand/collapse icon + enter/exit fullscreen label)
 *         shows on the full-mode chrome when canFullscreen is true.
 *   T8.3: the button HIDES when isLocked is true (lock mode
 *         = no chrome-changing affordance).
 *   T8.3: the button icon + label flip when isFullscreen flips.
 *   T8.3: VideoTopBar back button label flips to
 *         "Exit fullscreen" in landscape.
 *   T8.3: calculateVideoSafeGeometry uses a 24 px bottom floor
 *         in landscape, 12 px in portrait.
 *   T8.3: a transient `fullscreenFailed` state auto-clears after
 *         2 s (covered structurally - the host wires the
 *         2 s setTimeout in its useEffect).
 */
import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ThemeProvider} from '../src/theme';
import {VideoControlLayer} from '../src/modules/playback/video/presentation/VideoControlLayer';
import {VideoTopBar} from '../src/modules/playback/video/presentation/VideoTopBar';
import {calculateVideoSafeGeometry} from '../src/modules/playback/video/presentation/VideoPresentationTypes';
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

const NO_FULLSCREEN_CAPS: VideoCapabilities = {...CAPS, canFullscreen: false};

const SESSION: VideoSessionSnapshot = emptyVideoSnapshot();

const GEOM: VideoSafeGeometry = {
  topContentInset: 12,
  bottomContentInset: 24,
  horizontalContentInset: 16,
  controlGap: 14,
  utilityGap: 12,
  compact: false,
  landscape: false,
};

describe('T8.3 utility-row rotate button', () => {
  test('renders with the "Enter fullscreen" label and expand icon when not fullscreen', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={SESSION}
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
        isFullscreen={false}
      />,
    );
    const button = screen.getByLabelText('Enter fullscreen');
    expect(button).toBeTruthy();
    expect(screen.getByText('expand')).toBeTruthy();
  });

  test('icon + label flip to collapse / Exit fullscreen when isFullscreen is true', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={SESSION}
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
        isFullscreen
      />,
    );
    // When isFullscreen is true, BOTH the top-bar back button
    // and the utility-row rotate button carry the "Exit
    // fullscreen" label. We assert the count is 2 (one each
    // for the two surfaces) and that the unique "collapse"
    // icon is present in the utility row.
    expect(screen.getAllByLabelText('Exit fullscreen')).toHaveLength(2);
    expect(screen.getByText('collapse')).toBeTruthy();
  });

  test('rotate button HIDES in lock mode (isLocked=true)', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={SESSION}
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
        onToggleLock={() => {}}
        isLocked
        isFullscreen={false}
      />,
    );
    // The lock mode hides the bottom chrome entirely (the
    // chromeVisible && !isLocked gate on the bottom scrim).
    // Therefore the rotate button is also gone \u2014 same path
    // as auto-hide. The test asserts the absence of the
    // Enter fullscreen label.
    expect(screen.queryByLabelText('Enter fullscreen')).toBeNull();
  });

  test('rotate button HIDES when canFullscreen is false (Rule 12 - no dead control)', async () => {
    await renderWithProviders(
      <VideoControlLayer
        mode="full"
        session={SESSION}
        capabilities={NO_FULLSCREEN_CAPS}
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
    // Rule 12: when canFullscreen is false, the button is not
    // rendered. The user sees a muted non-tappable row in the
    // MoreSheet's Window section instead.
    expect(screen.queryByLabelText('Enter fullscreen')).toBeNull();
  });
});

describe('T8.3 VideoTopBar back button in landscape', () => {
  test('back label is "Go back" in portrait (default)', async () => {
    await renderWithProviders(
      <VideoTopBar
        title="Champion"
        onBack={() => {}}
        onClose={() => {}}
        isFullscreen={false}
      />,
    );
    expect(screen.getByLabelText('Go back')).toBeTruthy();
    expect(screen.queryByLabelText('Exit fullscreen')).toBeNull();
  });

  test('back label flips to "Exit fullscreen" in landscape', async () => {
    await renderWithProviders(
      <VideoTopBar
        title="Champion"
        onBack={() => {}}
        onClose={() => {}}
        isFullscreen
      />,
    );
    expect(screen.getByLabelText('Exit fullscreen')).toBeTruthy();
    expect(screen.queryByLabelText('Go back')).toBeNull();
  });
});

describe('T8.3 calculateVideoSafeGeometry \u2014 24 px landscape bottom', () => {
  test('portrait: bottomContentInset floor is 12 px', () => {
    const geom = calculateVideoSafeGeometry(
      {top: 0, right: 0, bottom: 0, left: 0},
      {width: 360, height: 780},
    );
    expect(geom.landscape).toBe(false);
    expect(geom.bottomContentInset).toBe(12);
  });

  test('landscape: bottomContentInset floor is 24 px (spec \u00a74.9)', () => {
    const geom = calculateVideoSafeGeometry(
      {top: 0, right: 0, bottom: 0, left: 0},
      {width: 780, height: 360},
    );
    expect(geom.landscape).toBe(true);
    expect(geom.bottomContentInset).toBe(24);
  });

  test('landscape: real system bottom inset wins when larger than 24', () => {
    // A device with a 48 px side-mount home indicator still
    // gets its real value (48), not the 24 px floor.
    const geom = calculateVideoSafeGeometry(
      {top: 0, right: 0, bottom: 48, left: 0},
      {width: 780, height: 360},
    );
    expect(geom.bottomContentInset).toBe(48);
  });
});
