// ─── TV Shows Shelf ─────────────────────────────────────
// P53: Home rail for TV Shows (TVMaze).
// Same uniform "All + content cards" pattern as Movies/Podcasts/Music.

import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {SHOW_CATEGORIES, type ShowCategory} from '../../../constants/showCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {CategoryCard} from '../../../components/utility/CategoryCard/CategoryCard';
import {spacing} from '../../../theme/tokens';

interface ShowsShelfProps {
  onCategoryPress: (cat: ShowCategory) => void;
}

export const ShowsShelf: React.FC<ShowsShelfProps> = React.memo(
  ({onCategoryPress}) => {
    return (
      <View style={styles.container}>
        <SectionHeader label="TV Shows" />
        <FlatList
          horizontal
          data={SHOW_CATEGORIES}
          keyExtractor={cat => cat.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          renderItem={({item: cat}) => (
            <CategoryCard
              name={cat.name}
              description={cat.description}
              icon={cat.icon}
              image={cat.image}
              onPress={() => onCategoryPress(cat)}
            />
          )}
          initialNumToRender={SHOW_CATEGORIES.length}
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
