import React, {useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import type {VideoV2Model} from './VideoV2Types';
import {VideoV2Icon, type VideoV2IconName} from './VideoV2Icon';
import {VideoV2VolumeControl} from './VideoV2VolumeControl';

type Panel = 'speed' | 'audio' | 'captions' | 'captionAppearance' | 'volume' | null;

type VideoV2MoreSheetProps = Pick<VideoV2Model, 'colors' | 'subtitles' | 'audioTracks' | 'chapters' | 'queue' | 'speed' | 'loopMode' | 'shuffle' | 'volume' | 'muted' | 'subtitleFontSize' | 'subtitleOpacity' | 'subtitlePosition' | 'subtitleBgOpacity' | 'activeSubtitle' | 'activeAudioTrack' | 'subtitleVisible' | 'canAddToPlaylist'> & {
  visible: boolean;
  onClose: () => void;
  commands: VideoV2Model['commands'];
  onOpenInfo: () => void;
  onOpenQueue: () => void;
  onOpenPlaylist: () => void;
  onOpenChapters: () => void;
};

type RowProps = {
  icon: VideoV2IconName;
  label: string;
  onPress: () => void;
  color: string;
  secondary: string;
  detail?: string;
  selected?: boolean;
};

const Row: React.FC<RowProps> = ({icon, label, onPress, color, secondary, detail, selected}) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}} onPress={onPress} style={({pressed}) => [styles.row, pressed && styles.pressed]}>
    <VideoV2Icon name={icon} size={21} color={selected ? color : secondary} />
    <Text style={[styles.rowLabel, {color}]}>{label}</Text>
    {detail ? <Text style={[styles.detail, {color: secondary}]}>{detail}</Text> : null}
    {selected ? <Text style={[styles.check, {color}]}>✓</Text> : <Text style={[styles.chevron, {color: secondary}]}>›</Text>}
  </Pressable>
);

