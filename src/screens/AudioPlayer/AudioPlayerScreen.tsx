import React from 'react';
import {AudioPlayer} from '../../components/player/AudioPlayer/AudioPlayer';
import {useAudioPlayerScreen} from './hooks/useAudioPlayerScreen';
import type {RootStackScreenProps} from '../../navigation/types';

type Props = RootStackScreenProps<'AudioPlayer'>;

export const AudioPlayerScreen: React.FC<Props> = ({navigation, route}) => {
  const h = useAudioPlayerScreen(navigation, route);
  return <AudioPlayer {...h} />;
};

export default AudioPlayerScreen;
