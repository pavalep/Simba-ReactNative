import React from 'react';
import {View, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {AppCard} from '../../../components/core/AppCard/AppCard';
import {SvgIcon} from '../../../components/utility/SvgIcon';

interface HomeMediaShelfProps {
  title: string;
  items: Array<{
    fileUri: string;
    title: string;
    mediaType: string;
    thumbnailPath?: string;
    [key: string]: any;
  }>;
  onItemPress: (item: any) => void;
  maxItems?: number;
}

export const HomeMediaShelf: React.FC<HomeMediaShelfProps> = ({
  title,
  items,
  onItemPress,
  maxItems = 6,
}) => {
  const {colors} = useTheme();

  if (items.length === 0) return null;

  const displayItems = items.slice(0, maxItems);

  return (
    <View style={styles.container}>
      {/* ── Section header ── */}
      <View style={styles.header}>
        <AppText variant="h2" color="accent">
          {title}
        </AppText>
        <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn}>
          <View style={{transform: [{rotate: '-90deg'}]}}>
            <SvgIcon name="chevronDown" size={18} color={colors.accent.gold} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Horizontal Shelf ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfContent}>
        {displayItems.map(item => (
          <AppCard
            key={item.fileUri}
            elevated
            onPress={() => onItemPress(item)}
            style={styles.card}>
            {/* ── Thumbnail area ── */}
            <View
              style={[
                styles.thumbnail,
                {backgroundColor: colors.background.elevated},
              ]}>
              <SvgIcon
                name={item.mediaType === 'audio' ? 'music' : 'video'}
                size={28}
                color={colors.text.tertiary}
              />
            </View>

            {/* ── Card title ── */}
            <AppText variant="bodySmall" numberOfLines={2} style={styles.cardTitle}>
              {item.title}
            </AppText>
          </AppCard>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  seeAllBtn: {
    padding: spacing.xs,
  },
  shelfContent: {
    paddingHorizontal: spacing.md,
  },
  card: {
    width: 120,
    marginRight: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 120,
    height: 80,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
});
