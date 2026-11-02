/**
 * `PlaylistCard` — the pin badge.
 *
 * ## What this pins
 *
 * A pinned playlist says so on its card. The badge is a STATE, not a
 * button: the card is a browsing surface, and a permanent pin button on
 * every card in a grid is noise (spec §4.3, D-P8) — the pin ACTION lives
 * in the playlist's menu.
 *
 * Four claims, and each of them can fail on its own:
 *
 *  1. A PINNED playlist shows the badge; an UNPINNED one shows NOTHING. A
 *     badge that lingers on an unpinned playlist is a lie in the other
 *     direction.
 *  2. The badge carries the FILLED pin — the glyph that means "this is the
 *     pinned state" — and the badge says it, not the card.
 *  3. The badge MIRRORS the kind badge: the same 22 px box on the OTHER
 *     side of the cover, so the two never overlap.
 *  4. The state is SPOKEN: the card's own label says ", pinned", because a
 *     glyph is not a label (spec §4.13).
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

import {ThemeProvider} from '../../../../src/theme';
import {PlaylistCard} from '../../../../src/components/playlist/PlaylistCard/PlaylistCard';
import type {Playlist} from '../../../../src/types/playlist';

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'pl_1',
    name: 'Road Trip',
    kind: 'AUDIO_ONLY',
    items: [],
    pinned: false,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  };
}

async function renderCard(playlist: Playlist) {
  return await render(
    <ThemeProvider>
      <PlaylistCard playlist={playlist} onPress={jest.fn()} />
    </ThemeProvider>,
  );
}

describe('PlaylistCard — the pin badge', () => {
  it('shows the pin badge on a pinned playlist', async () => {
    await renderCard(makePlaylist({pinned: true}));

    expect(screen.getByLabelText('Pinned')).toBeOnTheScreen();
    // The FILLED pin is the glyph that means "this is the pinned state".
    expect(screen.getByTestId('icon-pinFilled')).toBeOnTheScreen();
  });

  it('shows NOTHING on an unpinned playlist', async () => {
    await renderCard(makePlaylist({pinned: false}));

    expect(screen.queryByLabelText('Pinned')).toBeNull();
    expect(screen.queryByTestId('icon-pinFilled')).toBeNull();
    // The card itself still rendered — the badge is absent, not the card.
    expect(screen.getByText('Audio')).toBeOnTheScreen();
  });

  it('announces the pinned state in the card label', async () => {
    await renderCard(makePlaylist({name: 'Road Trip', pinned: true}));

    expect(screen.getByLabelText('Open playlist Road Trip, pinned')).toBeOnTheScreen();
  });

  it('does not claim an unpinned card is pinned', async () => {
    await renderCard(makePlaylist({name: 'Road Trip', pinned: false}));

    expect(screen.getByLabelText('Open playlist Road Trip')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Open playlist Road Trip, pinned')).toBeNull();
  });

  it('mirrors the kind badge on the other side of the cover', async () => {
    await renderCard(makePlaylist({pinned: true}));

    const pinBadge = screen.getByLabelText('Pinned');
    expect(pinBadge).toHaveStyle({
      position: 'absolute',
      top: 4,
      left: 4,
      width: 22,
      height: 22,
    });
    // The kind badge owns the RIGHT side; the pin badge must not land on
    // top of it.
    const kindBadge = screen.getByText('Audio').parent;
    expect(kindBadge).toHaveStyle({position: 'absolute', top: 4, right: 4});
    expect(pinBadge.props.style).not.toHaveProperty('right');
  });

  it('is a state, not a button — the card carries no pin control', async () => {
    await renderCard(makePlaylist({pinned: true}));

    const pinBadge = screen.getByLabelText('Pinned');
    expect(pinBadge.props.accessibilityRole).toBeUndefined();
    expect(pinBadge.props.onPress).toBeUndefined();
    // The browsing card offers no pin action of its own (D-P8): the pin
    // ACTION lives in the playlist's menu.
    expect(screen.queryByLabelText('Pin to top')).toBeNull();
    expect(screen.queryByLabelText('Unpin from top')).toBeNull();
  });
});

/**
 * The card draws its artwork through the ONE owner — `PlaylistCover` —
 * and the badge comes with it. The claims here are about WHERE the
 * badge sits and about what moves, not about the badge's existence
 * (the suite above owns that).
 */
describe('PlaylistCard — the cover owns the artwork', () => {
  it('draws the artwork through the ONE cover, and the badge sits over it', async () => {
    await renderCard(makePlaylist({pinned: true}));

    const cover = screen.getByTestId('playlist-cover');
    const pinBadge = screen.getByLabelText('Pinned');
    // The badge is INSIDE the cover, so it is over the ARTWORK and not
    // over the card around it (spec §4.2, §4.3).
    expect(cover).toContainElement(pinBadge);
    // The cover fills the card's 16:9 cover area.
    expect(cover).toHaveStyle({flex: 1});
  });

  it('animates the badge and NOTHING else', async () => {
    const durations: number[] = [];
    const spy = jest
      .spyOn(Animated, 'timing')
      .mockImplementation((value, config) => {
        durations.push(config.duration ?? -1);
        return {start: jest.fn(), stop: jest.fn(), reset: jest.fn()} as never;
      });

    try {
      await renderCard(makePlaylist({pinned: true}));

      // TWO timings — the badge's fade and its scale, both on
      // `motion.fast`. The kind badge is a LABEL: it never animates
      // (spec §4.12).
      expect(durations).toEqual([150, 150]);
    } finally {
      spy.mockRestore();
    }
  });

  it('animates nothing at all when the playlist is not pinned', async () => {
    const durations: number[] = [];
    const spy = jest
      .spyOn(Animated, 'timing')
      .mockImplementation((value, config) => {
        durations.push(config.duration ?? -1);
        return {start: jest.fn(), stop: jest.fn(), reset: jest.fn()} as never;
      });

    try {
      await renderCard(makePlaylist({pinned: false}));
      expect(durations).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });
});
