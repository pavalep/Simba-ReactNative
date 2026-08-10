// ─── Movie Categories Shelf ─────────────────────────────────────────────
// P53: uniform "All + content cards" Home rail. Tapping a category
// tile opens MoviesScreen with that category pre-selected.

import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {MOVIE_CATEGORIES} from '../../../constants/movieCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {CategoryCard} from '../../../components/utility/CategoryCard/CategoryCard';
import {spacing} from '../../../theme/tokens';

interface MovieCategoriesShelfProps {
  onCategoryPress: (categoryId: string) => void;
}

export const MovieCategoriesShelf: React.FC<MovieCategoriesShelfProps> = React.memo(
  ({onCategoryPress}) => {
    const categories = MOVIE_CATEGORIES.slice(0, 6);

    return (
      <View style={styles.container}>
        <SectionHeader label="Movies" />
        <FlatList
          horizontal
          data={categories}
          keyExtractor={cat => cat.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          renderItem={({item: cat}) => (
            <CategoryCard
              name={cat.name}
              description={cat.description}
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
