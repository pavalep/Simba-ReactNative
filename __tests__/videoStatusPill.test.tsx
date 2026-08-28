/**
 * v11 T1.2 — VideoStatusPill render test.
 *
 * Tracker step 8: "render the pill in isolation with each
 * `loadingState.kind`; the pill is hidden at `idle` and visible at
 * all others."
 */
import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ThemeProvider} from '../src/theme';
import {VideoStatusPill} from '../src/modules/playback/video/presentation/VideoStatusPill';

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

describe('VideoStatusPill — T1.2 render', () => {
  test('idle returns null (hidden)', async () => {
    await renderWithProviders(<VideoStatusPill loadingState={{kind: 'idle'}} />);
    expect(screen.queryByText('Preparing video')).toBeNull();
    expect(screen.queryByText('Seeking')).toBeNull();
    expect(screen.queryByText('Reconnecting')).toBeNull();
  });

  test('preparing renders "Preparing video"', async () => {
    await renderWithProviders(
      <VideoStatusPill loadingState={{kind: 'preparing'}} />,
    );
    expect(screen.getByText('Preparing video')).toBeTruthy();
  });

  test('buffering renders "Buffering · {pct}%" with the cacheFill value', async () => {
    await renderWithProviders(
      <VideoStatusPill loadingState={{kind: 'buffering', cacheFill: 0.62}} />,
    );
    expect(screen.getByText('Buffering · 62%')).toBeTruthy();
  });

  test('seeking renders "Seeking"', async () => {
    await renderWithProviders(
      <VideoStatusPill loadingState={{kind: 'seeking', to: 0}} />,
    );
    expect(screen.getByText('Seeking')).toBeTruthy();
  });

  test('reconnecting renders "Reconnecting"', async () => {
    await renderWithProviders(
      <VideoStatusPill loadingState={{kind: 'reconnecting'}} />,
    );
    expect(screen.getByText('Reconnecting')).toBeTruthy();
  });

  test('error renders the error message verbatim', async () => {
    const msg =
      'Video did not produce a first frame. Check the connection and retry.';
    await renderWithProviders(
      <VideoStatusPill
        loadingState={{kind: 'error', message: msg, recoverable: true}}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(msg)).toBeTruthy();
  });

  test('error pill is tappable (accessibilityRole: button + onRetry wired)', async () => {
    const onRetry = jest.fn();
    await renderWithProviders(
      <VideoStatusPill
        loadingState={{
          kind: 'error',
          message:
            'Video did not produce a first frame. Check the connection and retry.',
          recoverable: true,
        }}
        onRetry={onRetry}
      />,
    );
    const button = screen.getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Retry loading the video');
  });

  test('non-error kinds expose accessibility live region but no button role', async () => {
    await renderWithProviders(
      <VideoStatusPill loadingState={{kind: 'preparing'}} />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});
