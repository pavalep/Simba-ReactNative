// v11 T3.1 — VideoMoreSheet scaffold.
//
// Spec §4.6: "Modal transparent animationType='none' + FilterSheet
// slide primitive; handle 36×4; 240 ms translateY native driver;
// scrim 0→0.55 in 200 ms; swipe-down + scrim-tap dismiss."
//
// This file ships the SCAFFOLD: the slide-up container, the scrim,
// the handle, the section-header renderer, and the visibility/animation
// contract. Real section bodies (queue, tracks, chapters, fullscreen,
// EQ) land in T3.2 / T3.3 / T4.x. The host owns all playback state
// and intent dispatch; the sheet holds no playback logic of its own.
//
// The animation uses `transform` (translateY) + `opacity` exclusively,
// so it is native-driver-only and runs on the UI thread.

import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';

const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;
const SLIDE_DURATION_MS = 240;
const SCRIM_DURATION_MS = 200;
const SHEET_BOTTOM_OFFSET = 0;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: cinemaColors.background.scrimDeep,
  },
  sheet: {
    backgroundColor: cinemaColors.background.elevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: SHEET_BOTTOM_OFFSET,
    maxHeight: '88%',
  },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: 2,
    backgroundColor: cinemaColors.text.onMediaMuted,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    fontFamily: FONT_FAMILY.inter.medium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.4,
    color: cinemaColors.text.secondary,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  chipSelected: {
    backgroundColor: cinemaColors.accent.gold,
  },
  chipMuted: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cinemaColors.border.subtle,
  },
  chipLabel: {
    fontFamily: FONT_FAMILY.inter.semibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  chipLabelUnselected: {
    color: cinemaColors.text.bright,
  },
  chipLabelSelected: {
    color: cinemaColors.text.inverse,
  },
  chipLabelMuted: {
    color: cinemaColors.text.tertiary,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 6,
  },
  queueRowCurrent: {
    backgroundColor: cinemaColors.accent.goldSoft,
  },
  queueRowThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  queueRowThumbText: {
    fontFamily: FONT_FAMILY.inter.bold,
    fontSize: 14,
    color: cinemaColors.text.bright,
  },
  queueRowBody: {
    flex: 1,
  },
  queueRowTitle: {
    fontFamily: FONT_FAMILY.inter.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: cinemaColors.text.primary,
  },
  queueRowMeta: {
    fontFamily: FONT_FAMILY.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: cinemaColors.text.secondary,
    marginTop: 2,
  },
  queueRowBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: cinemaColors.accent.goldWash,
  },
  queueRowBadgeText: {
    fontFamily: FONT_FAMILY.inter.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: cinemaColors.accent.gold,
  },
  queueClearRow: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  queueClearText: {
    fontFamily: FONT_FAMILY.inter.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: cinemaColors.semantic.error,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 6,
  },
  chapterRowCurrent: {
    backgroundColor: cinemaColors.accent.goldSoft,
  },
  chapterTitle: {
    flex: 1,
    fontFamily: FONT_FAMILY.inter.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: cinemaColors.text.primary,
  },
  chapterTime: {
    fontFamily: FONT_FAMILY.inter.regular,
    fontSize: 12,
    lineHeight: 16,
    color: cinemaColors.text.secondary,
    marginLeft: 12,
  },
  placeholder: {
    // Spec §4.7: empty sections are HIDDEN. This view is a stub used
    // by the scaffold to verify the section-header renderer compiles
    // and lays out. T3.2 / T3.3 / T4.x replace this with real rows.
    minHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  footerSpacer: {
    flex: 1,
  },
  // Reset / Done buttons are placeholders for T3.2; they exist in the
  // tree so the spacing matches the spec §4.7 diagram. Theme 3 wires
  // them to real handlers.
  footerAction: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerActionLabel: {
    fontFamily: FONT_FAMILY.inter.semibold,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
});

export interface VideoMoreSheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  /** When provided, render a UP NEXT section. Wired in T4.x. */
  readonly queue?: VideoMoreSheetQueueSection;
  /** When provided, render a TRACKS & QUALITY section. Wired in T3.2. */
  readonly tracks?: VideoMoreSheetTracksSection;
  /** When provided, render a CHAPTERS section. Wired in T3.2. */
  readonly chapters?: VideoMoreSheetChaptersSection;
  /** When provided, render a WINDOW section. Wired in T3.3. */
  readonly window?: VideoMoreSheetWindowSection;
  /** When provided, render an AUDIO section. Wired in T3.3. */
  readonly audio?: VideoMoreSheetAudioSection;
}

export interface VideoMoreSheetQueueSection {
  /** Currently playing row, if any (the "Now Playing" line). */
  readonly currentRow: VideoMoreSheetRow | null;
  /** Up-next list (queue + remaining playlist, video-lane filtered). */
  readonly upNext: readonly VideoMoreSheetRow[];
  readonly onPlayRow: (row: VideoMoreSheetRow) => void;
  readonly onClear: () => void;
  /** True while a play dispatch is in flight — rows render non-tappable. */
  readonly playing?: boolean;
}

