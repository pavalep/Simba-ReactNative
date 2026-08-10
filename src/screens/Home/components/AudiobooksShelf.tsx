// ─── Audiobooks Shelf ─────────────────────────────────────
// P53: Home rail for Audiobooks (LibriVox).
// Same uniform "All + content cards" pattern as Movies/Podcasts/Music.

import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {AUDIOBOOK_CATEGORIES, type AudiobookCategory} from '../../../constants/audiobookCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {CategoryCard} from '../../../components/utility/CategoryCard/CategoryCard';
import {spacing} from '../../../theme/tokens';

interface AudiobooksShelfProps {
  onCategoryPress: (cat: AudiobookCategory) => void;
}

export const AudiobooksShelf: React.FC<AudiobooksShelfProps> = React.memo(
  ({onCategoryPress}) => {
    return (
      <View style={styles.container}>
        <SectionHeader label="Audiobooks" />
        <FlatList
          horizontal
          data={AUDIOBOOK_CATEGORIES}
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
          initialNumToRender={AUDIOBOOK_CATEGORIES.length}
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
