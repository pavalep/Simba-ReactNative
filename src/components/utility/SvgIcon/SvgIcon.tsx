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
import PauseSvg from '../../../assets/svg/ic_pause.svg';
import SkipBackSvg from '../../../assets/svg/ic_skip_back.svg';
import SkipForwardSvg from '../../../assets/svg/ic_skip_forward.svg';
import ShuffleSvg from '../../../assets/svg/ic_shuffle.svg';
import RepeatSvg from '../../../assets/svg/ic_repeat.svg';
import VolumeSvg from '../../../assets/svg/ic_volume.svg';
import SubtitlesSvg from '../../../assets/svg/ic_subtitles.svg';
import HeadphonesSvg from '../../../assets/svg/ic_headphones.svg';
import SlidersSvg from '../../../assets/svg/ic_sliders.svg';
import ListMusicSvg from '../../../assets/svg/ic_list_music.svg';
import ListSvg from '../../../assets/svg/ic_list.svg';
import CameraSvg from '../../../assets/svg/ic_camera.svg';
import MaximizeSvg from '../../../assets/svg/ic_maximize.svg';
import ChevronUpSvg from '../../../assets/svg/ic_chevron_up.svg';
import ChevronDownSvg from '../../../assets/svg/ic_chevron_down.svg';
import ChevronRightSvg from '../../../assets/svg/ic_chevron_right.svg';
import CloseSvg from '../../../assets/svg/ic_close.svg';
import SearchSvg from '../../../assets/svg/ic_search.svg';
import LayoutGridSvg from '../../../assets/svg/ic_layout_grid.svg';
import LayoutListSvg from '../../../assets/svg/ic_layout_list.svg';
import FolderFillSvg from '../../../assets/svg/ic_folder.svg';
import AlertCircleSvg from '../../../assets/svg/ic_alert_circle.svg';

const icons = {
  home: HomeSvg,
  music: MusicSvg,
  video: VideoSvg,
  settings: SettingsSvg,
  bell: BellSvg,
  folder: FolderSvg,
  lion: LionSvg,
  play: PlaySvg,
  pause: PauseSvg,
  skipBack: SkipBackSvg,
  skipForward: SkipForwardSvg,
  shuffle: ShuffleSvg,
  repeat: RepeatSvg,
  volume: VolumeSvg,
  subtitles: SubtitlesSvg,
  headphones: HeadphonesSvg,
  sliders: SlidersSvg,
  listMusic: ListMusicSvg,
  list: ListSvg,
  camera: CameraSvg,
  maximize: MaximizeSvg,
  chevronUp: ChevronUpSvg,
  chevronDown: ChevronDownSvg,
  chevronRight: ChevronRightSvg,
  close: CloseSvg,
  search: SearchSvg,
  layoutGrid: LayoutGridSvg,
  layoutList: LayoutListSvg,
  folderFill: FolderFillSvg,
  alertCircle: AlertCircleSvg,
} as const;

export type SvgIconName = keyof typeof icons;
/** Alias matching the spec's IconName type */
export type IconName = SvgIconName;

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
