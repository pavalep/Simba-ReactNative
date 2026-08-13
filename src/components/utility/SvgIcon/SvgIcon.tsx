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
import VolumeMuteSvg from '../../../assets/svg/ic_volume_mute.svg';
import SunSvg from '../../../assets/svg/ic_sun.svg';
import InfoSvg from '../../../assets/svg/ic_info.svg';
import ReplaySvg from '../../../assets/svg/ic_replay.svg';
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
import BookmarkSvg from '../../../assets/svg/ic_bookmark.svg';
import BookmarkFilledSvg from '../../../assets/svg/ic_bookmark_filled.svg';
import PictureInPictureSvg from '../../../assets/svg/ic_picture_in_picture.svg';
import SpeedSvg from '../../../assets/svg/ic_speed.svg';
import MoonSvg from '../../../assets/svg/ic_moon.svg';
import GoogleSvg from '../../../assets/svg/ic_google.svg';
import ShareSvg from '../../../assets/svg/ic_share.svg';
import DownloadSvg from '../../../assets/svg/ic_download.svg';
import CheckSvg from '../../../assets/svg/ic_check.svg';
// v7: library rail leading icons (Recently Played / Bookmarks / Followed Podcasts)
import ClockSvg from '../../../assets/svg/ic_clock.svg';
import PodcastRingsSvg from '../../../assets/svg/ic_podcast_rings.svg';

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
  // V6 5.2.1: distinct semantic names for the two transport arrows.
  // Currently aliased to the existing skipBack/skipForward SVGs because
  // the project ships no separate "rewind10" / "prevTrack" assets. A
  // follow-up ticket should ship dedicated 10-second and track icons.
  rewind10: SkipBackSvg,
  forward10: SkipForwardSvg,
  prevTrack: SkipBackSvg,
  nextTrack: SkipForwardSvg,
  shuffle: ShuffleSvg,
  repeat: RepeatSvg,
  volume: VolumeSvg,
  volumeMute: VolumeMuteSvg,
  sun: SunSvg,
  info: InfoSvg,
  replay: ReplaySvg,
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
  bookmark: BookmarkSvg,
  bookmarkFilled: BookmarkFilledSvg,
  pictureInPicture: PictureInPictureSvg,
  speed: SpeedSvg,
  moon: MoonSvg,
  google: GoogleSvg,
  share: ShareSvg,
  download: DownloadSvg,
  check: CheckSvg,
  // v7: library rail leading icons
  clock: ClockSvg,
  podcastRings: PodcastRingsSvg,
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
