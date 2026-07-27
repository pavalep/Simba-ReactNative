import React, {useState} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
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
          <AppText variant="h3">Now Playing</AppText>
          {onAddToPlaylist && (
            <TouchableOpacity
              style={[addBtn, {backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.1)'}]}
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
      {/* ── Tab bar ── */}
      <View style={[styles.tabBar, {borderBottomColor: colors.border.subtle}]}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
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
        ))}
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
  colors: any;
}

const RelatedTab: React.FC<RelatedTabProps> = ({tracks, onPlayTrack, colors}) => {
  if (tracks.length === 0) {
    return (
      <View style={emptyWrap}>
        <View style={[emptyIcon, {backgroundColor: 'rgba(212,175,55,0.1)'}]}>
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
      {tracks.map((track, idx) => (
        <TouchableOpacity
          key={`${track.uri}-${idx}`}
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
      ))}
    </View>
  );
};

// ── Styles ──

const headerRow: any = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  flex: 1,
};

const addBtn: any = {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
  borderRadius: radius.pill,
  gap: 6,
};

const addBtnLabel: any = {
  fontSize: 12,
  fontWeight: '600',
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
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

const emptyWrap: any = {
  alignItems: 'center',
  paddingTop: 48,
  gap: 16,
};

const emptyIcon: any = {
  width: 64,
  height: 64,
  borderRadius: 32,
  alignItems: 'center',
  justifyContent: 'center',
};

const emptyText: any = {
  textAlign: 'center',
  paddingHorizontal: 32,
};

const relatedContainer: any = {
  paddingHorizontal: spacing.lg,
};

const relatedItem: any = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 12,
  borderBottomWidth: StyleSheet.hairlineWidth,
};

const relatedItemLeft: any = {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  gap: 12,
};

const relatedNum: any = {
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
};

const relatedItemInfo: any = {
  flex: 1,
};
