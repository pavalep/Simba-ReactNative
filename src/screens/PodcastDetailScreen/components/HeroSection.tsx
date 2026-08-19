// ─── Podcast Detail — Hero Section ─────────────────────────────────────
// Artwork, title, author, collapsible description, episode count badge
// and the follow toggle. Renders as the FlatList header on the detail
// screen (via ListHeaderComponent).

import React, {useMemo} from 'react';
import {View, TouchableOpacity} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {createHeroSectionStyles} from '../styles';
import text from '../related/textContent.json';
import type {PodcastResult} from '../../../types/api';

interface Props {
  podcast: PodcastResult;
  isFollowed: boolean;
  isDescriptionExpanded: boolean;
  onToggleDescription: () => void;
  onToggleFollow: () => void;
}

export const HeroSection: React.FC<Props> = ({
  podcast,
  isFollowed,
  isDescriptionExpanded,
  onToggleDescription,
  onToggleFollow,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createHeroSectionStyles(colors), [colors]);

  return (
    <View style={styles.heroSection}>
      {podcast.image ? (
        <FastImage
          source={{uri: podcast.image}}
          style={styles.heroImage}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <SvgIcon name="music" size={48} color={colors.accent.gold} />
        </View>
      )}

      <AppText variant="displaySerif" color="primary" style={styles.podcastTitle}>
        {podcast.title}
      </AppText>

      <AppText variant="body1" color="secondary" style={styles.authorText}>
        {podcast.author}
      </AppText>

      {podcast.description ? (
        <>
          <AppText
            variant="bodySmall"
            color="tertiary"
            style={styles.descriptionText}
            numberOfLines={isDescriptionExpanded ? undefined : 2}>
            {podcast.description}
          </AppText>
          <TouchableOpacity
            style={styles.showMoreButton}
            activeOpacity={0.7}
            onPress={onToggleDescription}
            accessibilityLabel={
              isDescriptionExpanded ? text.hero.showLess : text.hero.showMore
            }
            accessibilityRole="button">
            <AppText variant="caption" color="accent" style={styles.showMoreLabel}>
              {isDescriptionExpanded ? text.hero.showLess : text.hero.showMore}
            </AppText>
          </TouchableOpacity>
        </>
      ) : null}

      <View style={styles.episodeCountBadge}>
        <SvgIcon name="music" size={14} color={colors.accent.gold} />
        <AppText variant="caption" style={styles.episodeCountText}>
          {podcast.episodeCount}{' '}
          {podcast.episodeCount === 1
            ? text.hero.episodeSingular
            : text.hero.episodePlural}
        </AppText>
      </View>

      <TouchableOpacity
        style={[styles.followButton, isFollowed && styles.followButtonActive]}
        activeOpacity={0.7}
        onPress={onToggleFollow}
        accessibilityRole="button"
        accessibilityState={{selected: isFollowed}}
        accessibilityLabel={
          isFollowed
            ? text.hero.unfollowAccessibility
            : text.hero.followAccessibility
        }>
        <SvgIcon name="bookmark" size={16} color={colors.accent.gold} />
        <AppText variant="caption" style={styles.followLabel}>
          {isFollowed ? text.hero.following : text.hero.follow}
        </AppText>
      </TouchableOpacity>
    </View>
  );
};
