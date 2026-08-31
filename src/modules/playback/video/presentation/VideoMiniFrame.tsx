import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import {VideoNativeSurface} from '../surface/VideoNativeSurface';

/**
 * v11 T7.2 \u2014 fallback chain for the mini player's 96\u00d754 frame slot.
 *
 * The slot is filled by the first available source, in order:
 *   1. Live surface (`nativePtr > 0`) \u2014 the actual video frame
 *   2. Entry image (`fallbackUri`) \u2014 the entry's `artworkUri` /
 *      poster image, if any
 *   3. Gold placeholder \u2014 a soft gold block with the file's
 *      initial so the slot is never black
 *
 * "Never black" is the spec rule \u2014 a video player that pops a
 * black thumbnail looks broken, especially in the mini where
 * users glance at it for half a second before deciding whether
 * to expand.
 *
 * The frame is wrapped in a `Pressable` by the parent
 * (`VideoMiniCard`); tapping the frame expands the player.
 * Gesture wiring lives in the card, not here, so the frame can
 * be reused if a non-interactive variant is ever needed.
 */
export interface VideoMiniFrameProps {
  /** Active native pointer; when > 0 the live surface is shown. */
  readonly nativePtr: number;
  /** Fallback URI for the entry's poster / artwork image. */
  readonly fallbackUri?: string;
  /** Title used to derive the gold placeholder initial. */
  readonly title: string;
  /** When true, the frame accepts taps (parent mounts a Pressable). */
  readonly tappable?: boolean;
  /** Optional tap handler. */
  readonly onPress?: () => void;
  /** testID for instrumentation. */
  readonly testID?: string;
}

const FRAME_WIDTH = 96;
const FRAME_HEIGHT = 54;
const FRAME_RADIUS = 8;

function titleInitial(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return '\u2756';
  // First grapheme (so CJK, emoji, and accented first letters all work).
  return Array.from(trimmed)[0]?.toUpperCase() ?? '\u2756';
}

export function VideoMiniFrame({
  nativePtr,
  fallbackUri,
  title,
  tappable = false,
  onPress,
  testID,
}: VideoMiniFrameProps) {
  // T7.2 fallback chain:
  //   live surface > entry image > gold placeholder
  let content: React.ReactNode;
  if (nativePtr > 0) {
    content = (
      <VideoNativeSurface
        nativePtr={nativePtr}
        style={styles.frameContent}
      />
    );
  } else if (fallbackUri) {
    content = (
      <Image
        source={{uri: fallbackUri}}
        style={styles.frameContent}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    );
  } else {
    content = (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderInitial} accessibilityElementsHidden>
          {titleInitial(title)}
        </Text>
      </View>
    );
  }

  if (!tappable) {
    return (
      <View
        testID={testID}
        style={styles.frame}
        accessibilityLabel={tappable ? `Expand ${title}` : undefined}
      >
        {content}
      </View>
    );
  }

  return (
    <View testID={testID} style={styles.frame} accessibilityLabel={`Expand ${title}`}>
      {content}
      {/* T7.2: the parent (VideoMiniCard) owns the tap target \u2014 the
          frame itself is a press surface here. The Pressable is
          layered on top so taps anywhere on the 96\u00d754 box expand
          the player. */}
      {onPress ? (
        <View style={StyleSheet.absoluteFill} onTouchEnd={onPress} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: FRAME_RADIUS,
    overflow: 'hidden',
    backgroundColor: cinemaColors.background.elevated,
  },
  frameContent: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  },
  placeholder: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    backgroundColor: cinemaColors.accent.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderInitial: {
    color: cinemaColors.text.bright,
    fontSize: 22,
    fontFamily: FONT_FAMILY.cormorant.bold,
    letterSpacing: 0.5,
  },
});
