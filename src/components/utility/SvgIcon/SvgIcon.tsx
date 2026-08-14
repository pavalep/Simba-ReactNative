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
// v8: Home category cards — sensible per-category glyphs (Lucide)
import ClapperboardSvg from '../../../assets/svg/ic_clapperboard.svg';
import AwardSvg from '../../../assets/svg/ic_award.svg';
import UnlockSvg from '../../../assets/svg/ic_unlock.svg';
import DramaSvg from '../../../assets/svg/ic_drama.svg';
import SunsetSvg from '../../../assets/svg/ic_sunset.svg';
import RocketSvg from '../../../assets/svg/ic_rocket.svg';
import SmileSvg from '../../../assets/svg/ic_smile.svg';
// v9: Home category cards (music / radio / live TV / audiobooks / podcasts / shows / archive) — Lucide
import TreePalmSvg from '../../../assets/svg/ic_tree_palm.svg';
import ZapSvg from '../../../assets/svg/ic_zap.svg';
import MicVocalSvg from '../../../assets/svg/ic_mic_vocal.svg';
import GuitarSvg from '../../../assets/svg/ic_guitar.svg';
import AudioWaveformSvg from '../../../assets/svg/ic_audio_waveform.svg';
import PianoSvg from '../../../assets/svg/ic_piano.svg';
import WindSvg from '../../../assets/svg/ic_wind.svg';
import Disc3Svg from '../../../assets/svg/ic_disc_3.svg';
import HeartPulseSvg from '../../../assets/svg/ic_heart_pulse.svg';
import BookSvg from '../../../assets/svg/ic_book.svg';
import RadioTowerSvg from '../../../assets/svg/ic_radio_tower.svg';
import FeatherSvg from '../../../assets/svg/ic_feather.svg';
import NewspaperSvg from '../../../assets/svg/ic_newspaper.svg';
import CompassSvg from '../../../assets/svg/ic_compass.svg';
import BookOpenSvg from '../../../assets/svg/ic_book_open.svg';
import PaletteSvg from '../../../assets/svg/ic_palette.svg';
import TvSvg from '../../../assets/svg/ic_tv.svg';
import MegaphoneSvg from '../../../assets/svg/ic_megaphone.svg';
import CpuSvg from '../../../assets/svg/ic_cpu.svg';
import BriefcaseSvg from '../../../assets/svg/ic_briefcase.svg';
import TrophySvg from '../../../assets/svg/ic_trophy.svg';
import ArchiveSvg from '../../../assets/svg/ic_archive.svg';
import FlaskConicalSvg from '../../../assets/svg/ic_flask_conical.svg';
import GraduationCapSvg from '../../../assets/svg/ic_graduation_cap.svg';
import HeartSvg from '../../../assets/svg/ic_heart.svg';
import SparklesSvg from '../../../assets/svg/ic_sparkles.svg';
import HistorySvg from '../../../assets/svg/ic_history.svg';
import FlameSvg from '../../../assets/svg/ic_flame.svg';
import WandSvg from '../../../assets/svg/ic_wand.svg';
import VideoCameraSvg from '../../../assets/svg/ic_video_camera.svg';

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
  // v8: Home category cards — sensible per-category glyphs
  clapperboard: ClapperboardSvg,
  award: AwardSvg,
  unlock: UnlockSvg,
  drama: DramaSvg,
  sunset: SunsetSvg,
  rocket: RocketSvg,
  smile: SmileSvg,
  // v9: Home category cards (music / radio / live TV / audiobooks / podcasts / shows / archive)
  treePalm: TreePalmSvg,
  zap: ZapSvg,
  micVocal: MicVocalSvg,
  guitar: GuitarSvg,
  audioWaveform: AudioWaveformSvg,
  piano: PianoSvg,
  wind: WindSvg,
  disc3: Disc3Svg,
  heartPulse: HeartPulseSvg,
  book: BookSvg,
  radioTower: RadioTowerSvg,
  feather: FeatherSvg,
  newspaper: NewspaperSvg,
  compass: CompassSvg,
  bookOpen: BookOpenSvg,
  palette: PaletteSvg,
  tv: TvSvg,
  megaphone: MegaphoneSvg,
  cpu: CpuSvg,
  briefcase: BriefcaseSvg,
  trophy: TrophySvg,
  archive: ArchiveSvg,
  flaskConical: FlaskConicalSvg,
  graduationCap: GraduationCapSvg,
  heart: HeartSvg,
  sparkles: SparklesSvg,
  history: HistorySvg,
  flame: FlameSvg,
  wand: WandSvg,
  videoCamera: VideoCameraSvg,
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
