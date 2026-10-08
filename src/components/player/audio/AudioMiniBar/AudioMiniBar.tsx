/**
 * The audio mini bar. V20 Phase C.
 *
 * ## Shape, and where it comes from
 *
 * Plex's and Jellyfin's mini player, and Spotify's: a bar docked above
 * the content with artwork, title/artist, and play/pause, tappable to
 * open the full player. A hairline progress line sits along its top
 * edge — Spotify and YouTube Music both do this, and Plex's Now Playing
 * bar does too.
 *
 * It is a React overlay in the MainActivity tree, NOT a window
 * operation. Minimize and expand are two values of one boolean; nothing
 * touches an Activity, nothing calls `moveTaskToBack`, and playback is
 * never interrupted by either. That is the entire reason audio stopped
 * opening a window in the first place.
 *
 * ## The press-target trap
 *
 * The bar's own press means "expand", but it also contains a play/pause
 * button. Without care the inner control's press also bubbles to the
 * bar's and one tap both toggles and expands. The bar is therefore a
 * `Pressable` and the transport button sits in a separate
 * `View` that is not a descendant of the bar's responder — tapping
 * play does not expand.
 */

import React, {useCallback} from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {useTransport} from '../../../../infrastructure/player';
import {useNowPlayingStore} from '../../../../state/nowPlayingStore';
import {useAudioPresentationStore} from '../../../../state/useAudioPresentationStore';
import {PlayerControl} from '../../video/PlayerControl/PlayerControl';

const ART_SIZE = 44;
const PROGRESS_HEIGHT = 2;

export interface AudioMiniBarProps {
  /** Stop playback and tear down the service. The X verb. */
  readonly onClose: () => void;
}

export const AudioMiniBar: React.FC<AudioMiniBarProps> = ({onClose}) => {
  const {colors} = useTheme();
  const expand = useAudioPresentationStore(s => s.expand);
  const nowPlaying = useNowPlayingStore(s => s.current);
  const {state, commands} = useTransport();

  const onExpand = useCallback(() => expand(), [expand]);

  const hasDuration = state.durationMs > 0;
  const ratio =
    hasDuration && state.positionMs > 0
      ? Math.max(0, Math.min(1, state.positionMs / state.durationMs))
      : 0;

  const title = nowPlaying?.title ?? state.title;
  const artist = state.artist;
  const artwork = nowPlaying?.thumbnailPath;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.onMediaSheet,
          borderTopColor: colors.border.subtle,
        },
      ]}
      testID="audio-mini-bar">
      {/* Hairline progress. Hairline width on purpose: this is a
          position readout, not a seek control — seeking happens on the
          full player, and a draggable 2px line would be a control too
          small to hit and too ambiguous about what it does. */}
      <View style={[styles.progressTrack, {backgroundColor: colors.background.seekTrack.empty}]}>
        <View
          style={[
            styles.progressFill,
            {width: `${ratio * 100}%`, backgroundColor: colors.accent.gold},
          ]}
        />
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={onExpand}
          accessibilityRole="button"
          accessibilityLabel={`Open player for ${title}`}
          style={styles.expandTarget}>
          {artwork ? (
            <Image
              source={{uri: artwork}}
              style={[styles.artwork, {backgroundColor: colors.background.elevated}]}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View
              style={[
                styles.artwork,
                styles.artworkEmpty,
                {
                  backgroundColor: colors.background.elevated,
                  borderColor: colors.border.subtle,
                },
              ]}
            />
          )}

          <View style={styles.text}>
            <Text
              style={[styles.title, {color: colors.text.onMediaSoft}]}
              numberOfLines={1}>
              {title}
            </Text>
            {artist ? (
              <Text
                style={[styles.artist, {color: colors.text.onMediaMuted}]}
                numberOfLines={1}>
                {artist}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {/* Siblings of the Pressable, not children: a tap on play must
            not also expand the bar. */}
        <View style={styles.actions}>
          <PlayerControl
            icon={state.isPlaying ? 'pause' : 'play'}
            accessibilityLabel={state.isPlaying ? 'Pause' : 'Play'}
            onPress={commands.togglePlayPause}
            testID="mini-playpause"
          />
          <PlayerControl
            icon="close"
            accessibilityLabel="Close player and stop playback"
            onPress={onClose}
            testID="mini-close"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    // Docked to the bottom of the screen, above whatever screen the user
    // is on. Absolutely positioned on purpose: in normal flow this would
    // be laid out AFTER the navigator, which already fills the screen,
    // and so would sit below the visible area.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.xs,
  },
  progressTrack: {
    height: PROGRESS_HEIGHT,
    width: '100%',
  },
  progressFill: {
    height: PROGRESS_HEIGHT,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  expandTarget: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // 44 tall: the artwork itself is 44, so the row meets the same
    // target floor the artwork does.
    minHeight: ART_SIZE,
  },
  artwork: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: spacing.sm,
  },
  artworkEmpty: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  artist: {
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});