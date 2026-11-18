// ─── Radio — composition root ────────────────────────────────────────
//
// The screen is a COMPOSITION ROOT: it builds the browse config, asks
// the shared options hook for the filter state, wraps the content in the
// data provider and hands the whole thing to the shared browse shell.
//
// It used to hand-roll its own shell — its own `InternalHeader`, its own
// `SearchBar`, its own gold active-filter chips, its own `Fab` and its
// own `FilterSheet` — so navigating from Music to Radio changed the
// page's furniture. Every other Discover catalogue is the shared shell
// (Music, Movies, Podcasts, Audiobooks), and Radio is now one of them.
//
// THE CONFIG IS A FACTORY
// -----------------------
// Radio's three filter axes are the radio-browser API's own tag lists,
// fetched at runtime, so the config is built from them
// (`related/browseConfig.ts`) instead of being a module-scope constant.
// It is MEMOISED, so the shell and `useSectionOptions` receive ONE
// stable object.

import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {RadioDataProvider} from './components/RadioDataProvider';
import {RadioContent} from './components/RadioContent';
import {useRadioTags} from './hooks/useRadioTags';
import {createRadioSectionConfig} from './related/browseConfig';
import type {RootStackScreenProps} from '../../navigation/types';
import type {SectionBrowseConfig} from './types';
import text from './related/textContent.json';

export const RadioScreen: React.FC<RootStackScreenProps<'RadioScreen'>> = ({
  route,
  navigation,
}) => {
  const params = route.params ?? {};
  // The genre a deep link asked for (`radio?initialTag=pop`). It is kept
  // in the genre group so the shared options hook can seed it — see
  // `related/browseConfig.ts`.
  const seedGenre = params.initialTag;
  const catalog = useRadioTags();

  const config = useMemo<SectionBrowseConfig>(
    () => ({
      ...createRadioSectionConfig(catalog, seedGenre),
      // The content renderer is bound here (by spread) to break the
      // config → content → screen → config cycle.
      renderContent: ctx => <RadioContent ctx={ctx} />,
    }),
    [catalog, seedGenre],
  );

  const optionsApi = useSectionOptions(config, params);

  return (
    <RadioDataProvider>
      <View style={styles.root}>
        <BrowseLayout
          config={config}
          optionsApi={optionsApi}
          routeParams={params}
          // The saved stations live on their own route, and this is its
          // entry point — in the HEADER's own trailing slot, which the
          // shared shell now passes through.
          headerRightAction={{
            icon: 'heartPulse',
            onPress: () => navigation.navigate('RadioFavoritesScreen'),
            accessibilityLabel: text.favorites.accessibilityLabel,
          }}
        />
      </View>
    </RadioDataProvider>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
});

export {RadioFavoritesScreen} from './components/RadioFavoritesScreen';
export type {SectionBrowseConfig};
