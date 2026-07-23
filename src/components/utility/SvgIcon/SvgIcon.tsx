import React from 'react';
import {ViewStyle} from 'react-native';
import HomeSvg from '../../../assets/svg/ui_home.svg';
import MusicSvg from '../../../assets/svg/ui_music.svg';
import VideoSvg from '../../../assets/svg/ui_video.svg';
import SettingsSvg from '../../../assets/svg/ui_settings.svg';
import BellSvg from '../../../assets/svg/ui_bell.svg';
import FolderSvg from '../../../assets/svg/ui_folder.svg';
import LionSvg from '../../../assets/svg/ui_lion.svg';
import PlaySvg from '../../../assets/svg/ic_play.svg';

const icons = {
  home: HomeSvg,
  music: MusicSvg,
  video: VideoSvg,
  settings: SettingsSvg,
  bell: BellSvg,
  folder: FolderSvg,
  lion: LionSvg,
  play: PlaySvg,
} as const;

export type SvgIconName = keyof typeof icons;

export interface SvgIconProps {
  name: SvgIconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const SvgIcon: React.FC<SvgIconProps> = ({
  name,
  size = 24,
  color,
  style,
}) => {
  const IconComponent = icons[name];
  return <IconComponent width={size} height={size} color={color} style={style} />;
};
