/**
 * The audio player's full screen. V20 Phase C.
 *
 * ## What changed, and why
 *
 * Audio used to be launched by opening `PlayerActivity` with
 * `type="audio"`. That Activity mounted no surface — the render view
 * was set GONE — so it was a full-screen window with nothing to show,
 * existing only so its `onCreate` could start the media service.
 *
 * With lib 1.13.0 the service starts without any Activity, so audio
 * has no window at all. This component is what the user actually sees,
 * and it lives in the MainActivity React tree beside the app's screens.
 *
 * ## Every control here either acts or is disabled
 *
 * That is the whole design constraint, and it is why there is no
 * decorative layer:
 *
 *   • Shuffle reads `state.shuffle` (mpv's `playlist-shuffle`, mirrored
 *     by the lib) and can therefore show whether it is on. It was a
 *     command with no readable state until V20 Phase C — a toggle that
 *     cannot show its own state is the "control that may or may not be
 *     the real one" ambiguity.
 *   • Next / Previous are driven by `canGoNext` / `canGoPrev`, which
 *     come from the engine's OWN playlist. Not from `usePlayerStore`:
 *     `useQueueSync` writes a phantom entry with `uri: ''` for
 *     single-file launches (its own comment flags it as a V20 gap), and
 *     a next button pointing at an empty URI is a dead control.
 *   • The seek bar is disabled outright when `durationMs === 0` — a live
 *     stream has no position to seek to.
 *
 * ## Layout provenance
 *
 * Spotify, YouTube Music, Apple Music, Plex and Jellyfin all put
 * artwork first, then title/artist, then a progress line with elapsed
 * and remaining times, then a five-button transport row, with
 * chevron-down top-left. Spotify documents chevron-down as "Minimize".
 * That is the shape below; nothing here is invented.
 *
 * On-media tokens throughout (`onMediaSoft`, `onMediaMuted`, `gold`),
 * because this paints over media and those tokens are deliberately
 * theme-invariant.
 */

import React, {useCallback} from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {
  useTransport,
  type RepeatMode,
} from '../../../../infrastructure/player/useTransport';
import {useNowPlayingStore} from '../../../../state/nowPlayingStore';
import {useAudioPresentationStore} from '../../../../state/useAudioPresentationStore';
import {useToast} from '../../../feedback/Toast';
import {PlayerControl, CONTROL_PRIMARY_TARGET} from '../../video/PlayerControl/PlayerControl';
import {AudioSeekBar} from '../AudioSeekBar/AudioSeekBar';

export interface AudioPlayerProps {
  /** Stop playback and tear down the service. The X verb. */
  readonly onClose: () => void;
}

/** off -> all -> one -> off. Spotify and Apple Music use exactly this
 *  three-state cycle; mpv's own vocabulary is none / playlist / file. */
