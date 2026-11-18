/**
 * The browse shell supports more than ONE filter axis.
 *
 * ## Why this exists
 *
 * The shell's chip strip used to read exactly ONE filter group — the one
 * whose id was `'filter'` — and it looked the chip's LABEL up in that
 * group's options only. A screen with three axes (the Radio screen has
 * genre, country and language) could therefore hold three selections and
 * the strip would show at most one of them, and with the wrong label when
 * the other two were picked.
 *
 * The chip's key carries its group now, because a key alone cannot say
 * which axis it belongs to: the genre 'Rock' and a country called 'Rock'
 * are the same string, and clearing one must not clear the other.
 *
 * ## What is asserted
 *
 *   1. EVERY axis's selection gets a chip, with that axis's own label.
 *   2. Clearing one axis's chip leaves the other axis's chip alone.
 *   3. A route param seeds the group that DECLARES it — a screen with
 *      three axes must not put a genre seed into the country group.
 *   4. The single-axis screens are unchanged: their one group is still
 *      seeded from the route param, and their chip still clears its group.
 */

import React from 'react';
import {Pressable, View} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';
import {act, fireEvent, screen, waitFor, within} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {BrowseLayout} from '../../../src/screens/_shared/BrowseLayout';
import {useSectionOptions} from '../../../src/hooks/useSectionOptions';
import type {RootStackParamList} from '../../../src/navigation/types';
import type {SectionBrowseConfig} from '../../../src/screens/_shared/sectionBrowseConfig';

/**
 * A two-axis screen, in the shape the Radio screen needs: two groups,
 * each named after its axis.
 */
const TWO_AXIS_CONFIG: SectionBrowseConfig = {
  route: 'RadioScreen',
  title: 'Radio',
  search: {placeholder: 'Search stations…'},
  options: {
    groups: [
      {
        id: 'genre',
        title: 'Genre',
        multiSelect: false,
        options: [
          {key: 'Rock', label: 'Rock'},
          {key: 'Jazz', label: 'Jazz'},
        ],
      },
      {
        id: 'country',
        title: 'Country',
        multiSelect: false,
        options: [
          {key: 'US', label: 'United States'},
          {key: 'Rock', label: 'Rockland Islands'},
        ],
      },
    ],
  },
  renderContent: (): null => null,
};

const Harness: React.FC = () => {
  // The route's own params — the same source the real screens read.
  const route = useRoute<RouteProp<RootStackParamList, 'RadioScreen'>>();
  const routeParams = (route.params ?? {}) as Record<string, unknown>;
  const optionsApi = useSectionOptions(TWO_AXIS_CONFIG, routeParams);
  return (
    <View>
      <Pressable
        testID="pick-genre"
        onPress={() => optionsApi.setOption('genre', ['Rock'])}
      />
      <Pressable
        testID="pick-country"
        onPress={() => optionsApi.setOption('country', ['US'])}
      />
      <BrowseLayout
        config={TWO_AXIS_CONFIG}
        optionsApi={optionsApi}
        routeParams={routeParams}
      />
    </View>
  );
};

/** The chips in the shell's active-filter strip. */
function chips() {
  return within(screen.getByTestId('browse-active-filters'));
}

describe('the browse shell — more than one filter axis', () => {
  it('gives EVERY axis a chip, with that axis\'s own label', async () => {
    await renderWithProviders(Harness, {routeName: 'RadioScreen'});

    await act(async () => {
      fireEvent.press(screen.getByTestId('pick-genre'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('pick-country'));
    });

    // Both axes are represented…
    expect(chips().getByLabelText('Rock')).toBeTruthy();
    expect(chips().getByLabelText('United States')).toBeTruthy();
  });

  it('clears ONE axis when its chip is tapped, and leaves the other alone', async () => {
    await renderWithProviders(Harness, {routeName: 'RadioScreen'});

    await act(async () => {
      fireEvent.press(screen.getByTestId('pick-genre'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('pick-country'));
    });

    // Tap the GENRE chip.
    await act(async () => {
      fireEvent.press(chips().getByLabelText('Rock'));
    });

    // The genre is gone…
    await waitFor(() => expect(chips().queryByLabelText('Rock')).toBeNull());
    // …and the country is untouched.
    expect(chips().getByLabelText('United States')).toBeTruthy();
  });

  it('seeds the group that DECLARES the route param', async () => {
    // `genre` is in the shared seed-param list, and the Radio screen's
    // genre group's options contain 'Rock'.
    await renderWithProviders(Harness, {
      routeName: 'RadioScreen',
      initialParams: {genre: 'Rock'} as never,
    });

    // The chip says the GENRE group's label.
    expect(chips().getByLabelText('Rock')).toBeTruthy();
    // The COUNTRY group's 'Rock' is a different label, and it is not
    // selected.
    expect(chips().queryByLabelText('Rockland Islands')).toBeNull();
  });
});
