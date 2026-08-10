// ─── Internet Archive Shelf ────────────────────────────────
// P53: Home rail for Internet Archive.
// Same uniform "All + content cards" pattern as Movies/Podcasts/Music.

import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {ARCHIVE_CATEGORIES, type ArchiveCategory} from '../../../constants/audiobookCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {CategoryCard} from '../../../components/utility/CategoryCard/CategoryCard';
import {spacing} from '../../../theme/tokens';

interface ArchiveShelfProps {
  onCategoryPress: (cat: ArchiveCategory) => void;
}

export const ArchiveShelf: React.FC<ArchiveShelfProps> = React.memo(
  ({onCategoryPress}) => {
    return (
      <View style={styles.container}>
        <SectionHeader label="Internet Archive" />
        <FlatList
          horizontal
          data={ARCHIVE_CATEGORIES}
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
          initialNumToRender={ARCHIVE_CATEGORIES.length}
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
