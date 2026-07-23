import React, {useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {useTheme} from '../../../theme';
import {MpvTrack} from '../../../native';

// ─── Props ──────────────────────────────────────────────────

export interface TrackSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  subtitleTracks: MpvTrack[];
  audioTracks: MpvTrack[];
  activeSubtitle: number | null;
  activeAudioTrack: number | null;
  onSelectSubtitle: (trackId: number | null) => void;
  onSelectAudio: (trackId: number | null) => void;
}

// ─── Helpers ────────────────────────────────────────────────

function trackLabel(track: MpvTrack): string {
  return track.title || track.lang || `Track ${track.id}`;
}

function trackDetail(track: MpvTrack): string {
  const parts: string[] = [];
  if (track.lang) parts.push(track.lang);
  if (track.default) parts.push('Default');
  if (track.codec) parts.push(track.codec);
  return parts.join(' · ');
}

// ─── Component ──────────────────────────────────────────────

const TrackSelectorModal: React.FC<TrackSelectorModalProps> = ({
  visible,
  onClose,
  subtitleTracks,
  audioTracks,
  activeSubtitle,
  activeAudioTrack,
  onSelectSubtitle,
  onSelectAudio,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'flex-end',
        },
        modalContent: {
          backgroundColor: colors.background.elevated,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: Dimensions.get('window').height * 0.75,
          paddingBottom: 34,
        },
        handleRow: {
          alignItems: 'center',
          paddingTop: 10,
          paddingBottom: 4,
        },
        handle: {
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border.emphasis,
        },
        headerRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
        },
        closeBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sectionHeader: {
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 4,
        },
        trackRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 20,
        },
        radioOuter: {
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: colors.border.subtle,
          alignItems: 'center',
          justifyContent: 'center',
        },
        radioFilled: {
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: colors.accent.gold,
        },
        trackInfo: {
          flex: 1,
          marginLeft: 14,
        },
        trackDetail: {
          marginTop: 1,
        },
        divider: {
          height: 1,
          backgroundColor: colors.border.subtle,
          marginVertical: 4,
          marginHorizontal: 20,
        },
        emptyText: {
          paddingHorizontal: 20,
          paddingVertical: 10,
        },
        scrollContent: {
          paddingBottom: 12,
        },
      }),
    [colors],
  );

  const renderTrackList = (
    tracks: MpvTrack[],
    activeId: number | null,
    onSelect: (id: number | null) => void,
    labelSingular: string,
  ) => {
    if (tracks.length === 0) {
      return (
        <AppText
          variant="body2"
          color="secondary"
          style={styles.emptyText}>
          No {labelSingular.toLowerCase()} tracks available
        </AppText>
      );
    }

    return (
      <>
        {/* "Off" option */}
        <TouchableOpacity
          style={styles.trackRow}
          onPress={() => onSelect(null)}>
          <View
            style={activeId === null ? styles.radioFilled : styles.radioOuter}
          />
          <View style={styles.trackInfo}>
            <AppText variant="body2" color="primary">
              Off
            </AppText>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {tracks.map(track => {
          const isSelected = track.id === activeId;
          return (
            <TouchableOpacity
              key={`${track.type}-${track.id}`}
              style={styles.trackRow}
              onPress={() => onSelect(track.id)}>
              <View
                style={isSelected ? styles.radioFilled : styles.radioOuter}
              />
              <View style={styles.trackInfo}>
                <AppText variant="body2" color="primary">
                  {trackLabel(track)}
                </AppText>
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.trackDetail}>
                  {trackDetail(track)}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <AppText variant="h3" color="primary">
              Audio & Subtitles
            </AppText>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close panel" accessibilityRole="button">
              <AppText variant="body1" color="secondary">
                ✕
              </AppText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Audio tracks */}
            <AppText
              variant="caption"
              color="secondary"
              style={styles.sectionHeader}>
              Audio Tracks
            </AppText>
            {renderTrackList(
              audioTracks,
              activeAudioTrack,
              onSelectAudio,
              'Audio',
            )}

            <View style={styles.divider} />

            {/* Subtitle tracks */}
            <AppText
              variant="caption"
              color="secondary"
              style={styles.sectionHeader}>
              Subtitle Tracks
            </AppText>
            {renderTrackList(
              subtitleTracks,
              activeSubtitle,
              onSelectSubtitle,
              'Subtitle',
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default TrackSelectorModal;
