/**
 * `PlaylistCover` — the ONE owner of a playlist's artwork.
 *
 * ## What this pins
 *
 * A playlist's artwork was drawn TWICE, by two different pieces of code:
 * `PlaylistCard` drew a 2 × 2 collage, and `AllPlaylistsScreen` drew a
 * generic `listMusic` icon box for the SAME playlist. Two renderings of
 * one object is two chances to drift — and it is why the management page
 * and the Library show the same playlist as two different things.
 *
 * The claims, and each of them can fail on its own:
 *
 *  1. The collage draws the playlist's FIRST FOUR items, 2 × 2 — and a
 *     playlist with a single item gets ONE large cell.
 *  2. An empty playlist draws the `listMusic` glyph on `accent.goldSoft`.
 *  3. The artwork is CATALOGUE artwork. A `PlaylistItem` carries
 *     `thumbnailPath` and NO `resumeThumbnailPath`: a playlist item is a
 *     thing you put in a list, not a position you were at, so the
 *     captured frame belongs to the bookmark and the history entry.
 *  4. The pin badge belongs to the COVER, so it is over the artwork on
 *     EVERY surface a playlist is drawn (spec §4.3).
 *  5. The badge is a STATE, not a button — and it is decorative.
 *  6. The badge fades and scales in on `motion.fast` (150 ms) — and
 *     nothing else in the cover animates (spec §4.12).
 *
 * ## The SvgIcon seam
 *
 * The global `\.svg$` jest mapper renders every asset as the SAME
 * anonymous placeholder, so under it the filled pin and the outline pin
 * are indistinguishable and the glyph assertions would pass vacuously.
 * The real module path is mocked instead, with a stand-in that keeps the
 * NAME — so what these tests read is the component's real decision.
 */

import React from 'react';
import {Animated} from 'react-native';
import {render, screen} from '@testing-library/react-native';

jest.mock('../../../../src/components/utility/SvgIcon', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  const {View} = jest.requireActual('react-native') as typeof import('react-native');
  return {
    SvgIcon: ({
      name,
      size,
      color,
    }: {
      name: string;
      size?: number;
      color?: string;
    }) =>
      ReactActual.createElement(View, {
        testID: `icon-${name}`,
        style: {width: size, height: size},
        // `color` is not a `View` prop. It is carried anyway, because it
        // is what the real `SvgIcon` hands to the SVG.
        color,
      } as never),
  };
});

import {ThemeProvider, useTheme} from '../../../../src/theme';
import {PlaylistCover, PLAYLIST_PIN_BADGE_TEST_ID} from '../../../../src/components/playlist/PlaylistCover';
import {motion} from '../../../../src/theme/tokens';
import type {Playlist, PlaylistItem} from '../../../../src/types/playlist';

/** The theme the cover was rendered with — read, never written down twice. */
let themeColors: ReturnType<typeof useTheme>['colors'] | null = null;

function ThemeProbe() {
  themeColors = useTheme().colors;
  return null;
}

function makeItem(over: Partial<PlaylistItem> = {}): PlaylistItem {
  return {
    id: 'item-1',
    fileUri: 'file:///media/song.mp3',
    title: 'Song',
    duration: 120,
    addedAt: '2026-10-01T10:00:00.000Z',
    source: 'local',
    type: 'music',
    mediaType: 'audio',
    ...over,
  };
}

function makePlaylist(over: Partial<Playlist> = {}): Playlist {
  return {
    id: 'pl_1',
    name: 'Road Trip',
    kind: 'AUDIO_ONLY',
    items: [],
    pinned: false,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...over,
  };
}

async function renderCover(playlist: Playlist) {
  return await render(
    <ThemeProvider>
      <ThemeProbe />
      <PlaylistCover playlist={playlist} />
    </ThemeProvider>,
  );
}