export interface VideoMoreSheetTracksSection {
  /** One group per track type; absent types are HIDDEN. */
  readonly groups: readonly VideoMoreSheetTrackGroup[];
  /** Selection handler. `null` means "Off" (subtitles only). */
  readonly onSelect: (groupId: string, trackId: string | null) => void;
}

export interface VideoMoreSheetTrackGroup {
  /** 'video' | 'audio' | 'subtitles' — used as a stable key + a11y id. */
  readonly id: string;
  readonly title: string;
  readonly options: readonly VideoMoreSheetTrackOption[];
  /** Subtitles: render a leading "Off" chip. */
  readonly allowOff?: boolean;
  /** True when the "Off" chip is currently selected. */
  readonly offSelected?: boolean;
}

export interface VideoMoreSheetTrackOption {
  readonly id: string;
  readonly label: string;
  readonly selected: boolean;
}

export interface VideoMoreSheetChaptersSection {
  readonly rows: readonly VideoMoreSheetChapterRow[];
  readonly onSeek: (id: string) => void;
}

export interface VideoMoreSheetChapterRow {
  readonly id: string;
  readonly title: string;
  /** Pre-formatted time string ("H:MM:SS" or "M:SS"). */
  readonly time: string;
  /** True for the chapter the playhead is currently in. */
  readonly current: boolean;
}

export interface VideoMoreSheetWindowSection {
  readonly canFullscreen: boolean;
  readonly onToggleFullscreen: () => void;
  readonly canPip: boolean;
  readonly onPip: () => void;
}

export interface VideoMoreSheetAudioSection {
  readonly onOpenEqualizer: () => void;
}

export interface VideoMoreSheetRow {
  readonly id: string;
  readonly title: string;
  readonly meta?: string;
  readonly badge?: string;
  readonly disabled?: boolean;
}

/**
 * v11: the player's single modal — the only modal in the player
 * (Rule 4). One container, one slide animation, one dismiss path.
 */
export function VideoMoreSheet({
  visible,
  onClose,
  queue,
  tracks,
  chapters,
  window: windowSection,
  audio,
}: VideoMoreSheetProps) {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slide.setValue(0);
      Animated.timing(slide, {
        toValue: 1,
        duration: SLIDE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      slide.setValue(0);
    }
  }, [visible, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });
  const scrimOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[styles.scrim, {opacity: scrimOpacity}]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss more sheet"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {transform: [{translateY}]},
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss more sheet"
            onPress={onClose}
            style={styles.handle}
          />
          <View style={styles.body}>
            {queue ? <QueueSection section={queue} /> : null}
            {tracks ? <TracksSection section={tracks} /> : null}
            {chapters ? <ChaptersSection section={chapters} /> : null}
            {windowSection ? <WindowSection section={windowSection} /> : null}
            {audio ? <AudioSection section={audio} /> : null}
            {/* Scaffold placeholder so the section-header renderer
                compiles. Real content lands in T3.2 / T3.3 / T4.x. */}
            {!queue && !tracks && !chapters && !windowSection && !audio ? (
              <Text style={styles.sectionHeader}>More</Text>
            ) : null}
            {!queue && !tracks && !chapters && !windowSection && !audio ? (
              <View style={styles.placeholder} />
            ) : null}
          </View>
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset more options"
              onPress={onClose}
              style={styles.footerAction}
            >
              <Text
                style={[
                  styles.footerActionLabel,
                  {color: cinemaColors.text.onMediaMuted},
                ]}
              >
                Reset
              </Text>
            </Pressable>
            <View style={styles.footerSpacer} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={onClose}
              style={styles.footerAction}
            >
              <Text
                style={[
                  styles.footerActionLabel,
                  {color: cinemaColors.accent.gold},
                ]}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Section renderers. The body is intentionally a stub for T3.1 —
// the section is gated "non-empty" per the spec, and Theme 3/4
// fills the actual rows. Each section gets a stable testID so
// the T3.x render tests can assert presence / absence.

