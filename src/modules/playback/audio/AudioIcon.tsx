import React from 'react';
import Svg, {Circle, Path, Rect, Text as SvgText} from 'react-native-svg';

export type AudioIconName =
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
  | 'playOnce'
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

interface AudioIconProps {
  name: AudioIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const paths: Record<AudioIconName, string> = {
  back: 'M15.5 4.5 8 12l7.5 7.5M9 12h11',
  more: 'M12 5.5h.01M12 12h.01M12 18.5h.01',
  play: 'M9 5.5v13l10-6.5-10-6.5Z',
  pause: 'M8 5v14M16 5v14',
  previous: 'M6 5v14M15 5.5 7 12l8 6.5V5.5Z',
  next: 'M18 5v14M9 5.5 17 12l-8 6.5V5.5Z',
  rewind: 'M10.5 5 3.5 12l7 7v-4.25L7.75 12l2.75-2.75V5Zm9 0-7 7 7 7v-4.25L16.75 12l2.75-2.75V5Z',
  forward: 'M13.5 5 20.5 12l-7 7v-4.25L16.25 12 13.5 9.25V5Zm-9 0 7 7-7 7v-4.25L7.25 12 4.5 9.25V5Z',
  shuffle: 'M4 7h3l10 10h3v-2.5h-2L8.5 4H4v3Zm0 10h4l3-3-1.8-1.8L7 15H4v2Zm12.5-3.5L18 12l-1.5-1.5L15 12l1.5 1.5ZM17 7h3v3l-3-3Zm0 10h3v-3l-3 3Z',
  repeat: 'M5 7h12l-2.5-2.5M19 7l-2 2m2 8H7l2.5 2.5M5 17l2-2',
  playOnce: 'M12 4.5a7.5 7.5 0 1 0 7.5 7.5M12 4.5v3M12 4.5h3M12 8v8m-2 0h4',
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

export const AudioIcon: React.FC<AudioIconProps> = ({
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
      ) : name === 'rewind' || name === 'forward' ? (
        <>
          <Path d={paths[name]} fill={color} />
          <SvgText x="12" y="14" fill={color} fontSize="4.8" fontWeight="700" textAnchor="middle">10</SvgText>
        </>
      ) : name === 'shuffle' || name === 'repeat' ? (
        <Path d={paths[name]} stroke={color} strokeWidth={Math.max(strokeWidth, 2.2)} strokeLinecap="round" strokeLinejoin="round" />
      ) : name === 'previous' ? (
        <>
          <Rect x="5" y="5" width="2.4" height="14" rx="1.2" fill={color} />
          <Path d="M17.5 5.25 8.25 12l9.25 6.75V5.25Z" fill={color} />
        </>
      ) : name === 'next' ? (
        <>
          <Path d="M6.5 5.25 15.75 12 6.5 18.75V5.25Z" fill={color} />
          <Rect x="16.6" y="5" width="2.4" height="14" rx="1.2" fill={color} />
        </>
      ) : (
        <Path d={paths[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {name === 'lyrics' ? <Rect x="5" y="5" width="14" height="14" rx="2" stroke={color} strokeWidth={strokeWidth} /> : null}
    </Svg>
  );
};
