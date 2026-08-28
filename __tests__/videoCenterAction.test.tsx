/**
 * v11 T5.1 — VideoCenterAction render test.
 *
 * Tracker step 6: "visual in paused/ended/error". We mock
 * `VideoIcon` to a thin stub so the test exercises the bar's
 * contract (icon by phase, label by phase, hint by phase) without
 * dragging `react-native-svg` into the test env.
 */
import React from 'react';
import {Text, View} from 'react-native';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ThemeProvider} from '../src/theme';

jest.mock(
  '../src/modules/playback/video/presentation/VideoIcon',
  () => {
    // `mock`-prefixed names are allowed inside jest.mock factories
    // (Jest hoists them). We import inside the factory to dodge the
    // out-of-scope-var guard.
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

import {VideoCenterAction} from '../src/modules/playback/video/presentation/VideoCenterAction';

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

describe('VideoCenterAction — T5.1', () => {
  test('phase=paused: play icon, "Play" a11y label, no hint', async () => {
    await renderWithProviders(
      <VideoCenterAction phase="paused" onPress={noop} />,
    );
    expect(screen.getByTestId('icon:play')).toBeTruthy();
    // The "Play" string is the a11y label, not a visible Text.
    expect(screen.getByLabelText('Play')).toBeTruthy();
    // No hint in the paused phase.
    expect(screen.queryByText('Play from beginning')).toBeNull();
    expect(screen.queryByText('Try loading the video again')).toBeNull();
  });

  test('phase=finished: replay icon, "Replay" a11y label, "Play from beginning" hint', async () => {
    await renderWithProviders(
      <VideoCenterAction phase="finished" onPress={noop} />,
    );
    expect(screen.getByTestId('icon:replay')).toBeTruthy();
    expect(screen.getByLabelText('Replay')).toBeTruthy();
    // The hint is a visible Text node.
    expect(screen.getByText('Play from beginning')).toBeTruthy();
    // The hint is also surfaced as accessibilityHint on the pressable.
    const pressable = screen.getByTestId('videoCenterAction:pressable');
    expect(pressable.props.accessibilityHint).toBe('Play from beginning');
  });

  test('phase=error: replay icon, "Retry loading the video" a11y label, "Try loading the video again" hint', async () => {
    await renderWithProviders(
      <VideoCenterAction phase="error" onPress={noop} />,
    );
    expect(screen.getByTestId('icon:replay')).toBeTruthy();
    expect(screen.getByLabelText('Retry loading the video')).toBeTruthy();
    expect(screen.getByText('Try loading the video again')).toBeTruthy();
    const pressable = screen.getByTestId('videoCenterAction:pressable');
    expect(pressable.props.accessibilityHint).toBe('Try loading the video again');
  });

  test('returns null when visible=false', async () => {
    await renderWithProviders(
      <VideoCenterAction phase="paused" visible={false} onPress={noop} />,
    );
    expect(screen.queryByTestId('videoCenterAction')).toBeNull();
    expect(screen.queryByTestId('icon:play')).toBeNull();
  });

  test('onPress fires the host callback', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <VideoCenterAction phase="paused" onPress={onPress} />,
    );
    fireEvent.press(screen.getByTestId('videoCenterAction:pressable'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('hint text caps at numberOfLines=2 (no wrap on narrow screens)', async () => {
    await renderWithProviders(
      <VideoCenterAction phase="error" onPress={noop} />,
    );
    const hint = screen.getByTestId('videoCenterAction:hint');
    expect(hint.props.numberOfLines).toBe(2);
  });
});
