// ─── Music Categories Shelf ─────────────────────────────────────────────
// P53: uniform "All + content cards" Home rail. Tapping a genre tile
// opens MusicScreen with that genre pre-selected.

import React from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import {MUSIC_CATEGORIES} from '../../../constants/musicCategories';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {CategoryCard} from '../../../components/utility/CategoryCard/CategoryCard';
import {spacing} from '../../../theme/tokens';

interface MusicCategoriesShelfProps {
  onCategoryPress: (genre: string) => void;
}

export const MusicCategoriesShelf: React.FC<MusicCategoriesShelfProps> = React.memo(
  ({onCategoryPress}) => {
    const categories = MUSIC_CATEGORIES.slice(0, 6);

    return (
      <View style={styles.container}>
        <SectionHeader label="Music" />
        <FlatList
          horizontal
          data={categories}
          keyExtractor={cat => cat.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          renderItem={({item: cat}) => (
            <CategoryCard
              name={cat.name}
              description={describeMusicCategory(cat.id)}
              icon={cat.icon}
              image={cat.image}
              onPress={() => onCategoryPress(cat.genre)}
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

function describeMusicCategory(id: string): string {
  switch (id) {
    case 'all':       return 'Top tracks right now';
    case 'rock':      return 'Classic & modern rock';
    case 'pop':       return 'Pop hits from around the world';
    case 'electronic':return 'House, techno, EDM';
    case 'jazz':      return 'Smooth jazz, bebop, fusion';
    case 'classical': return 'Symphonies, chamber, opera';
    case 'hip-hop':   return 'Hip-hop, rap, R&B';
    case 'ambient':   return 'Ambient, drone, chillout';
    case 'folk':      return 'Folk, roots, americana';
    case 'blues':     return 'Blues, soul, R&B roots';
    case 'reggae':    return 'Reggae, dub, dancehall';
    default:          return '';
  }
}