const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = {
  off: 'all',
  all: 'one',
  one: 'off',
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({onClose}) => {
  const {colors} = useTheme();
  const {width} = useWindowDimensions();
  const toast = useToast();
  const minimize = useAudioPresentationStore(s => s.minimize);
  const nowPlaying = useNowPlayingStore(s => s.current);
  const {state, commands} = useTransport();

  const onSeek = useCallback(
    (positionMs: number) => {
      try {
        commands.seek(positionMs);
      } catch (error) {
        // A refused seek must not be silent — the thumb moved and
        // nothing happened, which reads as a broken player.
        toast.show(
          error instanceof Error ? error.message : 'Could not seek',
          'error',
        );
      }
    },
    [commands, toast],
  );

  const title = nowPlaying?.title ?? state.title;
  // mpv's metadata, not a launch-time guess: an untagged file has no
  // artist, and an empty line of grey text is worse than no line.
  const artist = state.artist;

  const artwork = nowPlaying?.thumbnailPath;
  const artSize = Math.min(width - spacing.xxl * 2, 420);

  return (
    <View style={[styles.root, {backgroundColor: colors.background.onMediaSheet}]}>
      <View style={[styles.topBar, {paddingHorizontal: spacing.lg}]}>
        <PlayerControl
          icon="chevronDown"
          accessibilityLabel="Minimize player"
          accessibilityHint="Collapses the player to the mini bar and keeps playing"
          onPress={minimize}
          testID="audio-minimize"
        />
        <PlayerControl
          icon="close"
          accessibilityLabel="Close player and stop playback"
          onPress={onClose}
          testID="audio-close"
        />
      </View>

      <View style={styles.body}>
        {artwork ? (
          <Image
            source={{uri: artwork}}
            style={[
              styles.artwork,
              {
                width: artSize,
                height: artSize,
                borderRadius: spacing.md,
                backgroundColor: colors.background.elevated,
              },
            ]}
            accessibilityIgnoresInvertColors
          />
        ) : (
          // An honest "no artwork" block. Not a generated gradient, a
          // waveform or a spinning disc — decoration invented to fill a
          // gap is not a state the user is in.
          <View
            style={[
              styles.artwork,
              styles.artworkEmpty,
              {
                width: artSize,
                height: artSize,
                borderRadius: spacing.md,
                backgroundColor: colors.background.elevated,
                borderColor: colors.border.subtle,
              },
            ]}>
            <Text style={[styles.artworkEmptyText, {color: colors.text.onMediaMuted}]}>
              No artwork
            </Text>
          </View>
        )}

        <View style={[styles.meta, {paddingHorizontal: spacing.xl}]}>
          <Text
            style={[styles.title, {color: colors.text.bright}]}
            numberOfLines={2}>
            {title}
          </Text>
          {artist ? (
            <Text
              style={[styles.artist, {color: colors.text.onMediaSoft}]}
              numberOfLines={1}>
              {artist}
            </Text>
          ) : null}
        </View>

        <View style={[styles.seekWrap, {paddingHorizontal: spacing.xl}]}>
          <AudioSeekBar
            positionMs={state.positionMs}
            durationMs={state.durationMs}
            seekable={state.seekable && state.durationMs > 0}
            onSeek={onSeek}
          />
        </View>

        <View style={[styles.transport, {paddingHorizontal: spacing.lg}]}>
          <PlayerControl
            icon="shuffle"
            accessibilityRole="switch"
            accessibilityChecked={state.shuffle}
            accessibilityLabel="Shuffle"
            active={state.shuffle}
            onPress={() => commands.setShuffle(!state.shuffle)}
            testID="audio-shuffle"
          />
          <PlayerControl
            icon="prevTrack"
            accessibilityLabel="Previous track"
            // Disabled, not hidden: a player with a queue still shows the
            // button so the control does not shift, and YouTube Music /
            // Spotify both dim rather than remove it.
            disabled={!state.canGoPrev}
            onPress={commands.previous}
            testID="audio-previous"
          />
          <PlayerControl
            icon={state.isPlaying ? 'pause' : 'play'}
            accessibilityLabel={state.isPlaying ? 'Pause' : 'Play'}
            targetSize={CONTROL_PRIMARY_TARGET}
            filled
            onPress={commands.togglePlayPause}
            testID="audio-playpause"
          />
          <PlayerControl
            icon="nextTrack"
            accessibilityLabel="Next track"
            disabled={!state.canGoNext}
            onPress={commands.next}
            testID="audio-next"
          />
          <PlayerControl
            icon={state.repeatMode === 'one' ? 'repeatOne' : 'repeat'}
            accessibilityRole="switch"
            accessibilityChecked={state.repeatMode !== 'off'}
            accessibilityLabel={`Repeat: ${state.repeatMode}`}
            active={state.repeatMode !== 'off'}
            onPress={() => commands.setRepeatMode(NEXT_REPEAT[state.repeatMode])}
            testID="audio-repeat"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: spacing.xxxl,
  },
  artwork: {
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  artworkEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  artworkEmptyText: {
    fontSize: 13,
  },
  meta: {
    marginTop: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  artist: {
    fontSize: 15,
    marginTop: spacing.xs,
  },
  seekWrap: {
    marginTop: spacing.lg,
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
});