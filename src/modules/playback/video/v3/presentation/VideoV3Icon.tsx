import React from 'react';
import Svg, {Circle, Line, Path, Rect} from 'react-native-svg';
import {darkColors as cinemaColors} from '../../../../../theme/tokens';

export type VideoV3IconName =
  | 'back'
  | 'more'
  | 'play'
  | 'pause'
  | 'rewind'
  | 'forward'
  | 'previous'
  | 'next'
  | 'captions'
  | 'expand'
  | 'collapse'
  | 'close'
  | 'lock'
  | 'unlock'
  | 'volume'
  | 'mute';

export interface VideoV3IconProps {
  readonly name: VideoV3IconName;
  readonly size?: number;
  readonly color?: string;
  readonly strokeWidth?: number;
}

export function VideoV3Icon({
  name,
  size = 24,
  color = cinemaColors.text.bright,
  strokeWidth = 1.9,
}: VideoV3IconProps) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'play':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M8 5.2v13.6L19 12 8 5.2Z" fill={color} stroke={color} strokeWidth={1.2} strokeLinejoin="round" /></Svg>;
    case 'pause':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="6.5" y="5" width="4" height="14" rx="1" fill={color} /><Rect x="13.5" y="5" width="4" height="14" rx="1" fill={color} /></Svg>;
    case 'back':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="m14.8 5.5-6.5 6.5 6.5 6.5" {...common} /></Svg>;
    case 'more':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="5" cy="12" r="1.5" fill={color} /><Circle cx="12" cy="12" r="1.5" fill={color} /><Circle cx="19" cy="12" r="1.5" fill={color} /></Svg>;
    case 'rewind':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M11 7 4.8 12 11 17" {...common} /><Path d="m18.7 7-6.2 5 6.2 5" {...common} /></Svg>;
    case 'forward':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="m13 7 6.2 5-6.2 5" {...common} /><Path d="m5.3 7 6.2 5-6.2 5" {...common} /></Svg>;
    case 'previous':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Line x1="6" y1="5" x2="6" y2="19" {...common} /><Path d="m18 6-8 6 8 6V6Z" fill={color} stroke={color} strokeWidth={1.2} /></Svg>;
    case 'next':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="m6 6 8 6-8 6V6Z" fill={color} stroke={color} strokeWidth={1.2} /><Line x1="18" y1="5" x2="18" y2="19" {...common} /></Svg>;
    case 'captions':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="3.5" y="6" width="17" height="12" rx="2" {...common} /><Path d="M7 11.2h3.4M7 14.4h2.2M13.6 11.2H17M13.6 14.4h3.4" {...common} /></Svg>;
    case 'expand':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M8.5 5H5v3.5M15.5 5H19v3.5M8.5 19H5v-3.5M15.5 19H19v-3.5" {...common} /></Svg>;
    case 'collapse':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 5v4H5M15 5v4h4M9 19v-4H5M15 19v-4h4" {...common} /></Svg>;
    case 'close':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="m6.5 6.5 11 11M17.5 6.5l-11 11" {...common} /></Svg>;
    case 'lock':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="5.5" y="10" width="13" height="9" rx="2" {...common} /><Path d="M8 10V7.8a4 4 0 0 1 8 0V10" {...common} /></Svg>;
    case 'unlock':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x="5.5" y="10" width="13" height="9" rx="2" {...common} /><Path d="M8 10V7.8a4 4 0 0 1 7-2.5" {...common} /></Svg>;
    case 'volume':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 10h3l4-3.5v11L7 14H4v-4Z" {...common} /><Path d="M15 9a4.2 4.2 0 0 1 0 6M17.2 6.8a7.3 7.3 0 0 1 0 10.4" {...common} /></Svg>;
    case 'mute':
      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4 10h3l4-3.5v11L7 14H4v-4Z" {...common} /><Path d="m16 9 5 6M21 9l-5 6" {...common} /></Svg>;
  }
}
