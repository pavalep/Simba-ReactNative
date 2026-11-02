/**
 * `LibraryPlaylistsSegment` — the Library's playlist list.
 *
 * ## What this pins
 *
 *  1. The segment still renders after the dead `colors` prop was
 *     deleted — one card per playlist, and the handlers still arrive.
 *  2. A PINNED playlist's card carries the pin badge. The badge is on
 *     the Library card and not only on Home (spec §4.3) — the card
 *     draws its artwork through `PlaylistCover`, and the badge comes
 *     with the cover.
 *  3. The segment IGNORES a `colors` prop: the one it used to take was
 *     never read, and a prop nobody reads is a second, lying copy of
 *     the theme (rule 7). The prop is gone from the TYPE as well —
 *     that half is pinned at COMPILE time, below.
 *
 * The type-level pin: if `colors` ever comes back to the props,
 * `SegmentTakesColors` becomes `true` and this line no longer
 * compiles — so `tsc --noEmit` fails before a single test runs.
 */

import React from 'react';
import {render, screen} from '@testing-library/react-native';

import {ThemeProvider} from '../../../src/theme';
import {LibraryPlaylistsSegment} from '../../../src/features/library/presentation/components/LibraryPlaylistsSegment';
import type {Playlist} from '../../../src/types/playlist';

type SegmentProps = React.ComponentProps<typeof LibraryPlaylistsSegment>;
type SegmentTakesColors = 'colors' extends keyof SegmentProps ? true : false;
// COMPILE-TIME pin: `false` is only assignable while the segment has no
// `colors` prop.
const segmentTakesNoColors: SegmentTakesColors = false;

function makePlaylist(over: Partial<Playlist> = {}): Playlist {
  return {
    id: 'pl_1',
    name: 'Road Trip',
    kind: 'AUDIO_ONLY',
    items: [],
    pinned: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...over,
  };
}

async function renderSegment(
  playlists: Playlist[],
  handlers: Record<string, unknown> = {},
) {
  return await render(
    <ThemeProvider>
      <LibraryPlaylistsSegment
        playlists={playlists}
        onPlaylistCardPress={jest.fn()}
        onPlayAllPlaylist={jest.fn()}
        onShufflePlaylist={jest.fn()}
        {...(handlers as unknown as Partial<SegmentProps>)}
      />
    </ThemeProvider>,
  );
}

describe('LibraryPlaylistsSegment', () => {
  it('renders a card per playlist', async () => {
    await renderSegment([
      makePlaylist({id: 'a', name: 'Road Trip'}),
      makePlaylist({id: 'b', name: 'Late Night'}),
    ]);

    expect(screen.getByText('Road Trip')).toBeOnTheScreen();
    expect(screen.getByText('Late Night')).toBeOnTheScreen();
    expect(screen.getAllByTestId('playlist-cover')).toHaveLength(2);
  });

  it('shows the pin badge on a pinned playlist\'s card', async () => {
    await renderSegment([makePlaylist({name: 'Road Trip', pinned: true})]);

    expect(screen.getByLabelText('Open playlist Road Trip, pinned')).toBeOnTheScreen();
    expect(screen.getByLabelText('Pinned')).toBeOnTheScreen();
  });

  it('ignores a `colors` prop — the dead one is gone', async () => {
    await renderSegment([makePlaylist({name: 'Road Trip'})]);

    // The prop is not in the TYPE any more, so it is handed over
    // through a cast: if anything in the segment ever READS it, the
    // colour lands in the rendered tree.
    const themed = await renderSegment([makePlaylist({name: 'Road Trip'})], {
      colors: {background: {primary: 'rebeccapurple'}} as never,
    });

    expect(JSON.stringify(themed.toJSON())).not.toContain('rebeccapurple');
    expect(segmentTakesNoColors).toBe(false);
  });
});
