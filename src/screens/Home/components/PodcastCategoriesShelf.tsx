// ─── Podcast Categories Shelf ───────────────────────────────────────────
// P53: uniform "All + content cards" Home rail. Tapping a category
// tile opens PodcastsScreen with that category pre-selected.

import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {PODCAST_CATEGORIES} from '../../../constants/podcastCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {CategoryCard} from '../../../components/utility/CategoryCard/CategoryCard';
import {spacing} from '../../../theme/tokens';

interface PodcastCategoriesShelfProps {
  onCategoryPress: (categoryId: number | 'all') => void;
}

export const PodcastCategoriesShelf: React.FC<PodcastCategoriesShelfProps> = React.memo(
  ({onCategoryPress}) => {
    const categories = PODCAST_CATEGORIES.slice(0, 6);

    return (
      <View style={styles.container}>
        <SectionHeader label="Podcasts" />
        <FlatList
          horizontal
          data={categories}
          keyExtractor={cat => String(cat.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          renderItem={({item: cat}) => (
            <CategoryCard
              name={cat.name}
              description={describePodcastCategory(cat.id)}
              icon={cat.icon}
              image={cat.image}
              onPress={() => onCategoryPress(cat.id)}
            />
          )}
          initialNumToRender={Math.min(categories.length, 24)}
          windowSize={5}
          maxToRenderPerBatch={12}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {marginBottom: spacing.lg},
  scroll: {paddingHorizontal: spacing.md, gap: spacing.sm},
});

function describePodcastCategory(id: number | 'all'): string {
  if (id === 'all') return 'Trending podcasts right now';
  switch (id) {
    case 1:  return 'Visual arts, design, food';
    case 10: return 'All genres of music shows';
    case 15: return 'Careers, startups, money';
    case 20: return 'Stand-up and comedy casts';
    case 25: return 'Learning, science, society';
    case 29: return 'Wellness, fitness, medicine';
    case 30: return 'Software, hardware, the web';
    case 33: return 'Past events and biography';
    case 35: return 'World and local news';
    case 49: return 'Sciences, math, nature';
    case 55: return 'Game-day, leagues, athletes';
    case 60: return 'TV, movies, bts interviews';
    default: return '';
  }
}