const OptionHeader: React.FC<{title: string; onBack: () => void; color: string}> = ({title, onBack, color}) => (
  <View style={styles.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to more actions" onPress={onBack} style={styles.close}>
      <VideoV2Icon name="chevronLeft" size={20} color={color} />
    </Pressable>
    <Text style={[styles.title, {color}]}>{title}</Text>
    <View style={styles.close} />
  </View>
);

export const VideoV2MoreSheet: React.FC<VideoV2MoreSheetProps> = ({colors, subtitles, audioTracks, chapters, queue, speed, loopMode, shuffle, volume, muted, subtitleFontSize, subtitleOpacity, subtitlePosition, subtitleBgOpacity, activeSubtitle, activeAudioTrack, subtitleVisible, canAddToPlaylist, visible, onClose, commands, onOpenInfo, onOpenQueue, onOpenPlaylist, onOpenChapters}) => {
  const [panel, setPanel] = useState<Panel>(null);
  const resetAndClose = () => {
    setPanel(null);
    onClose();
  };
  const choose = (action: () => void) => {
    action();
    resetAndClose();
  };

  const renderPanel = () => {
    if (panel === 'speed') {
      const values = [0.5, 0.75, 1, 1.25, 1.5, 2];
      return <>
        <OptionHeader title="Playback speed" onBack={() => setPanel(null)} color={colors.text.bright} />
        {values.map(value => <Row key={value} icon="speed" label={`${value}×`} onPress={() => choose(() => commands.onSelectSpeed(value))} color={colors.text.bright} secondary={colors.text.secondary} selected={Math.abs(speed - value) < 0.01} />)}
      </>;
    }
    if (panel === 'audio') {
      return <>
        <OptionHeader title="Audio track" onBack={() => setPanel(null)} color={colors.text.bright} />
        {audioTracks.map(track => <Row key={track.id} icon="audio" label={track.title || track.lang || `Track ${track.id}`} detail={track.lang?.toUpperCase()} onPress={() => choose(() => commands.onSelectAudio(track.id))} color={colors.text.bright} secondary={colors.text.secondary} selected={activeAudioTrack === track.id} />)}
      </>;
    }
    if (panel === 'volume') {
      return <><OptionHeader title="Volume" onBack={() => setPanel(null)} color={colors.text.bright} /><VideoV2VolumeControl volume={volume} muted={muted} accent={colors.accent.gold} trackColor={colors.background.highlightStrong} textColor={colors.text.bright} secondaryColor={colors.text.secondary} onChange={commands.onVolumeChange} onToggleMute={commands.onToggleMute} /></>;
    }
    if (panel === 'captionAppearance') {
      return <>
        <OptionHeader title="Subtitle appearance" onBack={() => setPanel('captions')} color={colors.text.bright} />
        <Text style={[styles.subsection, {color: colors.text.secondary}]}>TEXT SIZE</Text>
        {(['small', 'medium', 'large'] as const).map(value => <Row key={value} icon="subtitles" label={value[0].toUpperCase() + value.slice(1)} onPress={() => choose(() => commands.onChangeSubtitleFontSize(value))} color={colors.text.bright} secondary={colors.text.secondary} selected={subtitleFontSize === value} />)}
        <Text style={[styles.subsection, {color: colors.text.secondary}]}>TEXT OPACITY</Text>
        {[0.5, 0.75, 1].map(value => <Row key={value} icon="subtitles" label={`${Math.round(value * 100)}%`} onPress={() => choose(() => commands.onChangeSubtitleOpacity(value))} color={colors.text.bright} secondary={colors.text.secondary} selected={Math.abs(subtitleOpacity - value) < 0.01} />)}
        <Text style={[styles.subsection, {color: colors.text.secondary}]}>BACKGROUND</Text>
        {[0, 0.5, 0.8].map(value => <Row key={value} icon="subtitles" label={value === 0 ? 'None' : `${Math.round(value * 100)}%`} onPress={() => choose(() => commands.onChangeSubtitleBgOpacity(value))} color={colors.text.bright} secondary={colors.text.secondary} selected={Math.abs(subtitleBgOpacity - value) < 0.01} />)}
        <Text style={[styles.subsection, {color: colors.text.secondary}]}>VERTICAL POSITION</Text>
        {[20, 50, 90].map(value => <Row key={value} icon="subtitles" label={value === 20 ? 'Top' : value === 50 ? 'Center' : 'Bottom'} onPress={() => choose(() => commands.onChangeSubtitlePosition(value))} color={colors.text.bright} secondary={colors.text.secondary} selected={subtitlePosition === value} />)}
      </>;
    }
    if (panel === 'captions') {
      return <>
        <OptionHeader title="Captions and subtitles" onBack={() => setPanel(null)} color={colors.text.bright} />
        <Row icon="subtitles" label="Off" onPress={() => choose(() => subtitleVisible && commands.onToggleSubtitles())} color={colors.text.bright} secondary={colors.text.secondary} selected={!subtitleVisible || activeSubtitle === null} />
        <Row icon="subtitles" label="Subtitle appearance" onPress={() => setPanel('captionAppearance')} color={colors.text.bright} secondary={colors.text.secondary} />
        {subtitles.map(track => <Row key={track.id} icon="subtitles" label={track.title || track.lang || `Subtitle ${track.id}`} detail={track.lang?.toUpperCase()} onPress={() => choose(() => { commands.onSelectSubtitle(track.id); if (!subtitleVisible) commands.onToggleSubtitles(); })} color={colors.text.bright} secondary={colors.text.secondary} selected={subtitleVisible && activeSubtitle === track.id} />)}
      </>;
    }
    return <>
      <View style={styles.header}>
        <Text style={[styles.title, {color: colors.text.bright}]}>More</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close more actions" onPress={resetAndClose} style={styles.close}><VideoV2Icon name="close" size={20} color={colors.text.bright} /></Pressable>
      </View>
      <Text style={[styles.section, {color: colors.text.secondary}]}>PLAYBACK</Text>
      <Row icon="speed" label="Playback speed" detail={`${speed.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`} onPress={() => setPanel('speed')} color={colors.text.bright} secondary={colors.text.secondary} />
      <Row icon={muted ? 'volumeOff' : 'volume'} label="Volume" detail={muted ? 'Muted' : `${Math.round(volume)}%`} onPress={() => setPanel('volume')} color={colors.text.bright} secondary={colors.text.secondary} selected={muted} />
      <Row icon="repeat" label="Repeat" detail={loopMode === 'none' ? 'Off' : loopMode === 'file' ? 'One' : 'All'} selected={loopMode !== 'none'} onPress={() => choose(commands.onToggleLoop)} color={colors.text.bright} secondary={colors.text.secondary} />
      {queue.length > 0 || loopMode === 'playlist' ? <Row icon="shuffle" label="Shuffle" detail={shuffle ? 'On' : 'Off'} selected={shuffle} onPress={() => choose(commands.onToggleShuffle)} color={colors.text.bright} secondary={colors.text.secondary} /> : null}
      {audioTracks.length > 0 ? <Row icon="audio" label="Audio track" detail={audioTracks.find(track => track.id === activeAudioTrack)?.lang?.toUpperCase()} onPress={() => setPanel('audio')} color={colors.text.bright} secondary={colors.text.secondary} /> : null}
      <Text style={[styles.section, {color: colors.text.secondary}]}>ACCESSIBILITY</Text>
      {subtitles.length > 0 ? <Row icon="subtitles" label="Captions and subtitles" detail={subtitleVisible ? 'On' : 'Off'} onPress={() => setPanel('captions')} color={colors.text.bright} secondary={colors.text.secondary} /> : null}
      <Text style={[styles.section, {color: colors.text.secondary}]}>NAVIGATION</Text>
      {queue.length > 0 ? <Row icon="queue" label={`Queue (${queue.length})`} onPress={() => choose(onOpenQueue)} color={colors.text.bright} secondary={colors.text.secondary} /> : null}
      {chapters.length > 0 ? <Row icon="chapter" label="Chapters" onPress={() => choose(onOpenChapters)} color={colors.text.bright} secondary={colors.text.secondary} /> : null}
      <Text style={[styles.section, {color: colors.text.secondary}]}>CONTENT</Text>
      <Row icon="info" label="Video information" onPress={() => choose(onOpenInfo)} color={colors.text.bright} secondary={colors.text.secondary} />
      {canAddToPlaylist ? <Row icon="playlist" label="Add to playlist" onPress={() => choose(onOpenPlaylist)} color={colors.text.bright} secondary={colors.text.secondary} /> : null}
      <Row icon="share" label="Share" onPress={() => choose(commands.onShare)} color={colors.text.bright} secondary={colors.text.secondary} />
      <Row icon="screenshot" label="Save screenshot" onPress={() => choose(commands.onScreenshot)} color={colors.text.bright} secondary={colors.text.secondary} />
    </>;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <View style={[styles.backdrop, {backgroundColor: colors.background.scrim}]}>

        <Pressable style={StyleSheet.absoluteFill} onPress={resetAndClose} accessibilityLabel="Close actions" />
        <View style={[styles.sheet, {backgroundColor: colors.background.scrimStrong, borderColor: colors.border.emphasis}]}>{renderPanel()}</View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {flex: 1, justifyContent: 'flex-end'},
  sheet: {borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 26},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10},
  title: {fontSize: 20, fontWeight: '800'},
  close: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center'},
  section: {fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 10, marginBottom: 4},
  subsection: {fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 12, marginBottom: 4},
  row: {minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent'},
  rowLabel: {flex: 1, fontSize: 15, fontWeight: '600'},
  detail: {fontSize: 12, fontWeight: '700'},
  chevron: {fontSize: 24, fontWeight: '300'},
  check: {fontSize: 20, fontWeight: '800'},
  pressed: {opacity: 0.68},
});
