// ─── Live TV — composition root ───────────────────────────────────────
//
// The screen is a COMPOSITION ROOT: it builds the browse config, asks the
// shared options hook for the filter state, wraps the content in the data
// provider and hands the whole thing to the shared browse shell.
//
// It used to hand-roll its own shell — its own `InternalHeader`, its own
// `SearchBar`, its own gold active-filter chips, its own `Fab` and its
// own `FilterSheet` — so navigating from Music to Live TV changed the
// page's furniture. Every other Discover catalogue is the shared shell
// (Music, Movies, Podcasts, Audiobooks, Radio), and Live TV is now one of
// them.
//
// THE CONFIG IS A FACTORY
// -----------------------
// Live TV's filter axis is the catalogue's OWN category list, and the
// catalogue is fetched at runtime, so the config is built from it
// (`related/browseConfig.ts`) instead of being a module-scope constant.
// It is MEMOISED, so the shell and `useSectionOptions` receive ONE stable
// object.
//
// THE DEEP LINK
// -------------
// `tv/:categoryId?` asks for a category. The categories are runtime data,
// so on a COLD start the option list is empty when the options are first
// read — and `useSectionOptions` seeds a filter group with a route param
// ONLY IF the param's value is one of the group's option keys. The config
// factory therefore puts the seed's own value in the option list up front
// (see `related/browseConfig.ts`), and the catalogue's own entry replaces
// it — with the source's NAME for it — as soon as the catalogue arrives.
//
// The scope's rules stay OFF
// --------------------------
// The shell's `autoClearFilterOnSearch` / `autoClearSearchOnFilter` rules
// exist to stop the user holding a filter that looks applied and is not.
// On this screen the filter IS applied: the IPTV source has NO per-scope
// endpoint at all — the whole directory is fetched once and the scope is
// applied IN MEMORY over the SAME rows by `filterIPTVChannels`, so a term
// and a category narrow to the intersection and both hold. Turning the
// rules on would throw away a filter that is really answering the list.

import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {LiveTVDataProvider} from './components/LiveTVDataProvider';
import {LiveTVContent} from './components/LiveTVContent';
import {useLiveTVCatalogue} from './hooks/useLiveTVCatalogue';
import {
  createLiveTVSectionConfig,
  normalizeCategoryId,
} from './related/browseConfig';
import type {RootStackScreenProps} from '../../navigation/types';
import type {SectionBrowseConfig} from './types';
import text from './related/textContent.json';

export const LiveTVScreen: React.FC<RootStackScreenProps<'LiveTVScreen'>> = ({
  route,
  navigation,
}) => {
  const routeParams = route.params ?? {};

  // The deep link's category, in the SOURCE's vocabulary (the source's
  // category ids are lower case — see `related/browseConfig.ts`).
  const seedCategoryId = normalizeCategoryId(routeParams.categoryId);

  // The params the shell and the options hook read. The category id is
  // normalised HERE, so the key the options hook seeds the filter with
  // and the id the scope filters by are the same string.
  const params = useMemo(
    () => ({...routeParams, categoryId: seedCategoryId ?? undefined}),
    [routeParams, seedCategoryId],
  );

  // The catalogue's categories — the filter axis's rows. This is the
  // SAME query the data provider reads (`useLiveTVCatalogue`), so the
  // 2.8 MB directory is fetched once and both sides read one cache entry.
  const {categories} = useLiveTVCatalogue();

  const config = useMemo<SectionBrowseConfig>(
    () => ({
      ...createLiveTVSectionConfig(categories, seedCategoryId ?? undefined),
      // The content renderer is bound here (by spread) to break the
      // config → content → screen → config cycle.
      renderContent: ctx => <LiveTVContent ctx={ctx} />,
    }),
    [categories, seedCategoryId],
  );

  const optionsApi = useSectionOptions(config, params);

  return (
    <LiveTVDataProvider>
      <View style={styles.root}>
        <BrowseLayout
          config={config}
          optionsApi={optionsApi}
          routeParams={params}
          // OFF on purpose — see the note above: this screen's scope is
          // applied IN MEMORY over one catalogue, so a category and a
          // search term really do narrow the list together.
          autoClearFilterOnSearch={false}
          autoClearSearchOnFilter={false}
          // The saved channels live on their own route, and this is its
          // entry point — in the HEADER's own trailing slot, which the
          // shared shell now passes through.
          headerRightAction={{
            icon: 'heartPulse',
            onPress: () => navigation.navigate('LiveTVFavoritesScreen'),
            accessibilityLabel: text.favorites.entryA11y,
          }}
        />
      </View>
    </LiveTVDataProvider>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
});

export {LiveTVFavoritesScreen} from './components/LiveTVFavoritesScreen';
