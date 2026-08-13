import React, {useState} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing, ColorTokens} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import {BottomSheet} from '../../sheets/BottomSheet/BottomSheet';
import {TrackMetadata} from './TrackMetadata';
import {ChapterList, type Chapter} from './ChapterList';
import type {TrackMetadata as TrackMetadataType} from '../../../services/metadataService';
import type {ScannedTrack} from '../../../store/slices/mediaSlice';

interface InfoSheetProps {
  visible: boolean;
  onClose: () => void;
  metadata: TrackMetadataType;
  chapters: Chapter[];
  currentTime: number;
  onSeek: (time: number) => void;
  /** Tracks related to the current track (same artist/album) for the Related tab */
  relatedTracks?: ScannedTrack[];
  /** Called when user taps "Add to Playlist" */
  onAddToPlaylist?: () => void;
  /** Called to play a related track */
  onPlayRelatedTrack?: (track: ScannedTrack) => void;
}

type Tab = 'details' | 'chapters' | 'related';

export const InfoSheet: React.FC<InfoSheetProps> = ({
  visible,
  onClose,
  metadata,
  chapters,
  currentTime,
  onSeek,
  relatedTracks = [],
  onAddToPlaylist,
  onPlayRelatedTrack,
}) => {
  const {colors, theme} = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const tabs: {key: Tab; label: string}[] = [
    {key: 'details', label: 'Details'},
    {key: 'chapters', label: 'Chapters'},
    {key: 'related', label: 'Related'},
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['45%', '75%']}
      title={
        <View style={headerRow}>
          <AppText variant="displaySans">Now Playing</AppText>
          {onAddToPlaylist && (
            <TouchableOpacity
              style={[addBtn, {backgroundColor: isDark ? colors.accent.goldDim : colors.accent.goldSoft}]}
              onPress={onAddToPlaylist}
              activeOpacity={0.7}
              accessibilityLabel="Add to playlist"
              accessibilityRole="button">
              <SvgIcon name="list" size={16} color={colors.accent.gold} />
              <AppText variant="caption" color="accent" style={addBtnLabel}>
                Add to Playlist
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      }>
      {/* ── Tab bar (59.1: virtualized) ── */}
      <View style={[styles.tabBar, {borderBottomColor: colors.border.subtle}]}>
        <FlatList
          horizontal
          data={tabs}
          keyExtractor={tab => tab.key}
          renderItem={({item: tab}) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                activeTab === tab.key && {
                  borderBottomColor: colors.accent.gold,
                  borderBottomWidth: 2,
                },
              ]}>
              <AppText
                variant="body2"
                color={activeTab === tab.key ? 'accent' : 'secondary'}>
                {tab.label}
              </AppText>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.tabRail}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          initialNumToRender={tabs.length}
        />
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}>
        {activeTab === 'details' ? (
          <TrackMetadata metadata={metadata} />
        ) : activeTab === 'chapters' ? (
          <ChapterList
            chapters={chapters}
            currentTime={currentTime}
            onSeek={time => {
              onSeek(time);
              onClose();
            }}
          />
        ) : (
          <RelatedTab
            tracks={relatedTracks}
            onPlayTrack={onPlayRelatedTrack}
            colors={colors}
          />
        )}
      </ScrollView>
    </BottomSheet>
  );
};

// ── Related Tab Sub-Component ──

interface RelatedTabProps {
  tracks: ScannedTrack[];
  onPlayTrack?: (track: ScannedTrack) => void;
  colors: ColorTokens;
}

const RelatedTab: React.FC<RelatedTabProps> = ({tracks, onPlayTrack, colors}) => {
  if (tracks.length === 0) {
    return (
      <View style={emptyWrap}>
        <View style={[emptyIcon, {backgroundColor: colors.accent.goldSoft}]}>
          <SvgIcon name="music" size={32} color={colors.text.tertiary} />
        </View>
        <AppText variant="body2" color="tertiary" style={emptyText}>
          No related tracks found for this artist or album.
        </AppText>
      </View>
    );
  }

  return (
    <View style={relatedContainer}>
      {/* 59.1: virtualized row list inside the sheet's ScrollView */}
      <FlatList
        data={tracks}
        keyExtractor={(track, idx) => `${track.uri}-${idx}`}
        renderItem={({item: track, index: idx}) => (
          <TouchableOpacity
            style={[
              relatedItem,
              {borderBottomColor: colors.border.subtle},
            ]}
            activeOpacity={0.7}
            onPress={() => onPlayTrack?.(track)}
            accessibilityLabel={`Play ${track.title}`}
            accessibilityRole="button">
            <View style={relatedItemLeft}>
              <View style={[relatedNum, {backgroundColor: colors.background.elevated}]}>
                <AppText variant="caption" color="tertiary">
                  {idx + 1}
                </AppText>
              </View>
              <View style={relatedItemInfo}>
                <AppText variant="body2" color="primary" numberOfLines={1}>
                  {track.title || 'Unknown Track'}
                </AppText>
                <AppText variant="caption" color="tertiary" numberOfLines={1}>
                  {track.artist || 'Unknown Artist'}
                  {track.album ? `  ·  ${track.album}` : ''}
                </AppText>
              </View>
            </View>
            {onPlayTrack && (
              <SvgIcon name="play" size={16} color={colors.accent.gold} />
            )}
          </TouchableOpacity>
        )}
        scrollEnabled={false}
        initialNumToRender={tracks.length}
      />
    </View>
  );
};

// ── Styles ──

const headerRow: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  flex: 1,
};

const addBtn: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: radius.pill,
  gap: 6,
};

const addBtnLabel: TextStyle = {
  fontSize: 12,
  fontWeight: '600',
};

const styles = StyleSheet.create({
  tabBar: {
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  tabRail: {
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: spacing.sm,
    marginRight: spacing.xl,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: spacing.xxl * 2,
  },
});

const emptyWrap: ViewStyle = {
  alignItems: 'center',
  paddingTop: 48,
  gap: 16,
};

const emptyIcon: ViewStyle = {
  width: 64,
  height: 64,
  borderRadius: 32,
  alignItems: 'center',
  justifyContent: 'center',
};

const emptyText: TextStyle = {
  textAlign: 'center',
  paddingHorizontal: 32,
};

const relatedContainer: ViewStyle = {
  paddingHorizontal: spacing.lg,
};

const relatedItem: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 12,
  borderBottomWidth: StyleSheet.hairlineWidth,
};

const relatedItemLeft: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  gap: 12,
};

const relatedNum: ViewStyle = {
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
};

const relatedItemInfo: ViewStyle = {
  flex: 1,
};
