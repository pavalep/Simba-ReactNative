/**
 * The Cover Shelf — the Podcasts filter's category group.
 *
 * The sheet used to show the API's own 112-category taxonomy (the
 * device showed "Sexuality · Buddhism · Baseball · Golf" in a row of
 * chips) and had no "All" at all. The group is now a 4 × 3 grid of the
 * app's own cover plates: the curated genres, "All" first, the
 * corrected Podcast Index ids, and a gold ring on the selected tile.
 *
 * These assertions pin what the sheet renders and what it reports.
 */

import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';

import {ThemeProvider} from '../../../src/theme';
import {
  FilterSheet,
  type FilterSheetGroup,
} from '../../../src/components/sheets/FilterSheet/FilterSheet';
import {createPodcastsSectionConfig} from '../../../src/screens/PodcastsScreen/related/browseConfig';
import {PODCAST_CATEGORIES} from '../../../src/constants/podcastCategories';

const TILE = /^filter-cover-tile-(?!ring-)/;
const RING = /^filter-cover-tile-ring-/;

/** The group as the shared browse shell hands it to the sheet. */
function coverShelfGroup(): FilterSheetGroup {
  const group = createPodcastsSectionConfig(PODCAST_CATEGORIES).options!.groups[0];
  return {
    id: group.id,
    title: group.title,
    multiSelect: group.multiSelect ?? false,
    layout: group.layout,
    clearKey: group.clearKey,
    defaultKey: group.defaultKey,
    rows: group.options.map(o => ({
      key: o.key,
      label: o.label,
      icon: o.icon,
      image: o.image,
    })),
  };
}

async function renderShelf(value: Record<string, string[]> = {}) {
  const onChange = jest.fn();
  await render(
    <ThemeProvider>
      <FilterSheet
        visible
        onClose={jest.fn()}
        groups={[coverShelfGroup()]}
        value={value}
        onChange={onChange}
      />
    </ThemeProvider>,
  );
  return {onChange};
}

describe('Cover Shelf — the Podcasts category group', () => {
  it('shows the twelve curated tiles', async () => {
    await renderShelf();

    expect(screen.getAllByTestId(TILE)).toHaveLength(12);
  });

  it('puts "All" first — the user can always get back to the whole catalogue', async () => {
    await renderShelf();

    expect(screen.getAllByTestId(TILE).map(t => t.props.testID)).toEqual([
      'filter-cover-tile-all',
      'filter-cover-tile-1',
      'filter-cover-tile-53',
      'filter-cover-tile-9',
      'filter-cover-tile-16',
      'filter-cover-tile-20',
      'filter-cover-tile-29',
      'filter-cover-tile-102',
      'filter-cover-tile-28',
      'filter-cover-tile-55',
      'filter-cover-tile-67',
      'filter-cover-tile-86',
    ]);
  });

  it('labels every tile with its genre', async () => {
    await renderShelf();

    for (const name of [
      'All',
      'Arts',
      'Music',
      'Business',
      'Comedy',
      'Education',
      'Health',
      'Technology',
      'History',
      'News',
      'Science',
      'Sports',
    ]) {
      expect(screen.getByLabelText(name)).toBeOnTheScreen();
    }
  });

  it('never offers the API’s raw taxonomy', async () => {
    await renderShelf();

    expect(screen.queryByLabelText('Sexuality')).toBeNull();
    expect(screen.queryByLabelText('Buddhism')).toBeNull();
    expect(screen.queryByLabelText('Baseball')).toBeNull();
    expect(screen.queryByLabelText('TV & Film')).toBeNull();
  });

  it('rings "All" when no category is chosen', async () => {
    await renderShelf();

    expect(screen.getByTestId('filter-cover-tile-ring-all')).toBeOnTheScreen();
    expect(screen.queryByTestId(RING)).toBeTruthy();
    expect(screen.queryAllByTestId(RING)).toHaveLength(1);
  });

  it('rings the chosen tile instead', async () => {
    await renderShelf({filter: ['53']});

    expect(screen.getByTestId('filter-cover-tile-ring-53')).toBeOnTheScreen();
    expect(screen.queryByTestId('filter-cover-tile-ring-all')).toBeNull();
    expect(screen.queryAllByTestId(RING)).toHaveLength(1);
  });

  it('reports the genre’s real Podcast Index id when a tile is tapped', async () => {
    const {onChange} = await renderShelf();

    fireEvent.press(screen.getByLabelText('Comedy'));

    expect(onChange).toHaveBeenCalledWith('filter', ['16']);
  });

  it('clears the group when "All" is tapped', async () => {
    const {onChange} = await renderShelf({filter: ['53']});

    fireEvent.press(screen.getByLabelText('All'));

    expect(onChange).toHaveBeenCalledWith('filter', []);
  });
});