function QueueSection({section}: {section: VideoMoreSheetQueueSection}) {
  if (!section.currentRow && section.upNext.length === 0) return null;
  const playing = !!section.playing;
  const count = section.upNext.length;
  return (
    <View testID="moreSection:queue">
      {section.currentRow ? (
        <QueueRow
          row={section.currentRow}
          disabled
          onPress={() => {}}
          testID="moreQueue:current"
        />
      ) : null}
      {count > 0 ? (
        <>
          <Text style={styles.sectionHeader}>
            {`Up next · Queue (${count})`}
          </Text>
          {section.upNext.map(row => (
            <QueueRow
              key={row.id}
              row={row}
              disabled={playing}
              onPress={() => section.onPlayRow(row)}
              testID={`moreQueue:${row.id}`}
            />
          ))}
        </>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Clear queue"
        onPress={section.onClear}
        style={({pressed}) => [styles.queueClearRow, pressed && {opacity: 0.6}]}
        testID="moreQueue:clear"
      >
        <Text style={styles.queueClearText}>Clear queue</Text>
      </Pressable>
    </View>
  );
}

function QueueRow({
  row,
  onPress,
  disabled,
  testID,
}: {
  row: VideoMoreSheetRow;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const initial = row.title.trim().charAt(0).toUpperCase() || '?';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.title}${row.meta ? `, ${row.meta}` : ''}`}
      accessibilityState={{disabled: !!disabled}}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.queueRow,
        disabled && styles.queueRowCurrent,
        pressed && !disabled && {opacity: 0.7},
      ]}
      testID={testID}
    >
      <View style={styles.queueRowThumb}>
        <Text style={styles.queueRowThumbText}>{initial}</Text>
      </View>
      <View style={styles.queueRowBody}>
        <Text style={styles.queueRowTitle} numberOfLines={1} ellipsizeMode="tail">
          {row.title}
        </Text>
        {row.meta ? (
          <Text style={styles.queueRowMeta} numberOfLines={1} ellipsizeMode="tail">
            {row.meta}
          </Text>
        ) : null}
      </View>
      {row.badge ? (
        <View style={styles.queueRowBadge}>
          <Text style={styles.queueRowBadgeText}>{row.badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function TracksSection({section}: {section: VideoMoreSheetTracksSection}) {
  // Spec §4.7: groups are rendered only when they have at least one
  // option (or "Off" for subtitles). The section itself is shown if
  // ANY group is non-empty.
  const visibleGroups = section.groups.filter(g => {
    if (g.options.length === 0) return false;
    if (g.allowOff) return true;
    return g.options.length > 0;
  });
  if (visibleGroups.length === 0) return null;
  return (
    <View testID="moreSection:tracks">
      <Text style={styles.sectionHeader}>Tracks &amp; quality</Text>
      {visibleGroups.map(group => (
        <View key={group.id} testID={`moreTracksGroup:${group.id}`}>
          <Text
            style={[styles.sectionHeader, {marginTop: 8, marginBottom: 6}]}
          >
            {group.title}
          </Text>
          <View style={styles.chipRow}>
            {group.allowOff ? (
              <Chip
                label="Off"
                selected={!!group.offSelected}
                onPress={() => section.onSelect(group.id, null)}
                testID={`moreTrack:${group.id}:off`}
              />
            ) : null}
            {group.options.map(option => (
              <Chip
                key={option.id}
                label={option.label}
                selected={option.selected}
                onPress={() => section.onSelect(group.id, option.id)}
                testID={`moreTrack:${group.id}:${option.id}`}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function ChaptersSection({section}: {section: VideoMoreSheetChaptersSection}) {
  if (section.rows.length === 0) return null;
  return (
    <View testID="moreSection:chapters">
      <Text style={styles.sectionHeader}>Chapters</Text>
      {section.rows.map(row => (
        <Pressable
          key={row.id}
          accessibilityRole="button"
          accessibilityLabel={`Chapter ${row.title}, ${row.time}`}
          onPress={() => section.onSeek(row.id)}
          style={[styles.chapterRow, row.current && styles.chapterRowCurrent]}
          testID={`moreChapter:${row.id}`}
        >
          <Text
            style={styles.chapterTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {row.title}
          </Text>
          <Text style={styles.chapterTime}>{row.time}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{selected}}
      onPress={onPress}
      testID={testID}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text
        style={[
          styles.chipLabel,
          selected ? styles.chipLabelSelected : styles.chipLabelUnselected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Capability-gated chip (Rule 12): when `enabled` is false the chip
 * is rendered as muted, non-tappable text. Used for Fullscreen /
 * PiP when the native bridge methods are missing.
 */
function CapabilityChip({
  label,
  enabled,
  onPress,
  testID,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
  testID?: string;
}) {
  if (enabled) {
    return (
      <Chip label={label} selected={false} onPress={onPress} testID={testID} />
    );
  }
  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`${label} not available on this device`}
      style={[styles.chip, styles.chipMuted]}
    >
      <Text style={[styles.chipLabel, styles.chipLabelMuted]}>
        {`${label} — not available`}
      </Text>
    </View>
  );
}

function WindowSection({section}: {section: VideoMoreSheetWindowSection}) {
  return (
    <View testID="moreSection:window">
      <Text style={styles.sectionHeader}>Window</Text>
      <View style={styles.chipRow}>
        <CapabilityChip
          label="Fullscreen"
          enabled={section.canFullscreen}
          onPress={section.onToggleFullscreen}
          testID="moreWindow:fullscreen"
        />
        <CapabilityChip
          label="Picture in picture"
          enabled={section.canPip}
          onPress={section.onPip}
          testID="moreWindow:pip"
        />
      </View>
    </View>
  );
}

function AudioSection({section}: {section: VideoMoreSheetAudioSection}) {
  return (
    <View testID="moreSection:audio">
      <Text style={styles.sectionHeader}>Audio</Text>
      <View style={styles.chipRow}>
        <Chip
          label="Equalizer"
          selected={false}
          onPress={section.onOpenEqualizer}
          testID="moreAudio:equalizer"
        />
      </View>
    </View>
  );
}
