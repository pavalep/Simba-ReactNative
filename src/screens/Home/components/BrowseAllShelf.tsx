// ─── Browse All Shelf ────────────────────────────────────────────────────
//
// v10.2: Home "Discover" collapses the catalog category rails into ONE
// horizontal shelf and keeps Local Files visible alongside the API-backed
// areas so the user's linked media is discoverable from the same surface.
//
// V2: ONE CARD GRAMMAR, AND ONE OWNER FOR THE COPY.
//
// The card is the app's own `CategoryCard`: the poster WHOLE, the name and
// the description UNDERNEATH it. V1 laid the type over the poster on a
// scrim and the description was one long line that ran past the card and
// was cut off by the next card.
//
// The rail sits on the page's ONE gutter (16 dp), and its cards are on the
// page's ONE pitch (160 dp + a 12 dp gap) — the same pitch every other
// rail on the page uses, so the page scrolls as one column.
//
// THE DESCRIPTIONS HAVE ONE OWNER.
//
// The nine two-line descriptions live in
// `../related/categoryDescriptions.json`, because the Penpot board draws
// the same nine cards with the same words. Two copies of the copy is how
// a design and an app drift apart: the JSON is the single file both read.

import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {CategoryCard} from '../../../components/utility/CategoryCard/CategoryCard';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {spacing} from '../../../theme/tokens';
import {CATEGORY_COVERS} from '../../../assets/images/categories';
import {RAIL_CARD_PITCH} from '../../../components/media/railMetrics';
import categoryDescriptions from '../related/categoryDescriptions.json';

import type {SectionRouteKey} from './browseAllRouteKey';

/**
 * The name of a catalogue section — and the key its description lives
 * under.
 *
 * Typing it as a key of the JSON means the compiler refuses a card whose
 * description nobody wrote, which is the whole point of having ONE owner.
 */
export type CategoryName = keyof typeof categoryDescriptions;

export interface BrowseAllEntry {
  route: SectionRouteKey;
  name: CategoryName;
  icon: string;
  image?: ReturnType<typeof require>;
}

/** Canonical order of the top-level sections in the Discover rail. */
export const BROWSE_ALL_SECTIONS: BrowseAllEntry[] = [
  {
    route: 'MoviesScreen',
    name: 'Movies',
    icon: 'clapperboard',
    image: CATEGORY_COVERS.movies.all,
  },
  {
    route: 'PodcastsScreen',
    name: 'Podcasts',
    icon: 'podcastRings',
    image: CATEGORY_COVERS.podcasts.all,
  },
  {
    route: 'MusicScreen',
    name: 'Music',
    icon: 'disc3',
    image: CATEGORY_COVERS.music.all,
  },
  {
    route: 'RadioScreen',
    name: 'Radio',
    icon: 'radioTower',
    image: CATEGORY_COVERS.radio.all,
  },
  {
    route: 'LiveTVScreen',
    name: 'Live TV',
    icon: 'tv',
    image: CATEGORY_COVERS.liveTv.all,
  },
  {
    route: 'AudiobooksScreen',
    name: 'Audiobooks',
    icon: 'bookOpen',
    image: CATEGORY_COVERS.audiobooks.all,
  },
  {
    route: 'ShowsScreen',
    name: 'Shows',
    icon: 'videoCamera',
    image: CATEGORY_COVERS.shows.all,
  },
  {
    route: 'ArchiveScreen',
    name: 'Archive',
    icon: 'archive',
    image: CATEGORY_COVERS.archive.all,
  },
  {
    route: 'LocalFiles',
    name: 'Local Files',
    icon: 'folder',
  },
];

interface BrowseAllShelfProps {
  onSectionPress: (route: SectionRouteKey) => void;
}

export const BrowseAllShelf: React.FC<BrowseAllShelfProps> = React.memo(
  ({onSectionPress}) => {
    return (
      <View style={styles.container}>
        {/* The rail's title, in the page's plain skin: the title and
            nothing else. No badge circle and no action — the nine cards
            below ARE the section, and a "See All" would point at a page
            that has no single list to show. */}
        <SectionHeader label="Explore Contents" variant="plain" />
        <FlatList
          horizontal
          data={BROWSE_ALL_SECTIONS}
          keyExtractor={section => section.route}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          renderItem={({item}) => (
            <CategoryCard
              name={item.name}
              description={categoryDescriptions[item.name]}
              icon={item.icon}
              image={item.image}
              onPress={() => onSectionPress(item.route)}
            />
          )}
          initialNumToRender={BROWSE_ALL_SECTIONS.length}
          windowSize={5}
          maxToRenderPerBatch={8}
          snapToInterval={RAIL_CARD_PITCH}
          decelerationRate="fast"
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    // The same rhythm as every other Home rail (`MediaRail`): 32 dp
    // between one shelf and the next.
    marginBottom: spacing.xxl,
  },
  scroll: {
    // The ONE gutter: 16 dp, like every left-aligned thing on the page.
    paddingHorizontal: spacing.lg,
    // The ONE gap: 12 dp — the page's card pitch.
    gap: spacing.md,
  },
});
