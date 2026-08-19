// ─── Browse All Shelf ────────────────────────────────────────────────────
// v10.2: Home "Discover" collapses the 8 per-category rails (Movies,
// Podcasts, Music, Radio, Live TV, Audiobooks, Shows, Archive) into ONE
// horizontal shelf — one CategoryCard per top-level section, in the same
// "previous" 140×160 portrait + image + gradient + icon-disc + title/
// description pattern that was used by MovieCategoriesShelf / MusicCateg
// oriesShelf / etc. before the collapse. Tapping a card opens that
// section's browse screen.

import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {CategoryCard} from '../../../components/utility/CategoryCard/CategoryCard';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {spacing} from '../../../theme/tokens';
import {CATEGORY_COVERS} from '../../../assets/images/categories';
import type {SectionRouteKey} from './browseAllRouteKey';

export interface BrowseAllEntry {
  route: SectionRouteKey;
  name: string;
  description: string;
  icon: string;
  image: ReturnType<typeof require>;
}

/** Canonical order of the 8 top-level sections in the Discover rail. */
export const BROWSE_ALL_SECTIONS: BrowseAllEntry[] = [
  {
    route: 'MoviesScreen',
    name: 'Movies',
    description: 'Classic, sci-fi, noir & more',
    icon: 'clapperboard',
    image: CATEGORY_COVERS.movies.all,
  },
  {
    route: 'PodcastsScreen',
    name: 'Podcasts',
    description: 'Arts, news, science & more',
    icon: 'podcastRings',
    image: CATEGORY_COVERS.podcasts.all,
  },
  {
    route: 'MusicScreen',
    name: 'Music',
    description: 'Rock, jazz, classical & more',
    icon: 'disc3',
    image: CATEGORY_COVERS.music.all,
  },
  {
    route: 'RadioScreen',
    name: 'Radio',
    description: 'Live stations worldwide',
    icon: 'radioTower',
    image: CATEGORY_COVERS.radio.all,
  },
  {
    route: 'LiveTVScreen',
    name: 'Live TV',
    description: 'News, sports & entertainment',
    icon: 'tv',
    image: CATEGORY_COVERS.liveTv.all,
  },
  {
    route: 'AudiobooksScreen',
    name: 'Audiobooks',
    description: 'Fiction, mystery, history & more',
    icon: 'bookOpen',
    image: CATEGORY_COVERS.audiobooks.all,
  },
  {
    route: 'ShowsScreen',
    name: 'Shows',
    description: 'Drama, comedy, sci-fi & more',
    icon: 'videoCamera',
    image: CATEGORY_COVERS.shows.all,
  },
  {
    route: 'ArchiveScreen',
    name: 'Archive',
    description: 'Audio, video & old-time radio',
    icon: 'archive',
    image: CATEGORY_COVERS.archive.all,
  },
];

interface BrowseAllShelfProps {
  onSectionPress: (route: SectionRouteKey) => void;
}

export const BrowseAllShelf: React.FC<BrowseAllShelfProps> = React.memo(
  ({onSectionPress}) => {
    return (
      <View style={styles.container}>
        {/* Section title row — matches the rail pattern used everywhere
            else on Home (Recently Played, Bookmarks, Followed Podcasts,
            etc.). "Explore Contents" reads as one short, editorial
            pair — signals that this rail is the discovery front door
            for every catalog section. The compass leading icon ties
            the rail to that discovery metaphor. */}
        <SectionHeader
          label="Explore Contents"
          leadingIcon="compass"
        />
        <FlatList
          horizontal
          data={BROWSE_ALL_SECTIONS}
          keyExtractor={section => section.route}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          renderItem={({item}) => (
            <CategoryCard
              name={item.name}
              description={item.description}
              icon={item.icon}
              image={item.image}
              onPress={() => onSectionPress(item.route)}
            />
          )}
          initialNumToRender={BROWSE_ALL_SECTIONS.length}
          windowSize={5}
          maxToRenderPerBatch={8}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    // Match the vertical rhythm of every other Home rail
    // (FollowedPodcastsShelf, GenreChipsShelf, etc.) — bottom
    // gutter for separation from the next section.
    marginBottom: spacing.lg,
    // The "Discover" SubsectionTitle already supplies
    // `paddingVertical: spacing.md` (12 px) plus
    // `marginTop: spacing.sm` (8 px) above it. Add an extra
    // top margin here so the cards breathe against the rule
    // line below the title — same gap the rail above (Recently
    // Played) sits under "Your Library".
    marginTop: spacing.sm,
  },
  scroll: {paddingHorizontal: spacing.md, gap: spacing.sm},
});
