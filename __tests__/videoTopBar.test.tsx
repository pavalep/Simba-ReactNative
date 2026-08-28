/**
 * v11 T2.1 — VideoTopBar render test.
 *
 * Tracker step 6: "visual: title ellipsises on long titles without
 * pushing buttons". We mock `VideoControlButton` to a thin stub so the
 * test exercises the bar's layout/contract without dragging
 * `react-native-svg` into the test env (which the existing
 * `__mocks__/react-native-svg.js` doesn't fully cover for named
 * imports — it works for the live component but not for the
 * `Svg` root that `VideoIcon` renders).
 */
import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ThemeProvider} from '../src/theme';

jest.mock(
  '../src/modules/playback/video/presentation/VideoControlButton',
  () => {
    // `mock`-prefixed names are allowed inside jest.mock factories
    // (Jest hoists them). We import inside the factory to dodge the
    // out-of-scope-var guard.
    const mockReact = require('react');
    const mockRN = require('react-native');
    return {
      VideoControlButton: ({
        label,
        onPress,
        testID,
      }: {
        label: string;
        onPress: () => void;
        testID?: string;
      }) =>
        mockReact.createElement(
          mockRN.View,
          {
            testID: testID ?? `btn:${label}`,
            accessibilityRole: 'button',
            accessibilityLabel: label,
            onTouchEnd: onPress,
          },
        ),
    };
  },
);

// Mock the geometry hook so we don't need a real window.
jest.mock(
  '../src/modules/playback/video/presentation/useVideoPresentationGeometry',
  () => ({
    useVideoPresentationGeometry: () => ({
      topContentInset: 12,
      bottomContentInset: 12,
      horizontalContentInset: 16,
      controlGap: 14,
      utilityGap: 12,
      compact: false,
      landscape: false,
    }),
  }),
);

import {VideoTopBar} from '../src/modules/playback/video/presentation/VideoTopBar';

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

describe('VideoTopBar — T2.1', () => {
  test('renders the title and the close button', async () => {
    await renderWithProviders(
      <VideoTopBar title="Champion" onBack={noop} onClose={noop} />,
    );
    expect(screen.getByText('Champion')).toBeTruthy();
    expect(screen.getByLabelText('Close video player')).toBeTruthy();
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  test('long title renders with numberOfLines: 1 (does not push buttons)', async () => {
    await renderWithProviders(
      <VideoTopBar
        title="A very long video title that absolutely would overflow the chrome if it were not constrained to one line"
        onBack={noop}
        onClose={noop}
      />,
    );
    const titleNode = screen.getByText(/A very long video title/);
    expect(titleNode.props.numberOfLines).toBe(1);
  });

  test('lock renders only when onToggleLock is provided', async () => {
    await renderWithProviders(
      <VideoTopBar title="x" onBack={noop} onClose={noop} />,
    );
    expect(screen.queryByLabelText('Lock controls')).toBeNull();
    expect(screen.queryByLabelText('Unlock controls')).toBeNull();
  });

  test('lock renders when onToggleLock is provided (label: "Lock controls")', async () => {
    await renderWithProviders(
      <VideoTopBar
        title="x"
        onBack={noop}
        onClose={noop}
        onToggleLock={noop}
      />,
    );
    expect(screen.getByLabelText('Lock controls')).toBeTruthy();
  });

  test('locked=true flips the lock label to "Unlock controls"', async () => {
    await renderWithProviders(
      <VideoTopBar
        title="x"
        onBack={noop}
        onClose={noop}
        onToggleLock={noop}
        isLocked
      />,
    );
    expect(screen.getByLabelText('Unlock controls')).toBeTruthy();
  });

  test('more renders only when onOpenMore is provided', async () => {
    await renderWithProviders(
      <VideoTopBar title="x" onBack={noop} onClose={noop} />,
    );
    expect(screen.queryByLabelText('More options')).toBeNull();
  });

  test('more renders when onOpenMore is provided (label: "More options")', async () => {
    await renderWithProviders(
      <VideoTopBar
        title="x"
        onBack={noop}
        onClose={noop}
        onOpenMore={noop}
      />,
    );
    expect(screen.getByLabelText('More options')).toBeTruthy();
  });
});
