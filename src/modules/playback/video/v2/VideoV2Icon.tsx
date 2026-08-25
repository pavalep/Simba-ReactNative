import React from 'react';
import Svg, {Circle, Path, Rect, Text as SvgText} from 'react-native-svg';

export type VideoV2IconName =
  | 'chevronDown'
  | 'chevronUp'
  | 'chevronLeft'
  | 'more'
  | 'play'
  | 'pause'
  | 'previous'
  | 'next'
  | 'rewind'
  | 'forward'
  | 'lock'
  | 'lockOpen'
  | 'subtitles'
  | 'fullscreen'
  | 'pip'
  | 'volume'
  | 'volumeOff'
  | 'close'
  | 'speed'
  | 'repeat'
  | 'shuffle'
  | 'audio'
  | 'info'
  | 'queue'
  | 'playlist'
  | 'share'
  | 'screenshot'
  | 'chapter';

interface VideoV2IconProps {
  name: VideoV2IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const paths: Record<VideoV2IconName, string> = {
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M6 15l6-6 6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  more: 'M12 5.5h.01M12 12h.01M12 18.5h.01',
  play: 'M9 5.5v13l10-6.5-10-6.5Z',
  pause: 'M8 5v14M16 5v14',
  previous: 'M6 5v14M17 5.5 8 12l9 6.5V5.5Z',
  next: 'M18 5v14M7 5.5 16 12l-9 6.5V5.5Z',
  rewind: 'M10 5 3 12l7 7v-4.3L7.5 12 10 9.3V5Zm9 0-7 7 7 7v-4.3L16.5 12 19 9.3V5Z',
  forward: 'M14 5l7 7-7 7v-4.3l2.5-2.7L14 9.3V5ZM5 5l7 7-7 7v-4.3L7.5 12 5 9.3V5Z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  lockOpen: 'M9 11V8a4 4 0 0 1 7.6-1.8M6 11h12v9H6z',
  subtitles: 'M4 6h16v12H4zM7 10h4M13 10h4M7 14h7',
  fullscreen: 'M8 4H4v4M16 4h4v4M8 20H4v-4M20 16v4h-4',
  pip: 'M4 6h16v12H4zM13 13h5v3h-5z',
  volume: 'M4 10v4h4l5 4V6l-5 4H4Zm12 1a3 3 0 0 1 0 2m2-4a6 6 0 0 1 0 6',
  volumeOff: 'M4 10v4h4l5 4V6l-5 4H4Zm13 1-4 4m0-4 4 4',
  close: 'M6 6l12 12M18 6 6 18',
  speed: 'M4 15a8 8 0 1 1 16 0M12 15l4-5',
  repeat: 'M17 2l3 3-3 3M4 5h13a3 3 0 0 1 3 3v1M7 22l-3-3 3-3M20 19H7a3 3 0 0 1-3-3v-1',
  shuffle: 'M16 3h4v4M4 7h3c4 0 6 10 10 10h3M16 21h4v-4M4 17h3c1.6 0 2.9-1 4-2.2',
  audio: 'M5 9v6h3l5 4V5L8 9H5Zm11 2a3 3 0 0 1 0 2m2-4a6 6 0 0 1 0 6',
  info: 'M12 8.5h.01M12 11v5M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
  queue: 'M4 6h10M4 11h10M4 16h7M17 14v6M14 17h6',
  playlist: 'M5 6h10M5 11h10M5 16h6M18 13v7M15 17h6',
  share: 'M12 15V4m0 0 4 4m-4-4L8 8M5 12v7h14v-7',
  screenshot: 'M5 7h3l1-2h6l1 2h3v12H5zM12 10a3 3 0 1 0 0 6 3 3 0 0 0-6Z',
  chapter: 'M5 5h14v14H5zM8 9h8M8 12h5M8 15h3',
};

export const VideoV2Icon: React.FC<VideoV2IconProps> = ({name, size = 24, color = '#FFFFFF', strokeWidth = 2}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityRole="image">
    {name === 'more' ? (
      <>
        <Circle cx="12" cy="5.5" r="1.3" fill={color} />
        <Circle cx="12" cy="12" r="1.3" fill={color} />
        <Circle cx="12" cy="18.5" r="1.3" fill={color} />
      </>
    ) : name === 'play' ? (
      <Path d={paths[name]} fill={color} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    ) : name === 'pause' ? (
      <Path d={paths[name]} stroke={color} strokeWidth={strokeWidth + 0.8} strokeLinecap="round" />
    ) : name === 'rewind' || name === 'forward' ? (
      <>
        <Path d={paths[name]} fill={color} />
        <SvgText x="12" y="14" fill={color} fontSize="4.8" fontWeight="700" textAnchor="middle">10</SvgText>
      </>
    ) : name === 'previous' ? (
      <>
        <Rect x="4.5" y="5" width="2.5" height="14" rx="1.2" fill={color} />
        <Path d="M18 5 8.5 12l9.5 7V5Z" fill={color} />
      </>
    ) : name === 'next' ? (
      <>
        <Path d="M6 5 15.5 12 6 19V5Z" fill={color} />
        <Rect x="17" y="5" width="2.5" height="14" rx="1.2" fill={color} />
      </>
    ) : (
      <Path d={paths[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    )}
  </Svg>
);
