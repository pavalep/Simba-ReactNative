/**
 * v11 T9.2 — Resume prompt.
 *
 * Coverage:
 *   T9.2: VideoResumePrompt renders the title + subtitle +
 *         two buttons (Resume, Start over); the subtitle is
 *         formatted with the saved position.
 *   T9.2: VideoResumePrompt taps fire onResume and
 *         onStartOver.
 *   T9.2: trigger conditions (pure logic \u2014 exercised via
 *         the host's useMemo, but mirrored here as a pure
 *         helper-equivalent for clarity):
 *         - explicit startPosition => no prompt
 *         - saved position < 30 s => no prompt
 *         - saved position > duration - 60 => no prompt
 *         - live source => no prompt
 *         - happy path => prompt is eligible
 */
import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ThemeProvider} from '../src/theme';
import {VideoResumePrompt} from '../src/modules/playback/video/presentation/VideoResumePrompt';

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

describe('VideoResumePrompt \u2014 T9.2', () => {
  test('renders the title + subtitle with the formatted saved position', async () => {
    await renderWithProviders(
      <VideoResumePrompt
        savedPosition={300}
        onResume={noop}
        onStartOver={noop}
      />,
    );
    expect(screen.getByText('Resume playback?')).toBeTruthy();
    // 5:00 = 300 s
    expect(screen.getByText('Continue from 5:00')).toBeTruthy();
    expect(screen.getByLabelText('Resume')).toBeTruthy();
    expect(screen.getByLabelText('Start over')).toBeTruthy();
  });

  test('formats long durations as H:MM:SS', async () => {
    await renderWithProviders(
      <VideoResumePrompt
        savedPosition={3700}
        onResume={noop}
        onStartOver={noop}
      />,
    );
    // 3700 s = 1:01:40
    expect(screen.getByText('Continue from 1:01:40')).toBeTruthy();
  });

  test('Resume button fires onResume', async () => {
    const onResume = jest.fn();
    await renderWithProviders(
      <VideoResumePrompt
        savedPosition={300}
        onResume={onResume}
        onStartOver={noop}
      />,
    );
    fireEvent.press(screen.getByTestId('videoResumePrompt:resume'));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  test('Start over button fires onStartOver', async () => {
    const onStartOver = jest.fn();
    await renderWithProviders(
      <VideoResumePrompt
        savedPosition={300}
        onResume={noop}
        onStartOver={onStartOver}
      />,
    );
    fireEvent.press(screen.getByTestId('videoResumePrompt:startOver'));
    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});

describe('T9.2 trigger logic \u2014 mirror of host useMemo', () => {
  // The actual logic lives in VideoHost's useMemo. We mirror
  // it here as a pure function so the trigger conditions are
  // testable without a full host render. The host integration
  // test (load at 0, paused) is a device QA task.
  function isEligible(opts: {
    explicitStartPosition: number | undefined;
    bookmarkPosition: number | undefined;
    duration: number | null;
    isLive: boolean;
  }): boolean {
    return (
      // Mirror of the host: explicit undefined (i.e. no deep-
      // link) is required; explicit 0 also bypasses the prompt.
      opts.explicitStartPosition === undefined &&
      opts.bookmarkPosition !== undefined &&
      opts.bookmarkPosition > 30 &&
      opts.duration !== null &&
      opts.duration > 0 &&
      opts.bookmarkPosition < opts.duration - 60 &&
      !opts.isLive
    );
  }

  test('explicit startPosition bypasses the prompt (deep-link / queue resume)', () => {
    expect(
      isEligible({
        explicitStartPosition: 0,
        bookmarkPosition: 300,
        duration: 1800,
        isLive: false,
      }),
    ).toBe(false);
    expect(
      isEligible({
        explicitStartPosition: 120,
        bookmarkPosition: 300,
        duration: 1800,
        isLive: false,
      }),
    ).toBe(false);
  });

  test('saved position < 30 s does not trigger (too early to remember)', () => {
    expect(
      isEligible({
        explicitStartPosition: undefined,
        bookmarkPosition: 29,
        duration: 1800,
        isLive: false,
      }),
    ).toBe(false);
    expect(
      isEligible({
        explicitStartPosition: undefined,
        bookmarkPosition: 30,
        duration: 1800,
        isLive: false,
      }),
    ).toBe(false);
    // 30.1 s is the threshold crossing.
    expect(
      isEligible({
        explicitStartPosition: undefined,
        bookmarkPosition: 30.1,
        duration: 1800,
        isLive: false,
      }),
    ).toBe(true);
  });

  test('saved position > duration - 60 s does not trigger (too close to end)', () => {
    expect(
      isEligible({
        explicitStartPosition: undefined,
        bookmarkPosition: 1750, // 50 s before end
        duration: 1800,
        isLive: false,
      }),
    ).toBe(false);
    expect(
      isEligible({
        explicitStartPosition: undefined,
        bookmarkPosition: 1739, // 61 s before end
        duration: 1800,
        isLive: false,
      }),
    ).toBe(true);
  });

  test('live sources never trigger', () => {
    expect(
      isEligible({
        explicitStartPosition: undefined,
        bookmarkPosition: 300,
        duration: 1800,
        isLive: true,
      }),
    ).toBe(false);
  });

  test('no bookmark => no prompt', () => {
    expect(
      isEligible({
        explicitStartPosition: undefined,
        bookmarkPosition: undefined,
        duration: 1800,
        isLive: false,
      }),
    ).toBe(false);
  });

  test('null duration => no prompt (waiting for the session to learn the length)', () => {
    expect(
      isEligible({
        explicitStartPosition: undefined,
        bookmarkPosition: 300,
        duration: null,
        isLive: false,
      }),
    ).toBe(false);
  });

  test('happy path: all conditions met => prompt is eligible', () => {
    expect(
      isEligible({
        explicitStartPosition: undefined,
        bookmarkPosition: 300, // 5 min in
        duration: 1800, // 30 min total
        isLive: false,
      }),
    ).toBe(true);
  });
});
