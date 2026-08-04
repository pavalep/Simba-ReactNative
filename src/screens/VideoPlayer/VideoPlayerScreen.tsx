import React from 'react';
import {RootStackScreenProps} from '../../navigation/types';
import {useVideoPlayerScreen} from './hooks/useVideoPlayerScreen';
import {VideoPlayer} from '../../components/player/VideoPlayer/VideoPlayer';
import {VideoPlayerSurfaceLayer} from './components/VideoPlayerSurfaceLayer';
import {VideoPlayerTopBar} from './components/VideoPlayerTopBar';
import {PrimaryControls} from './components/PrimaryControls';
import {SecondaryToolbar} from './components/SecondaryToolbar';
import {VideoPlayerSubtitlePanel} from './components/VideoPlayerSubtitlePanel';
import {VideoPlayerAudioPanel} from './components/VideoPlayerAudioPanel';
import {VideoPlayerEqualizerPanel} from './components/VideoPlayerEqualizerPanel';
import {VideoPlayerVolumePanel} from './components/VideoPlayerVolumePanel';
import {VideoPlayerSpeedPanel} from './components/VideoPlayerSpeedPanel';
import {VideoPlayerPlaylistPanel} from './components/VideoPlayerPlaylistPanel';
import {VideoPlayerLoadingOverlay} from './components/VideoPlayerLoadingOverlay';
import {SeekFeedbackOverlay} from './components/SeekFeedbackOverlay';
import {VolumeBrightnessOverlay} from './components/VolumeBrightnessOverlay';

type Props = RootStackScreenProps<'VideoPlayer'>;

const VideoPlayerScreen: React.FC<Props> = ({navigation, route}) => {
  const hookData = useVideoPlayerScreen(navigation, route);

  return (
    <VideoPlayer
      {...hookData}
      VideoPlayerSurfaceLayer={VideoPlayerSurfaceLayer}
      VideoPlayerTopBar={VideoPlayerTopBar}
      PrimaryControls={PrimaryControls}
      SecondaryToolbar={SecondaryToolbar}
      VideoPlayerSubtitlePanel={VideoPlayerSubtitlePanel}
      VideoPlayerAudioPanel={VideoPlayerAudioPanel}
      VideoPlayerEqualizerPanel={VideoPlayerEqualizerPanel}
      VideoPlayerVolumePanel={VideoPlayerVolumePanel}
      VideoPlayerSpeedPanel={VideoPlayerSpeedPanel}
      VideoPlayerPlaylistPanel={VideoPlayerPlaylistPanel}
      VideoPlayerLoadingOverlay={VideoPlayerLoadingOverlay}
      SeekFeedbackOverlay={SeekFeedbackOverlay}
      VolumeBrightnessOverlay={VolumeBrightnessOverlay}
    />
  );
};

export {VideoPlayerScreen};
export default VideoPlayerScreen;
