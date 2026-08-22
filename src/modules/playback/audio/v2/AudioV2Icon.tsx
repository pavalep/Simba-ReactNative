import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

export type AudioV2IconName =
  | 'back'
  | 'more'
  | 'play'
  | 'pause'
  | 'previous'
  | 'next'
  | 'rewind'
  | 'forward'
  | 'shuffle'
  | 'repeat'
  | 'queue'
  | 'lyrics'
  | 'playlist'
  | 'bookmark'
  | 'bookmarkFilled'
  | 'heart'
  | 'heartFilled'
  | 'share'
  | 'info'
  | 'close'
  | 'expand'
  | 'volume'
  | 'chevronDown'
  | 'chevronUp';

interface AudioV2IconProps {
  name: AudioV2IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const paths: Record<AudioV2IconName, string> = {
  back: 'M15.5 4.5 8 12l7.5 7.5M9 12h11',
  more: 'M12 5.5h.01M12 12h.01M12 18.5h.01',
  play: 'M9 5.5v13l10-6.5-10-6.5Z',
  pause: 'M8 5v14M16 5v14',
  previous: 'M18 5v14M15.5 12 7 5.5v13L15.5 12Z',
  next: 'M6 5v14M8.5 12l8.5-6.5v13L8.5 12Z',
  rewind: 'M7.5 8.5A6 6 0 1 0 8 16.5M7.5 8.5V4.5M7.5 8.5h4',
  forward: 'M16.5 8.5A6 6 0 1 1 16 16.5M16.5 8.5V4.5M16.5 8.5h-4',
  shuffle: 'm4 7 3-3 10 16 3-3M17 7h3v3M7 17l3-3M17 17h3v-3',
  repeat: 'M6 7h11l-2-2m2 2-2 2M18 17H7l2 2m-2-2 2-2',
  queue: 'M4 6h10M4 11h10M4 16h7M17 14v6M14 17h6',
  lyrics: 'M5 5h14v14H5zM8 9h8M8 13h6M8 17h4',
  playlist: 'M5 6h10M5 11h10M5 16h6M18 13v7M15 17h6',
  bookmark: 'M7 4.5h10v15l-5-3-5 3v-15Z',
  bookmarkFilled: 'M7 4.5h10v15l-5-3-5 3v-15Z',
  heart: 'M20 8.8c0 5.2-8 9.7-8 9.7S4 14 4 8.8A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8 2.8Z',
  heartFilled: 'M20 8.8c0 5.2-8 9.7-8 9.7S4 14 4 8.8A4.3 4.3 0 0 1 12 6a4.3 4.3 0 0 1 8 2.8Z',
  share: 'M12 15V4m0 0 4 4m-4-4L8 8M5 12v7h14v-7',
  info: 'M12 8.5h.01M12 11v5M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
  close: 'm6 6 12 12M18 6 6 18',
  expand: 'm9 4H4v5m11-5h5v5M9 20H4v-5m16 0v5h-5',
  volume: 'M4 10v4h4l5 4V6l-5 4H4Zm12 1a3 3 0 0 1 0 2m2-4a6 6 0 0 1 0 6',
  chevronDown: 'm6 9 6 6 6-6',
  chevronUp: 'm6 15 6-6 6 6',
};

export const AudioV2Icon: React.FC<AudioV2IconProps> = ({
  name,
  size = 24,
  color = '#FFFFFF',
  strokeWidth = 1.8,
}) => {
  const fill = name === 'play' || name === 'bookmarkFilled' || name === 'heartFilled' ? color : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityRole="image">
      {name === 'bookmarkFilled' || name === 'heartFilled' ? (
        <Path d={paths[name]} fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      ) : name === 'more' ? (
        <>
          <Circle cx="12" cy="5.5" r="1.1" fill={color} />
          <Circle cx="12" cy="12" r="1.1" fill={color} />
          <Circle cx="12" cy="18.5" r="1.1" fill={color} />
        </>
      ) : name === 'play' ? (
        <Path d={paths[name]} fill={color} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      ) : name === 'pause' ? (
        <Path d={paths[name]} stroke={color} strokeWidth={strokeWidth + 0.8} strokeLinecap="round" />
      ) : (
        <Path d={paths[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'lyrics' ? <Rect x="5" y="5" width="14" height="14" rx="2" stroke={color} strokeWidth={strokeWidth} /> : null}
    </Svg>
  );
};
