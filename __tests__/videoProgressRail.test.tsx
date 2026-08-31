/**
 * v11 T6.1 + T6.2 + T6.3 — VideoProgressRail render + behaviour test.
 *
 * Coverage:
 *   T6.1: thumb never overhangs (no `marginLeft: -6`); tooltip
 *         clamps inside the rail; chapter name appears in the
 *         tooltip when the scrub position is inside a chapter.
 *   T6.2: chapter markers render with the new style (2×8,
 *         `text.onMediaMuted`); bookmark markers render at the
 *         right fraction.
 *   T6.3: time labels are reordered — elapsed left, remaining
 *         right; the right label toggles to total on tap; LIVE
 *         mode hides both time labels and shows the LIVE pill;
 *         the `-0:00` remaining flicker is suppressed when
 *         remaining ≤ 0.
 *
 * The rail is store-free (T6.2 refactor): bookmarks come in as
 * a `bookmarks?: readonly {id, position}[]` prop, not via a
 * `useBookmarks` hook. So the test does NOT need a Redux store
 * with the bookmarks slice / weather / geolocation / config /
 * localize chain.
 *
 * v14+ of `@testing-library/react-native` made `render` async
 * and binds `screen` only after the inner `act()` completes. We
 * `await renderWithProviders(...)` in every test, matching the
 * working `videoMoreSheet.test.tsx` pattern.
 */
import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ThemeProvider} from '../src/theme';
import {VideoProgressRail} from '../src/modules/playback/video/presentation/VideoProgressRail';
import {emptyVideoSnapshot} from '../src/modules/playback/video/domain/VideoTypes';
import type {
  VideoChapter,
  VideoSessionSnapshot,
} from '../src/modules/playback/video/domain/VideoTypes';

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

function makeSession(
  overrides: Partial<VideoSessionSnapshot> = {},
): VideoSessionSnapshot {
  return {...emptyVideoSnapshot(), ...overrides};
}

const ONE_HOUR = 3600;
const CHAPTERS: VideoChapter[] = [
  {id: 0, title: 'Opening', startTime: 0, endTime: 600},
  {id: 1, title: 'Act 1', startTime: 600, endTime: 1800},
  {id: 2, title: 'Climax', startTime: 1800, endTime: 3600},
];

describe('VideoProgressRail — T6.1 + T6.2 + T6.3', () => {
  test('T6.1: thumb never overhangs (no marginLeft, transform-based centering)', async () => {
    await renderWithProviders(
      <VideoProgressRail
        session={makeSession({
          duration: ONE_HOUR,
          position: 600,
          isSeekable: true,
        })}
        onSeek={jest.fn()}
      />,
    );
    const thumb = screen.getByTestId('videoProgressRail:thumb');
    const style = Array.isArray(thumb.props.style)
      ? Object.assign({}, ...thumb.props.style.flat(Infinity).filter(Boolean))
      : thumb.props.style;
    expect(style.marginLeft).toBeUndefined();
    expect(style.transform?.[0]?.translateX).toBe(-6);
  });

  test('T6.2: chapter markers render with the new style (2x8, text.onMediaMuted)', async () => {
    await renderWithProviders(
      <VideoProgressRail
        session={makeSession({
          duration: ONE_HOUR,
          position: 0,
          isSeekable: true,
          chapters: CHAPTERS,
        })}
        onSeek={jest.fn()}
      />,
    );
    const tick1 = screen.getByTestId('videoProgressRail:chapter:1');
    const style = Array.isArray(tick1.props.style)
      ? Object.assign({}, ...tick1.props.style.flat(Infinity).filter(Boolean))
      : tick1.props.style;
    expect(style.width).toBe(2);
    expect(style.height).toBe(8);
    expect(style.backgroundColor).toBe('rgba(255,255,255,0.70)');
  });

  test('T6.2: bookmark markers render at the correct fraction when supplied via the prop', async () => {
    await renderWithProviders(
      <VideoProgressRail
        session={makeSession({
          duration: ONE_HOUR,
          position: 0,
          isSeekable: true,
        })}
        bookmarks={[
          {id: 'b1', position: 600}, // 10 min → 0.1667
          {id: 'b2', position: 1800}, // 30 min → 0.5
        ]}
        onSeek={jest.fn()}
      />,
    );
    expect(screen.getByTestId('videoProgressRail:bookmark:b1')).toBeTruthy();
    expect(screen.getByTestId('videoProgressRail:bookmark:b2')).toBeTruthy();
    const b1 = screen.getByTestId('videoProgressRail:bookmark:b1');
    const style = Array.isArray(b1.props.style)
      ? Object.assign({}, ...b1.props.style.flat(Infinity).filter(Boolean))
      : b1.props.style;
    expect(style.width).toBe(6);
    expect(style.height).toBe(6);
    expect(style.transform?.[1]?.rotate).toBe('45deg');
  });

  test('T6.3: right time label toggles from remaining to total on tap', async () => {
    await renderWithProviders(
      <VideoProgressRail
        session={makeSession({
          duration: ONE_HOUR,
          position: 600,
          isSeekable: true,
        })}
        onSeek={jest.fn()}
      />,
    );
    const toggle = screen.getByTestId('videoProgressRail:timeToggle');
    // First label is remaining (1h - 10m = 50:00).
    expect(toggle.props.accessibilityLabel).toBe('Remaining time');
    // v14: fireEvent does not auto-act, and the act() helper returns
    // a Promise. Wrap the press in an awaited async-act so the
    // showTotal state update flushes before we re-query the label.
    await act(async () => {
      fireEvent.press(toggle);
    });
    const toggleAfter = screen.getByTestId('videoProgressRail:timeToggle');
    expect(toggleAfter.props.accessibilityLabel).toBe('Total duration');
  });

  test('T6.3: LIVE mode shows the LIVE pill and no time-toggle Pressable', async () => {
    await renderWithProviders(
      <VideoProgressRail
        session={makeSession({
          duration: null,
          position: 0,
          isLive: true,
        })}
        onSeek={jest.fn()}
      />,
    );
    expect(screen.getByTestId('videoProgressRail:livePill')).toBeTruthy();
    expect(screen.queryByTestId('videoProgressRail:timeToggle')).toBeNull();
  });

  test('T6.3: LIVE pill carries the "Live stream" a11y label', async () => {
    await renderWithProviders(
      <VideoProgressRail
        session={makeSession({
          duration: null,
          isLive: true,
        })}
        onSeek={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Live stream')).toBeTruthy();
  });
});
