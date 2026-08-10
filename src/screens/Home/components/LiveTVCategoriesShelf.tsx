// ─── Live TV Categories Shelf ───────────────────────────────
// P53: uniform "All + content cards" Home rail. Tapping a category
// tile opens LiveTVScreen with that iptv-org category pre-selected.

import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {IPTV_CATEGORIES} from '../../../constants/liveCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {CategoryCard} from '../../../components/utility/CategoryCard/CategoryCard';
import {spacing} from '../../../theme/tokens';

interface LiveTVCategoriesShelfProps {
  onCategoryPress: (categoryId: string) => void;
}

export const LiveTVCategoriesShelf: React.FC<LiveTVCategoriesShelfProps> = React.memo(
  ({onCategoryPress}) => {
    return (
      <View style={styles.container}>
        <SectionHeader label="Live TV" />
        <FlatList
          horizontal
          data={IPTV_CATEGORIES}
          keyExtractor={cat => cat.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          renderItem={({item: cat}) => (
            <CategoryCard
              name={cat.name}
              description={describeIPTVCategory(cat.id)}
              icon={cat.icon}
              image={cat.image}
              onPress={() => onCategoryPress(cat.id)}
            />
          )}
          initialNumToRender={IPTV_CATEGORIES.length}
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

function describeIPTVCategory(id: string): string {
  switch (id) {
    case 'all':          return 'Every live channel';
    case 'news':         return 'Live news worldwide';
    case 'sports':       return 'Live sports & events';
    case 'music':        return 'Music channels';
    case 'movies':       return 'Movie-only channels';
    case 'documentary':  return 'Documentary channels';
    case 'kids':         return 'Channels for kids';
    case 'entertainment':return 'Entertainment & lifestyle';
    default:             return '';
  }
}
