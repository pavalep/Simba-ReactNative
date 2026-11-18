/**
 * The Music screen's own rules.
 *
 * Three of them were broken, and all three were invisible to a reader:
 *
 * 1. The pagination never terminated. The comment described a short-page
 *    guard that was NOT in the code — `lastPage` was bound to `_lastPage`
 *    and never read, so `hasNextPage` was permanently `true`. The filter
 *    button therefore never got out of the way at the end of the list,
 *    and every scroll to the end fetched another page.
 *
 * 2. The row's artwork was a hole while it loaded: a glyph at
 *    `opacity: 0.4` over the background, which measured at about 6 %
 *    gold — the same hole the Podcasts wave closed on the podcast row.
 *
 * 3. The duration formatter could print `3:60`, because it ROUNDED the
 *    seconds while the detail screen's own formatter floored them, and
 *    the two disagreed on the empty case too.
 */

import React from 'react';
import {screen, act, render} from '@testing-library/react-native';

import {ThemeProvider} from '../../../src/theme';
import {ToastProvider} from '../../../src/components/feedback/Toast';
import {TrackCard, formatDuration} from '../../../src/screens/MusicScreen/components/TrackCard';
import {nextMusicPage} from '../../../src/screens/MusicScreen/hooks/useMusicScreen';
import type {JamendoTrackResult} from '../../../src/types/api';

const ARTWORK = 'https://example.test/cover.jpg';

const TRACK: JamendoTrackResult = {
  id: 1,
  name: 'Night Drive',
  artistName: 'A Band',
  albumName: 'An Album',
  duration: 180,
  audioUrl: 'https://example.test/a.mp3',
  imageUrl: ARTWORK,
};

describe('Music — the end-of-stream rule', () => {
  it('a FULL page means there may be another one', () => {
    expect(nextMusicPage(20, 1)).toBe(2);
    expect(nextMusicPage(20, 7)).toBe(8);
  });

  it('a SHORT page is the last page', () => {
    // The rule the comment described and the code did not have.
    expect(nextMusicPage(19, 1)).toBeUndefined();
    expect(nextMusicPage(0, 3)).toBeUndefined();
  });

  it('a page number that is not a number ends the stream', () => {
    expect(nextMusicPage(20, undefined)).toBeUndefined();
    expect(nextMusicPage(20, 'x')).toBeUndefined();
  });
});

describe('Music — the duration', () => {
  it('floors the seconds, so it can never print 3:60', () => {
    // 179.7 s: floor → 2:59, round → 2:60.
    expect(formatDuration(179.7)).toBe('2:59');
    expect(formatDuration(180)).toBe('3:00');
    expect(formatDuration(59.9)).toBe('0:59');
  });

  it('has ONE empty value', () => {
    expect(formatDuration(0)).toBe('--:--');
    expect(formatDuration(-5)).toBe('--:--');
  });
});

describe('Music — the row', () => {
  async function renderRow(item: JamendoTrackResult = TRACK) {
    await render(
      <ThemeProvider>
        {/* The row owns the long-press menu, and the menu's queue
            actions go through `useQueueActions`, which needs the
            toast provider. */}
        <ToastProvider>
          <TrackCard item={item} onPress={jest.fn()} />
        </ToastProvider>
      </ThemeProvider>,
    );
  }

  it('shows its tile while the artwork is still arriving', async () => {
    await renderRow();

    // The artwork HAS a URL, so before the fix the row drew a bare
    // `Image` and the tile was never rendered: an invisible hole.
    expect(screen.getByTestId('music-artwork-image')).toBeOnTheScreen();
    expect(screen.getByTestId('music-artwork-placeholder')).toBeOnTheScreen();
  });

  it('keeps its tile when the artwork fails to load', async () => {
    await renderRow();

    const artwork = screen.getByTestId('music-artwork-image');
    await act(async () => {
      (artwork.props.onError as () => void)();
    });

    expect(screen.getByTestId('music-artwork-placeholder')).toBeOnTheScreen();
  });

  it('a track with no artwork shows its tile and mounts no image', async () => {
    await renderRow({...TRACK, imageUrl: ''});

    expect(screen.getByTestId('music-artwork-placeholder')).toBeOnTheScreen();
    expect(screen.queryByTestId('music-artwork-image')).toBeNull();
  });

  it('does not render an empty artist line', async () => {
    await renderRow({...TRACK, artistName: ''});

    // The wire can carry no artist (`artist_name ?? ''`), and the row
    // used to render the empty line anyway.
    expect(screen.queryByText('')).toBeNull();
    expect(screen.getByText('Night Drive')).toBeOnTheScreen();
  });
});
