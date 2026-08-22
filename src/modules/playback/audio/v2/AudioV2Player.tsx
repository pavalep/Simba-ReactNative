import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {AudioV2Artwork} from './AudioV2Artwork';
import {AudioV2Button} from './AudioV2Button';
import {AudioV2ActionStrip} from './AudioV2ActionStrip';
import {AudioV2Icon} from './AudioV2Icon';
import {AudioV2Progress, AudioV2Volume, formatAudioTime} from './AudioV2Progress';
import type {AudioV2ViewModel} from './AudioV2Types';

interface AudioV2PlayerProps {
  model: AudioV2ViewModel;
}

type Panel = 'queue' | 'lyrics' | 'info' | 'playlist' | 'more' | null;

export const AudioV2Player: React.FC<AudioV2PlayerProps> = ({model}) => {
  const [panel, setPanel] = useState<Panel>(null);
  const [liked, setLiked] = useState(false);
  const {
    colors,
    insets,
    title,
    artist,
    album,
    artworkUri,
    isPlaying,
    isLoading,
    isReady,
    error,
    errorIsPermission,
    position,
    duration,
    volume,
    shuffle,
    repeatMode,
    isBookmarked,
    queueCount,
    playlist,
    currentIndex,
    resumePrompt,
    commands,
  } = model;
  const palette = useMemo(() => ({
    page: colors.background.primary,
    card: colors.background.elevated,
    raised: colors.background.floating,
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    muted: colors.text.tertiary,
    line: colors.border.subtle,
    accent: colors.accent.gold,
    accentWash: colors.accent.goldWash,
    danger: colors.accent.love,
  }), [colors]);
  const status = isLoading ? 'CONNECTING' : isPlaying ? 'PLAYING NOW' : isReady ? 'PAUSED' : 'READY';

  const openShare = async () => {
    try {
      await Share.share({message: `${title}${artist ? ` — ${artist}` : ''}\n${model.fileUri}`});
    } catch {
      Alert.alert('Share unavailable', 'This item could not be shared right now.');
    }
  };

  const openPanel = (next: Exclude<Panel, null>) => setPanel(next);
  const closePanel = () => setPanel(null);
  const playIndex = (index: number) => {
    commands.onPlayIndex(index);
    closePanel();
  };

  return (
    <View style={[styles.root, {backgroundColor: palette.page}]}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, {paddingTop: Math.max(8, insets.top * 0.2)}]}>
          <AudioV2Button icon="back" label="Back to previous screen" onPress={commands.onBack} color={palette.primary} size={46} backgroundColor={palette.card} />
          <View style={styles.topTitle}>
            <Text style={[styles.eyebrow, {color: palette.accent}]}>SIMBA AUDIO</Text>
            <Text style={[styles.nowPlaying, {color: palette.primary}]}>Now playing</Text>
          </View>
          <AudioV2Button icon="more" label="More audio actions" onPress={() => openPanel('more')} color={palette.primary} size={46} backgroundColor={palette.card} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, {paddingBottom: Math.max(36, insets.bottom + 24)}]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, {backgroundColor: isPlaying ? palette.accent : palette.muted}]} />
            <Text style={[styles.status, {color: palette.secondary}]}>{status}</Text>
            {model.sourceLabel ? <View style={[styles.sourceBadge, {backgroundColor: palette.accentWash}]}><Text style={[styles.sourceText, {color: palette.accent}]}>{model.sourceLabel.toUpperCase()}</Text></View> : null}
          </View>

          <View style={[styles.hero, {backgroundColor: palette.card, borderColor: palette.line}]}>
            <View style={[styles.artworkShadow, {shadowColor: palette.accent}]}>
              <AudioV2Artwork uri={artworkUri} title={title} size={Math.min(340, 300)} accent={palette.accent} />
            </View>
            <View style={styles.trackHeader}>
              <View style={styles.trackCopy}>
                <Text style={[styles.title, {color: palette.primary}]} numberOfLines={2}>{title}</Text>
                <Text style={[styles.artist, {color: palette.secondary}]} numberOfLines={1}>{artist}</Text>
                <Text style={[styles.album, {color: palette.muted}]} numberOfLines={1}>{album}</Text>
              </View>
              <AudioV2Button icon={liked ? 'heartFilled' : 'heart'} label={liked ? 'Unlike track' : 'Like track'} onPress={() => setLiked(value => !value)} color={liked ? palette.danger : palette.secondary} size={44} />
            </View>

            <AudioV2Progress position={position} duration={duration} onSeek={commands.onSeek} accent={palette.accent} muted={palette.line} />

            <View style={styles.transportRow}>
              <AudioV2Button icon="rewind" label="Rewind 10 seconds" onPress={commands.onRewind} color={palette.secondary} size={46} />
              <AudioV2Button icon="previous" label="Previous track" onPress={commands.onPrevious} color={palette.primary} size={48} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                accessibilityState={{busy: isLoading}}
                onPress={commands.onPlayPause}
                style={({pressed}) => [styles.playButton, {backgroundColor: palette.accent}, pressed && styles.playPressed]}>
                {isLoading ? <ActivityIndicator color={palette.page} size="small" /> : <AudioV2Icon name={isPlaying ? 'pause' : 'play'} size={34} color={palette.page} strokeWidth={2.2} />}
              </Pressable>
              <AudioV2Button icon="next" label="Next track" onPress={commands.onNext} color={palette.primary} size={48} />
              <AudioV2Button icon="forward" label="Forward 10 seconds" onPress={commands.onForward} color={palette.secondary} size={46} />
            </View>

            <View style={styles.modeRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Toggle shuffle" accessibilityState={{selected: shuffle}} onPress={commands.onToggleShuffle} style={({pressed}) => [styles.modeButton, shuffle && {backgroundColor: palette.accentWash}, pressed && styles.pressed]}>
                <AudioV2Icon name="shuffle" size={19} color={shuffle ? palette.accent : palette.secondary} />
                <Text style={[styles.modeText, {color: shuffle ? palette.accent : palette.secondary}]}>Shuffle</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Toggle repeat" accessibilityState={{selected: repeatMode !== 'off'}} onPress={commands.onToggleRepeat} style={({pressed}) => [styles.modeButton, repeatMode !== 'off' && {backgroundColor: palette.accentWash}, pressed && styles.pressed]}>
                <AudioV2Icon name="repeat" size={19} color={repeatMode !== 'off' ? palette.accent : palette.secondary} />
                <Text style={[styles.modeText, {color: repeatMode !== 'off' ? palette.accent : palette.secondary}]}>{repeatMode === 'one' ? 'Repeat one' : 'Repeat'}</Text>
              </Pressable>
            </View>

            <AudioV2Volume
              volume={volume}
              onChange={commands.onVolumeChange}
              accent={palette.accent}
              muted={palette.line}
              icon={<AudioV2Icon name="volume" size={20} color={palette.secondary} />}
            />

            <AudioV2ActionStrip
              colors={{primary: palette.primary, secondary: palette.secondary, border: palette.line, accent: palette.accent}}
              isBookmarked={isBookmarked}
              onBookmark={commands.onBookmark}
              onPlaylist={() => openPanel('playlist')}
              onQueue={() => openPanel('queue')}
              onLyrics={() => openPanel('lyrics')}
              onInfo={() => openPanel('info')}
              onShare={openShare}
              onMore={() => openPanel('more')}
            />
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Open play queue" onPress={() => openPanel('queue')} style={({pressed}) => [styles.upNext, {backgroundColor: palette.card, borderColor: palette.line}, pressed && styles.pressed]}>
            <View style={[styles.queueGlyph, {backgroundColor: palette.accentWash}]}><AudioV2Icon name="queue" size={22} color={palette.accent} /></View>
            <View style={styles.upNextCopy}>
              <Text style={[styles.upNextLabel, {color: palette.accent}]}>UP NEXT</Text>
              <Text style={[styles.upNextTitle, {color: palette.primary}]}>{queueCount > 0 ? `${queueCount} item${queueCount === 1 ? '' : 's'} in your queue` : 'Your queue is empty'}</Text>
              <Text style={[styles.upNextMeta, {color: palette.muted}]}>{playlist.length > 0 ? `Track ${Math.min(currentIndex + 1, playlist.length)} of ${playlist.length}` : 'Add tracks from any audio section'}</Text>
            </View>
            <AudioV2Icon name="chevronDown" size={21} color={palette.secondary} />
          </Pressable>

          {error ? (
            <View style={[styles.errorCard, {backgroundColor: palette.card, borderColor: palette.danger}]}>
              <Text style={[styles.errorTitle, {color: palette.primary}]}>Playback needs attention</Text>
              <Text style={[styles.errorMessage, {color: palette.secondary}]}>{error}</Text>
              {errorIsPermission ? <Text style={[styles.errorHint, {color: palette.muted}]}>Check local-file permission, then try again.</Text> : null}
              <Pressable accessibilityRole="button" accessibilityLabel="Retry playback" onPress={commands.onRetry} style={[styles.retryButton, {backgroundColor: palette.accent}]}><Text style={[styles.retryText, {color: palette.page}]}>Try again</Text></Pressable>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {resumePrompt ? (
        <View style={styles.resumeLayer}>
          <View style={[styles.resumeCard, {backgroundColor: palette.raised, borderColor: palette.line}]}>
            <Text style={[styles.resumeEyebrow, {color: palette.accent}]}>CONTINUE LISTENING?</Text>
            <Text style={[styles.resumeTitle, {color: palette.primary}]}>{formatAudioTime(resumePrompt.position)} played</Text>
            <Text style={[styles.resumeBody, {color: palette.secondary}]}>Pick up where you stopped or begin this track again.</Text>
            <View style={styles.resumeActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Start track over" onPress={() => commands.onResumeChoice(false)} style={[styles.resumeSecondary, {borderColor: palette.line}]}><Text style={[styles.resumeSecondaryText, {color: palette.primary}]}>Start over</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Resume track" onPress={() => commands.onResumeChoice(true)} style={[styles.resumePrimary, {backgroundColor: palette.accent}]}><Text style={[styles.resumePrimaryText, {color: palette.page}]}>Resume</Text></Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <AudioV2Panel panel={panel} model={model} palette={palette} onClose={closePanel} onPlayIndex={playIndex} onShare={openShare} />
    </View>
  );
};

interface AudioV2PanelProps {
  panel: Panel;
  model: AudioV2ViewModel;
  palette: {page: string; card: string; raised: string; primary: string; secondary: string; muted: string; line: string; accent: string; accentWash: string; danger: string};
  onClose: () => void;
  onPlayIndex: (index: number) => void;
  onShare: () => void;
}

const AudioV2Panel: React.FC<AudioV2PanelProps> = ({panel, model, palette, onClose, onPlayIndex, onShare}) => {
  if (!panel) return null;
  const title = panel === 'queue' ? 'Play queue' : panel === 'lyrics' ? 'Lyrics' : panel === 'info' ? 'Track details' : panel === 'playlist' ? 'Add to playlist' : 'More actions';
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <View style={[styles.panel, {backgroundColor: palette.raised, borderColor: palette.line}]}>
          <View style={styles.panelHandle} />
          <View style={styles.panelHeader}>
            <View><Text style={[styles.panelEyebrow, {color: palette.accent}]}>AUDIO CONTROL</Text><Text style={[styles.panelTitle, {color: palette.primary}]}>{title}</Text></View>
            <AudioV2Button icon="close" label="Close panel" onPress={onClose} color={palette.primary} backgroundColor={palette.card} size={42} />
          </View>
          {panel === 'queue' ? <QueuePanel model={model} palette={palette} onPlayIndex={onPlayIndex} /> : null}
          {panel === 'lyrics' ? <LyricsPanel model={model} palette={palette} /> : null}
          {panel === 'info' ? <InfoPanel model={model} palette={palette} /> : null}
          {panel === 'playlist' ? <PlaylistPanel model={model} palette={palette} /> : null}
          {panel === 'more' ? <MorePanel model={model} palette={palette} onShare={onShare} /> : null}
        </View>
      </View>
    </Modal>
  );
};

const QueuePanel: React.FC<{model: AudioV2ViewModel; palette: AudioV2PanelProps['palette']; onPlayIndex: (index: number) => void}> = ({model, palette, onPlayIndex}) => (
  <FlatList
    data={model.queue}
    keyExtractor={item => item.uri}
    ListEmptyComponent={<Text style={[styles.emptyPanel, {color: palette.secondary}]}>Your queue is empty. Add an item from a player or content page.</Text>}
    renderItem={({item, index}) => (
      <Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.title || 'audio item'}`} onPress={() => model.commands.onPlayQueueIndex(index)} style={({pressed}) => [styles.listRow, item.uri === model.fileUri && {backgroundColor: palette.accentWash}, pressed && styles.pressed]}>
        <AudioV2Artwork uri={item.artworkUri || ''} title={item.title || 'Audio'} size={52} accent={palette.accent} borderRadius={14} />
        <View style={styles.listCopy}><Text numberOfLines={1} style={[styles.listTitle, {color: palette.primary}]}>{item.title || 'Untitled audio'}</Text><Text numberOfLines={1} style={[styles.listMeta, {color: palette.secondary}]}>{item.artist || item.source || 'Audio'}</Text></View>
        {item.uri === model.fileUri ? <View style={[styles.nowDot, {backgroundColor: palette.accent}]} /> : <AudioV2Icon name="play" size={19} color={palette.secondary} />}
      </Pressable>
    )}
  />
);

const LyricsPanel: React.FC<{model: AudioV2ViewModel; palette: AudioV2PanelProps['palette']}> = ({model, palette}) => (
  <ScrollView contentContainerStyle={styles.panelScroll}>
    {model.lyrics.length ? model.lyrics.map((line, index) => <Pressable key={`${line.time}-${index}`} accessibilityRole="button" accessibilityLabel={`Seek to ${line.text}`} onPress={() => model.commands.onSeekToLyric(line.time)} style={styles.lyricLine}><Text style={[styles.lyricText, {color: palette.primary}]}>{line.text}</Text></Pressable>) : <Text style={[styles.emptyPanel, {color: palette.secondary}]}>Lyrics are not available for this track yet.</Text>}
  </ScrollView>
);

const InfoPanel: React.FC<{model: AudioV2ViewModel; palette: AudioV2PanelProps['palette']}> = ({model, palette}) => (
  <ScrollView contentContainerStyle={styles.panelScroll}>
    <View style={[styles.detailArtwork, {backgroundColor: palette.card}]}><AudioV2Artwork uri={model.artworkUri} title={model.title} size={112} accent={palette.accent} borderRadius={18} /><View style={styles.detailCopy}><Text style={[styles.detailTitle, {color: palette.primary}]}>{model.title}</Text><Text style={[styles.detailMeta, {color: palette.secondary}]}>{model.artist}</Text><Text style={[styles.detailMeta, {color: palette.muted}]}>{model.album}</Text></View></View>
    <DetailRow label="Source" value={model.sourceLabel || 'Audio'} palette={palette} />
    <DetailRow label="Length" value={model.duration > 0 ? formatAudioTime(model.duration) : 'Live / unknown'} palette={palette} />
    <DetailRow label="Position" value={formatAudioTime(model.position)} palette={palette} />
    <DetailRow label="Queue" value={`${model.queueCount} item${model.queueCount === 1 ? '' : 's'}`} palette={palette} />
  </ScrollView>
);

const DetailRow: React.FC<{label: string; value: string; palette: AudioV2PanelProps['palette']}> = ({label, value, palette}) => <View style={[styles.detailRow, {borderBottomColor: palette.line}]}><Text style={[styles.detailLabel, {color: palette.muted}]}>{label}</Text><Text style={[styles.detailValue, {color: palette.primary}]}>{value}</Text></View>;

const PlaylistPanel: React.FC<{model: AudioV2ViewModel; palette: AudioV2PanelProps['palette']}> = ({model, palette}) => (
  <View>
    <Text style={[styles.emptyPanel, {color: palette.secondary}]}>Choose a saved audio playlist, or play one of the items already in the current playlist.</Text>
    {model.playlist.length > 0 ? model.playlist.map((item, index) => (
      <Pressable key={item.uri} accessibilityRole="button" accessibilityLabel={`Play ${item.title || 'audio item'}`} onPress={() => model.commands.onPlayIndex(index)} style={({pressed}) => [styles.listRow, pressed && styles.pressed]}>
        <AudioV2Artwork uri={item.artworkUri || ''} title={item.title || 'Audio'} size={48} accent={palette.accent} borderRadius={13} />
        <View style={styles.listCopy}><Text numberOfLines={1} style={[styles.listTitle, {color: palette.primary}]}>{item.title || 'Untitled audio'}</Text><Text numberOfLines={1} style={[styles.listMeta, {color: palette.secondary}]}>{item.artist || item.source || 'Audio'}</Text></View>
        <AudioV2Icon name="play" size={18} color={palette.secondary} />
      </Pressable>
    )) : null}
    <Pressable accessibilityRole="button" accessibilityLabel="Open playlist manager" onPress={model.commands.onOpenPlaylist} style={[styles.fullButton, {backgroundColor: palette.accent}]}><Text style={[styles.fullButtonText, {color: palette.page}]}>Manage playlists</Text></Pressable>
  </View>
);

const MorePanel: React.FC<{model: AudioV2ViewModel; palette: AudioV2PanelProps['palette']; onShare: () => void}> = ({model, palette, onShare}) => {
  const actions = [
    {label: 'Share this track', icon: 'share' as const, onPress: onShare},
    {label: 'Save a bookmark here', icon: 'bookmark' as const, onPress: model.commands.onBookmark},
    {label: 'Open track information', icon: 'info' as const, onPress: model.commands.onOpenInfo},
    {label: 'Open the queue', icon: 'queue' as const, onPress: model.commands.onOpenQueue},
  ];
  return <View>{actions.map(action => <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioV2Icon name={action.icon} size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>{action.label}</Text><AudioV2Icon name="chevronDown" size={18} color={palette.muted} /></Pressable>)}</View>;
};

const styles = StyleSheet.create({
  root: {flex: 1},
  safe: {flex: 1},
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12},
  topTitle: {alignItems: 'center'},
  eyebrow: {fontSize: 10, fontWeight: '800', letterSpacing: 1.8},
  nowPlaying: {fontSize: 19, fontWeight: '700', marginTop: 2},
  content: {paddingHorizontal: 18, paddingTop: 4},
  statusRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14},
  statusDot: {width: 8, height: 8, borderRadius: 4},
  status: {fontSize: 11, fontWeight: '700', letterSpacing: 1.4},
  sourceBadge: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 4},
  sourceText: {fontSize: 9, fontWeight: '800', letterSpacing: 1},
  hero: {borderWidth: StyleSheet.hairlineWidth, borderRadius: 30, padding: 16},
  artworkShadow: {alignSelf: 'center', borderRadius: 28, shadowOpacity: 0.24, shadowRadius: 24, shadowOffset: {width: 0, height: 12}, elevation: 12},
  trackHeader: {flexDirection: 'row', alignItems: 'center', marginTop: 18},
  trackCopy: {flex: 1, paddingRight: 8},
  title: {fontSize: 24, lineHeight: 29, fontWeight: '800'},
  artist: {fontSize: 15, fontWeight: '600', marginTop: 7},
  album: {fontSize: 13, marginTop: 4},
  transportRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20},
  playButton: {width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: {width: 0, height: 5}, elevation: 7},
  playPressed: {transform: [{scale: 0.94}], opacity: 0.85},
  modeRow: {flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 18},
  modeButton: {flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18},
  modeText: {fontSize: 12, fontWeight: '600'},
  pressed: {opacity: 0.68},
  upNext: {flexDirection: 'row', alignItems: 'center', marginTop: 14, padding: 15, borderWidth: StyleSheet.hairlineWidth, borderRadius: 22},
  queueGlyph: {width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center'},
  upNextCopy: {flex: 1, marginLeft: 12},
  upNextLabel: {fontSize: 10, fontWeight: '800', letterSpacing: 1.5},
  upNextTitle: {fontSize: 15, fontWeight: '700', marginTop: 4},
  upNextMeta: {fontSize: 12, marginTop: 3},
  errorCard: {marginTop: 14, padding: 16, borderWidth: 1, borderRadius: 18},
  errorTitle: {fontSize: 16, fontWeight: '800'},
  errorMessage: {fontSize: 13, lineHeight: 19, marginTop: 8},
  errorHint: {fontSize: 12, marginTop: 7},
  retryButton: {alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16, marginTop: 14},
  retryText: {fontSize: 13, fontWeight: '800'},
  resumeLayer: {position: 'absolute', left: 18, right: 18, top: '35%', zIndex: 20},
  resumeCard: {padding: 20, borderWidth: 1, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: {width: 0, height: 10}, elevation: 14},
  resumeEyebrow: {fontSize: 11, fontWeight: '800', letterSpacing: 1.5},
  resumeTitle: {fontSize: 22, fontWeight: '800', marginTop: 8},
  resumeBody: {fontSize: 14, lineHeight: 20, marginTop: 7},
  resumeActions: {flexDirection: 'row', gap: 10, marginTop: 18},
  resumeSecondary: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderWidth: 1, borderRadius: 15},
  resumePrimary: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 15},
  resumeSecondaryText: {fontSize: 13, fontWeight: '700'},
  resumePrimaryText: {fontSize: 13, fontWeight: '800'},
  modalScrim: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)'},
  panel: {maxHeight: '82%', minHeight: '34%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18},
  panelHandle: {alignSelf: 'center', width: 44, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 12},
  panelHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  panelEyebrow: {fontSize: 10, fontWeight: '800', letterSpacing: 1.5},
  panelTitle: {fontSize: 23, fontWeight: '800', marginTop: 3},
  panelScroll: {paddingBottom: 22},
  emptyPanel: {fontSize: 15, lineHeight: 22, paddingVertical: 24},
  listRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 16},
  listCopy: {flex: 1, marginLeft: 12, paddingRight: 8},
  listTitle: {fontSize: 15, fontWeight: '700'},
  listMeta: {fontSize: 12, marginTop: 4},
  nowDot: {width: 9, height: 9, borderRadius: 5, marginRight: 4},
  lyricLine: {paddingVertical: 13, paddingHorizontal: 8},
  lyricText: {fontSize: 20, lineHeight: 28, fontWeight: '700'},
  detailArtwork: {flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18},
  detailCopy: {flex: 1, marginLeft: 14},
  detailTitle: {fontSize: 17, lineHeight: 22, fontWeight: '800'},
  detailMeta: {fontSize: 13, marginTop: 5},
  detailRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth},
  detailLabel: {fontSize: 13},
  detailValue: {fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right'},
  fullButton: {alignItems: 'center', paddingVertical: 14, borderRadius: 16, marginBottom: 18},
  fullButtonText: {fontSize: 14, fontWeight: '800'},
  moreRow: {flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 16, paddingHorizontal: 8},
  moreText: {flex: 1, fontSize: 15, fontWeight: '700'},
});
