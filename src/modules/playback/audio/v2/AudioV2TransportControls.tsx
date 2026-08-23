import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {AudioV2Button} from './AudioV2Button';
import {AudioV2Icon} from './AudioV2Icon';

interface AudioV2TransportControlsProps {
  isPlaying: boolean;
  isEnded: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRewind: () => void;
  onForward: () => void;
  primary: string;
  secondary: string;
  page: string;
  accent: string;
}

/**
 * Shared transport presentation for the full player.
 * Playback policy stays in the controller; this component only expresses
 * native-confirmed state and routes user intent to named commands.
 */
export const AudioV2TransportControls: React.FC<AudioV2TransportControlsProps> = ({
  isPlaying,
  isEnded,
  isLoading,
  onPlayPause,
  onPrevious,
  onNext,
  onRewind,
  onForward,
  primary,
  secondary,
  page,
  accent,
}) => (
  <View style={styles.row}>
    <AudioV2Button icon="rewind" label="Rewind 10 seconds" onPress={onRewind} color={secondary} size={44} />
    <AudioV2Button icon="previous" label="Previous track" onPress={onPrevious} color={primary} size={44} />
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isLoading ? 'Loading track' : isPlaying ? 'Pause' : isEnded ? 'Play from beginning' : 'Play'}
      accessibilityState={{busy: isLoading}}
      onPress={onPlayPause}
      style={({pressed}) => [styles.primary, {backgroundColor: accent}, pressed && styles.primaryPressed]}>
      {isLoading ? (
        <ActivityIndicator color={page} size="small" />
      ) : (
        <AudioV2Icon name={isPlaying ? 'pause' : 'play'} size={29} color={page} strokeWidth={2.2} />
      )}
    </Pressable>
    <AudioV2Button icon="next" label="Next track" onPress={onNext} color={primary} size={44} />
    <AudioV2Button icon="forward" label="Forward 10 seconds" onPress={onForward} color={secondary} size={44} />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  primary: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 6,
  },
  primaryPressed: {
    transform: [{scale: 0.96}],
    opacity: 0.86,
  },
});
