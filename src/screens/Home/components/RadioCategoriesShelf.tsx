// ─── Radio Categories Shelf ─────────────────────────────────
// P53: Home rail for Live Radio.
// Same uniform "All + content cards" pattern as Movies/Podcasts/Music.
// Browse modes (Top / Genres list / Countries / Languages / Favorites)
// live in the RadioScreen tab bar — not here.

import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {RADIO_CATEGORIES, type RadioCategory} from '../../../constants/liveCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {CategoryCard} from '../../../components/utility/CategoryCard/CategoryCard';
import {spacing} from '../../../theme/tokens';

interface RadioCategoriesShelfProps {
  onCategoryPress: (cat: RadioCategory) => void;
}

export const RadioCategoriesShelf: React.FC<RadioCategoriesShelfProps> = React.memo(
  ({onCategoryPress}) => {
    return (
      <View style={styles.container}>
        <SectionHeader label="Live Radio" />
        <FlatList
          horizontal
          data={RADIO_CATEGORIES}
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
          initialNumToRender={RADIO_CATEGORIES.length}
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
