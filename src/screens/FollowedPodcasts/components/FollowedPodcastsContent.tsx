// ─── "My Podcasts" — Browse Content ───────────────────────────────────
// The list the browse shell hosts.
//
// WAVE B16 (Wave B2) — rewritten from the screen's own hand-rolled shell.
//
// The shell owns the header. This component owns the list, the list's
// empty state, and the ROW — art + title + author + the Unfollow action.
//
// ONE ROW GRAMMAR. The row is art + title + author — the same three
// things the catalogue's row carries. It used to add the episode count
// as well, so the same podcast showed two different amounts of
// information on two screens a swipe apart.

import React, {useCallback, useMemo} from 'react';
import {View, FlatList, TouchableOpacity} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {MediaImage} from '../../../components/utility/MediaImage';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {useTheme} from '../../../theme';
import {createFollowedPodcastsScreenStyles} from '../styles';
import {useFollowedPodcastsData} from './FollowedPodcastsDataProvider';
import type {SectionRenderContext} from '../types';
import text from '../related/textContent.json';

export const FollowedPodcastsContent: React.FC<{ctx: SectionRenderContext}> = () => {
  const {colors} = useTheme();
  const styles = useMemo(() => createFollowedPodcastsScreenStyles(colors), [colors]);
  const {list, openPodcast, unfollowPodcast} = useFollowedPodcastsData();

  // The artwork's tile — what the circle shows while the cover is on
  // the wire, and what stays if it never arrives.
  const artworkTile = (
    <View style={styles.artworkFallback} testID="podcast-artwork-placeholder">
      <SvgIcon name="headphones" size={24} color={colors.accent.gold} />
    </View>
  );

  const renderItem = useCallback(
    ({item}: {item: (typeof list)[number]}) => (
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => openPodcast(item.id)}
          accessibilityRole="button"
          accessibilityLabel={text.row.openLabel.replace('{title}', item.title)}
          style={styles.artwork}>
          {item.image ? (
            <MediaImage
              source={item.image}
              style={styles.artworkImage}
              resizeMode="cover"
              placeholder={artworkTile}
              testID="podcast-artwork-image"
            />
          ) : (
            artworkTile
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => openPodcast(item.id)}
          accessibilityRole="button"
          accessibilityLabel={
            item.author
              ? text.row.openLabelWithAuthor
                  .replace('{title}', item.title)
                  .replace('{author}', item.author)
              : text.row.openLabel.replace('{title}', item.title)
          }
          style={styles.info}>
          <AppText variant="bodySmall" color="primary" numberOfLines={1} style={styles.title}>
            {item.title}
          </AppText>
          {item.author ? (
            <AppText variant="caption" color="secondary" numberOfLines={1} style={styles.author}>
              {item.author}
            </AppText>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => unfollowPodcast(item.id, item.title)}
          accessibilityRole="button"
          accessibilityLabel={text.row.unfollowLabel.replace('{title}', item.title)}
          style={styles.unfollow}>
          <AppText variant="caption" color="accent">
            {text.row.unfollow}
          </AppText>
        </TouchableOpacity>
      </View>
    ),
    [colors, openPodcast, styles, unfollowPodcast],
  );

  return (
    <View style={styles.sectionRoot}>
      {list.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            icon="headphones"
            title={text.states.emptyTitle}
            description={text.states.emptyMessage}
          />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={podcast => String(podcast.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={Math.min(list.length, 12)}
          windowSize={5}
          maxToRenderPerBatch={8}
        />
      )}
    </View>
  );
};