describe('PlaylistCover — the artwork', () => {
  it('draws ONE large cell for a playlist with a single item', async () => {
    await renderCover(makePlaylist({items: [makeItem({thumbnailPath: 'file:///a.jpg'})]}));

    const cells = screen.getAllByTestId('playlist-cover-cell');
    expect(cells).toHaveLength(1);
    expect(cells[0]).toHaveStyle({width: '100%', height: '100%'});
  });

  it('draws a 2 × 2 collage for a playlist with four items', async () => {
    await renderCover(
      makePlaylist({
        items: [
          makeItem({id: 'a', thumbnailPath: 'file:///a.jpg'}),
          makeItem({id: 'b', thumbnailPath: 'file:///b.jpg'}),
          makeItem({id: 'c', thumbnailPath: 'file:///c.jpg'}),
          makeItem({id: 'd', thumbnailPath: 'file:///d.jpg'}),
        ],
      }),
    );

    const cells = screen.getAllByTestId('playlist-cover-cell');
    expect(cells).toHaveLength(4);
    for (const cell of cells) {
      expect(cell).toHaveStyle({width: '50%', height: '50%'});
    }
  });

  it('draws only the FIRST FOUR items', async () => {
    await renderCover(
      makePlaylist({
        items: [
          makeItem({id: 'a', thumbnailPath: 'file:///a.jpg'}),
          makeItem({id: 'b', thumbnailPath: 'file:///b.jpg'}),
          makeItem({id: 'c', thumbnailPath: 'file:///c.jpg'}),
          makeItem({id: 'd', thumbnailPath: 'file:///d.jpg'}),
          makeItem({id: 'e', thumbnailPath: 'file:///e.jpg'}),
        ],
      }),
    );

    expect(screen.getAllByTestId('playlist-cover-cell')).toHaveLength(4);
    const drawn = screen
      .getAllByTestId('playlist-cover-art')
      .map(image => (image.props.source as {uri: string}).uri);
    expect(drawn).toEqual(['file:///a.jpg', 'file:///b.jpg', 'file:///c.jpg', 'file:///d.jpg']);
    expect(drawn).not.toContain('file:///e.jpg');
  });

  it('draws the listMusic glyph on goldSoft for an empty playlist', async () => {
    await renderCover(makePlaylist({items: []}));

    expect(themeColors).not.toBeNull();
    expect(screen.queryAllByTestId('playlist-cover-cell')).toHaveLength(0);
    expect(screen.getByTestId('icon-listMusic')).toBeOnTheScreen();
    // The empty cover is the gold wash — an empty playlist still says
    // "this is a playlist", in the app's own accent.
    expect(screen.getByTestId('playlist-cover-empty')).toHaveStyle({
      backgroundColor: themeColors?.accent.goldSoft,
    });
  });

  it('draws CATALOGUE artwork only — never a resume frame', async () => {
    // A playlist item carries `thumbnailPath` and NOTHING else: the
    // captured frame belongs to the bookmark and the history entry.
    // The extra field here is deliberate — the cover must not reach for
    // it even when something puts one on the item.
    const itemWithAResumeFrame = {
      ...makeItem({id: 'a', thumbnailPath: 'file:///poster.jpg'}),
      resumeThumbnailPath: 'file:///frame-at-300s.jpg',
    } as PlaylistItem;

    await renderCover(makePlaylist({items: [itemWithAResumeFrame]}));

    const drawn = screen
      .getAllByTestId('playlist-cover-art')
      .map(image => (image.props.source as {uri: string}).uri);
    expect(drawn).toEqual(['file:///poster.jpg']);
    expect(drawn).not.toContain('file:///frame-at-300s.jpg');
  });
});

describe('PlaylistCover — the pin badge', () => {
  it('shows the badge on a pinned playlist, and NOTHING on an unpinned one', async () => {
    const {unmount} = await renderCover(makePlaylist({pinned: true}));
    expect(screen.getByTestId(PLAYLIST_PIN_BADGE_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByTestId('icon-pinFilled')).toBeOnTheScreen();
    await unmount();

    await renderCover(makePlaylist({pinned: false}));
    expect(screen.queryByTestId(PLAYLIST_PIN_BADGE_TEST_ID)).toBeNull();
    expect(screen.queryByTestId('icon-pinFilled')).toBeNull();
  });

  it('puts the badge over the COVER — the same box on every surface', async () => {
    await renderCover(makePlaylist({pinned: true}));

    const cover = screen.getByTestId('playlist-cover');
    const badge = screen.getByTestId(PLAYLIST_PIN_BADGE_TEST_ID);
    // The badge is INSIDE the cover, not beside it: the cover is the
    // containing block, so the badge sits over the artwork.
    expect(cover).toContainElement(badge);
    expect(badge).toHaveStyle({
      position: 'absolute',
      top: 4,
      left: 4,
      width: 22,
      height: 22,
    });
  });

  it('is a state, not a button — and it is decorative', async () => {
    await renderCover(makePlaylist({pinned: true}));

    const badge = screen.getByTestId(PLAYLIST_PIN_BADGE_TEST_ID);
    expect(badge.props.accessibilityRole).toBeUndefined();
    expect(badge.props.onPress).toBeUndefined();
    // Decorative: the badge is not an accessibility element, so a
    // screen reader never announces the glyph on its own. The SURFACE
    // says ", pinned" in its own label instead (spec §4.13).
    expect(badge.props.accessible).toBe(false);
    expect(badge.props.importantForAccessibility).toBe('no');
  });
});

describe('PlaylistCover — the motion', () => {
  it('fades and scales the badge in on motion.fast, and animates NOTHING else', async () => {
    const durations: number[] = [];
    const spy = jest
      .spyOn(Animated, 'timing')
      .mockImplementation((value, config) => {
        durations.push(config.duration ?? -1);
        // Return the shape `Animated.parallel` consumes, without
        // driving a real animation under jest.
        return {start: jest.fn(), stop: jest.fn(), reset: jest.fn()} as never;
      });

    try {
      await renderCover(makePlaylist({pinned: true}));

      // TWO timings: the fade and the scale. The kind badge is a LABEL
      // and never animates, and nothing else in the cover moves.
      expect(durations).toEqual([motion.duration.fast, motion.duration.fast]);
      expect(motion.duration.fast).toBe(150);
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({duration: 150, useNativeDriver: true}),
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('animates NOTHING at all for an unpinned playlist', async () => {
    const durations: number[] = [];
    const spy = jest
      .spyOn(Animated, 'timing')
      .mockImplementation((value, config) => {
        durations.push(config.duration ?? -1);
        return {start: jest.fn(), stop: jest.fn(), reset: jest.fn()} as never;
      });

    try {
      await renderCover(makePlaylist({pinned: false}));
      expect(durations).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });
});
