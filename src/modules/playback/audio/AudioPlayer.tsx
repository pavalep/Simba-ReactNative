import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../../../store';
import {
  setSleepTimer as setSleepTimerAction,
  setSleepTimerMode as setSleepTimerModeAction,
  setPlaybackSpeed,
  toggleLike,
} from '../../../store/slices/playerSlice';
import {FilterSheet} from '../../../components/sheets/FilterSheet/FilterSheet';
import {AudioArtwork} from './AudioArtwork';
import {AudioButton} from './AudioButton';
import {AudioPriorityActions} from './AudioPriorityActions';
import {AudioOutputControl} from './AudioOutputControl';
import {AudioIcon} from './AudioIcon';
import {AudioProgress, formatAudioTime} from './AudioProgress';
import {AudioTransportControls} from './AudioTransportControls';
import type {AudioViewModel} from './AudioTypes';

interface AudioPlayerProps {
  model: AudioViewModel;
  /** W5.8: opens the settings-level Equalizer screen. The
   *  AudioModule wires this to `useNavigation().navigate(...)`. */
  onOpenEqualizer?: () => void;
}

type Panel = 'queue' | 'lyrics' | 'info' | 'playlist' | 'more' | 'speed' | 'chapters' | null;

export const AudioPlayer: React.FC<AudioPlayerProps> = ({model, onOpenEqualizer}) => {
  const [panel, setPanel] = useState<Panel>(null);
  // A19: "like" now lives in Redux (player.liked[fileUri]) so the flag
  // survives remount and is shared across instances. Replaces the
  // ephemeral `useState` that reset on every remount.
  const dispatch = useAppDispatch();
  const liked = useAppSelector(state => !!state.player.liked[model.fileUri ?? '']);
  // A3: pull the current sleep-timer arm state from Redux. The
  // TransportContext already counts down and pauses when the timer
  // expires; the UI here just needs to render the choices and let the
  // user arm / disarm.
  const sleepTimerEndTime = useAppSelector(state => state.player.sleepTimerEndTime);
  const sleepTimerMode = useAppSelector(state => state.player.sleepTimerMode);
  const armSleepCountdown = (minutes: number) => {
    dispatch(setSleepTimerAction(minutes * 60));
  };
  const armSleepEndOfTrack = () => {
    // Mode-based expiry clears any in-flight countdown.
    dispatch(setSleepTimerModeAction('track'));
  };
  // A15: playback speed. The Redux `playbackSpeed` is already applied
  // to the native player by `useAudioPlayerScreen` (line 285). The
  // picker just dispatches `setPlaybackSpeed` and the effect re-applies.
  const playbackSpeed = useAppSelector(state => state.player.playbackSpeed) ?? 1;
  const handleSpeedChange = (_groupId: string, keys: string[]) => {
    const next = Number(keys[0]);
    if (Number.isFinite(next) && next > 0) {
      dispatch(setPlaybackSpeed(next));
      setPanel(null);
    }
  };
  const speedSheetGroups = [
    {
      id: 'speed',
      title: 'Speed',
      multiSelect: false,
      rows: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(value => ({
        key: String(value),
        label: `${value}×`,
      })),
    },
  ];
  const speedSheetValue = {speed: [String(playbackSpeed)]};

  // A16: chapter display. The model has `chapters` (parsed from the
  // .lrc / chapter-list); we surface a "current chapter" label under
  // the progress bar and a "Chapters" row in the MorePanel that opens
  // a list sheet. Tapping a chapter seeks to its startTime via the
  // existing `commands.onSeek` handler.
  const chapters = model.chapters;
  const currentChapter = chapters.find(
    chapter => position >= chapter.startTime && position < chapter.endTime,
  );
  const chapterSheetGroups = [
    {
      id: 'chapter',
      title: 'Chapters',
      multiSelect: false,
      rows: chapters.map((chapter, index) => ({
        key: String(chapter.startTime),
        label: `${chapter.title || `Chapter ${index + 1}`} · ${formatAudioTime(chapter.startTime)}`,
      })),
    },
  ];
  const chapterSheetValue = currentChapter
    ? {chapter: [String(currentChapter.startTime)]}
    : {chapter: []};
  const handleChapterSelect = (_groupId: string, keys: string[]) => {
    const raw = keys[0];
    if (raw === undefined) return;
    const startTime = Number(raw);
    if (!Number.isFinite(startTime) || startTime < 0) return;
    const dur = duration > 0 ? duration : 1;
    commands.onSeek(startTime / dur);
    setPanel(null);
  };
  const disarmSleepTimer = () => {
    // `setSleepTimer(null)` clears the end time AND resets the mode to
    // 'time' (see playerSlice.setSleepTimer). That is exactly what
    // "cancel" should do for both countdown and mode-based timers.
    dispatch(setSleepTimerAction(null));
  };
  const {
    colors,
    insets,
    title,
    artist,
    album,
    artworkUri,
    isPlaying,
    isEnded,
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
    isBuffering,
    isSeeking,
    isSeekable,
    bufferedRanges,
    cacheFill,
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
    buffered: colors.background.highlightStrong,
    danger: colors.accent.love,
  }), [colors]);
  const status = isLoading ? 'CONNECTING' : isSeeking ? 'SEEKING' : isBuffering ? 'BUFFERING' : isPlaying ? 'PLAYING NOW' : isEnded ? 'FINISHED' : isReady ? 'PAUSED' : 'READY';
  const repeatLabel = repeatMode === 'one' ? 'Repeat one' : repeatMode === 'all' ? 'Repeat all' : 'Play once';

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
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={styles.topBar}>
          <AudioButton icon="chevronDown" label="Minimize player" onPress={commands.onBack} color={palette.primary} size={44} backgroundColor={palette.card} />
          <View style={styles.topTitle}>
            <Text style={[styles.eyebrow, {color: palette.accent}]}>SIMBA AUDIO</Text>
            <Text style={[styles.nowPlaying, {color: palette.primary}]}>Now playing</Text>
          </View>
          <AudioButton icon="more" label="More audio actions" onPress={() => openPanel('more')} color={palette.primary} size={46} backgroundColor={palette.card} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, {paddingBottom: 24}]}>
                      <View style={styles.statusRow}>
              <View style={[styles.statusDot, {backgroundColor: isPlaying && !isBuffering && !isSeeking ? palette.accent : palette.muted}]} />

            <Text style={[styles.status, {color: palette.secondary}]}>{status}</Text>
            {model.sourceLabel ? <View style={[styles.sourceBadge, {backgroundColor: palette.accentWash}]}><Text style={[styles.sourceText, {color: palette.accent}]}>{model.sourceLabel.toUpperCase()}</Text></View> : null}
          </View>

          <View style={styles.hero}>
            <View style={[styles.artworkShadow, {shadowColor: palette.accent}]}>
              <AudioArtwork uri={artworkUri} title={title} size={Math.min(340, 300)} accent={palette.accent} />
            </View>
            <View style={styles.trackHeader}>
              <View style={styles.trackCopy}>
                <Text style={[styles.title, {color: palette.primary}]} numberOfLines={2}>{title}</Text>
                <Text style={[styles.artist, {color: palette.secondary}]} numberOfLines={1}>{artist}</Text>
                <Text style={[styles.album, {color: palette.muted}]} numberOfLines={1}>{album}</Text>
              </View>
              <AudioButton icon={liked ? 'heartFilled' : 'heart'} label={liked ? 'Unlike track' : 'Like track'} onPress={() => model.fileUri && dispatch(toggleLike(model.fileUri))} color={liked ? palette.danger : palette.secondary} size={44} />
            </View>

            <AudioProgress
              position={position}
              duration={duration}
              bufferedRanges={bufferedRanges}
              isBuffering={isBuffering}
              isSeeking={isSeeking}
              isSeekable={isSeekable}
              onSeek={commands.onSeek}
              accent={palette.accent}
              muted={palette.line}
              buffered={palette.buffered}
              cacheFill={cacheFill}
            />

            <View style={styles.transportRow}>
              <AudioTransportControls
                isPlaying={isPlaying}
                isEnded={isEnded}
                isLoading={isLoading}
                onPlayPause={commands.onPlayPause}
                onPrevious={commands.onPrevious}
                onNext={commands.onNext}
                onRewind={commands.onRewind}
                onForward={commands.onForward}
                primary={palette.primary}
                secondary={palette.secondary}
                page={palette.page}
                accent={palette.accent}
              />
            </View>

            <View style={styles.modeRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Toggle shuffle" accessibilityState={{selected: shuffle}} onPress={commands.onToggleShuffle} style={({pressed}) => [styles.modeButton, shuffle && {backgroundColor: palette.accentWash}, pressed && styles.pressed]}>
                <AudioIcon name="shuffle" size={19} color={shuffle ? palette.accent : palette.secondary} />
                <Text style={[styles.modeText, {color: shuffle ? palette.accent : palette.secondary}]}>Shuffle</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Playback mode: ${repeatLabel}`} accessibilityState={{selected: repeatMode !== 'off'}} onPress={commands.onToggleRepeat} style={({pressed}) => [styles.modeButton, repeatMode !== 'off' && {backgroundColor: palette.accentWash}, pressed && styles.pressed]}>
                <AudioIcon name={repeatMode === 'off' ? 'playOnce' : 'repeat'} size={19} color={repeatMode !== 'off' ? palette.accent : palette.secondary} />
                <Text style={[styles.modeText, {color: repeatMode !== 'off' ? palette.accent : palette.secondary}]}>{repeatLabel}</Text>
              </Pressable>
            </View>

            <AudioPriorityActions
              isBookmarked={isBookmarked}
              primary={palette.primary}
              secondary={palette.secondary}
              accent={palette.accent}
              surface={palette.page}
              border={palette.line}
              onBookmark={commands.onBookmark}
              onQueue={() => openPanel('queue')}
            />

            <AudioOutputControl
              volume={volume}
              onChange={commands.onVolumeChange}
              primary={palette.primary}
              secondary={palette.secondary}
              accent={palette.accent}
              surface={palette.page}
              border={palette.line}
            />
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Open play queue" onPress={() => openPanel('queue')} style={({pressed}) => [styles.upNext, {backgroundColor: palette.card, borderColor: palette.line}, pressed && styles.pressed]}>
            <View style={[styles.queueGlyph, {backgroundColor: palette.accentWash}]}><AudioIcon name="queue" size={22} color={palette.accent} /></View>
            <View style={styles.upNextCopy}>
              <Text style={[styles.upNextLabel, {color: palette.accent}]}>UP NEXT</Text>
              <Text style={[styles.upNextTitle, {color: palette.primary}]}>{queueCount > 0 ? `${queueCount} item${queueCount === 1 ? '' : 's'} in your queue` : 'Your queue is empty'}</Text>
              <Text style={[styles.upNextMeta, {color: palette.muted}]}>{playlist.length > 0 ? `Track ${Math.min(currentIndex + 1, playlist.length)} of ${playlist.length}` : 'Add tracks from any audio section'}</Text>
            </View>
            <AudioIcon name="chevronDown" size={21} color={palette.secondary} />
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

      <AudioPanel
        panel={panel}
        model={model}
        palette={palette}
        onClose={closePanel}
        onPlayIndex={playIndex}
        onShare={openShare}
        onOpenPanel={openPanel}
        onOpenEqualizer={onOpenEqualizer}
        sleepTimerEndTime={sleepTimerEndTime}
        sleepTimerMode={sleepTimerMode}
        onArmSleepCountdown={armSleepCountdown}
        onArmSleepEndOfTrack={armSleepEndOfTrack}
        onDisarmSleepTimer={disarmSleepTimer}
        playbackSpeed={playbackSpeed}
        speedSheetGroups={speedSheetGroups}
        speedSheetValue={speedSheetValue}
        onSpeedChange={handleSpeedChange}
        chapterCount={chapters.length}
      />
      {/* A15: speed picker sheet, mounted at the end so it overlays the
          player regardless of full / mini / PiP / modal state. */}
      <FilterSheet
        visible={panel === 'speed'}
        onClose={closePanel}
        title="Playback speed"
        groups={speedSheetGroups}
        value={speedSheetValue}
        onChange={handleSpeedChange}
      />
      {/* A16: chapter list sheet. */}
      <FilterSheet
        visible={panel === 'chapters'}
        onClose={closePanel}
        title="Chapters"
        groups={chapterSheetGroups}
        value={chapterSheetValue}
        onChange={handleChapterSelect}
      />
    </View>
  );
};

interface AudioPanelProps {
  panel: Panel;
  model: AudioViewModel;
  palette: {page: string; card: string; raised: string; primary: string; secondary: string; muted: string; line: string; accent: string; accentWash: string; danger: string};
  onClose: () => void;
  onPlayIndex: (index: number) => void;
  onShare: () => void;
  // A8: MorePanel uses these to navigate to a sibling panel without
  // closing the modal — tapping "Lyrics" inside More swaps the content
  // to the Lyrics panel in the same modal.
  onOpenPanel: (next: Exclude<Panel, null>) => void;
  // Sleep-timer arming is hoisted to AudioPlayer so the MorePanel can
  // dispatch the Redux action. The panel itself just renders the rows.
  sleepTimerEndTime: number | null;
  sleepTimerMode: 'time' | 'track' | 'chapter';
  onArmSleepCountdown: (minutes: number) => void;
  onArmSleepEndOfTrack: () => void;
  onDisarmSleepTimer: () => void;
  // A15: speed picker. Rendered by AudioPanel as a row in the MorePanel
  // and as a FilterSheet mounted alongside.
  playbackSpeed: number;
  speedSheetGroups: ReadonlyArray<{id: string; title: string; multiSelect?: boolean; rows: ReadonlyArray<{key: string; label: string}>}>;
  speedSheetValue: Record<string, string[]>;
  onSpeedChange: (groupId: string, keys: string[]) => void;
  // A16: chapter count for the "Chapters (N)" row.
  chapterCount: number;
  // W5.8: navigation hook to the settings-level Equalizer screen.
  onOpenEqualizer?: () => void;
}

const AudioPanel: React.FC<AudioPanelProps> = ({
  panel,
  model,
  palette,
  onClose,
  onPlayIndex,
  onShare,
  onOpenPanel,
  sleepTimerEndTime,
  sleepTimerMode,
  onArmSleepCountdown,
  onArmSleepEndOfTrack,
  onDisarmSleepTimer,
  playbackSpeed,
  speedSheetGroups,
  speedSheetValue,
  onSpeedChange,
  chapterCount,
  onOpenEqualizer,
}) => {
  if (!panel) return null;
  const title = panel === 'queue' ? 'Play queue' : panel === 'lyrics' ? 'Lyrics' : panel === 'info' ? 'Track details' : panel === 'playlist' ? 'Add to playlist' : 'More actions';
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <View style={[styles.panel, {backgroundColor: palette.raised, borderColor: palette.line}]}>
          <View style={styles.panelHandle} />
          <View style={styles.panelHeader}>
            <View><Text style={[styles.panelEyebrow, {color: palette.accent}]}>AUDIO CONTROL</Text><Text style={[styles.panelTitle, {color: palette.primary}]}>{title}</Text></View>
            <AudioButton icon="close" label="Close panel" onPress={onClose} color={palette.primary} backgroundColor={palette.card} size={42} />
          </View>
          {panel === 'queue' ? <QueuePanel model={model} palette={palette} onPlayIndex={onPlayIndex} /> : null}
          {panel === 'lyrics' ? <LyricsPanel model={model} palette={palette} /> : null}
          {panel === 'info' ? <InfoPanel model={model} palette={palette} /> : null}
          {panel === 'playlist' ? <PlaylistPanel model={model} palette={palette} /> : null}
          {panel === 'more' ? <MorePanel model={model} palette={palette} onShare={onShare} onOpenPanel={onOpenPanel} onOpenEqualizer={onOpenEqualizer} sleepTimerEndTime={sleepTimerEndTime} sleepTimerMode={sleepTimerMode} onArmCountdown={onArmSleepCountdown} onArmEndOfTrack={onArmSleepEndOfTrack} onDisarm={onDisarmSleepTimer} playbackSpeed={playbackSpeed} onOpenSpeed={() => onOpenPanel('speed')} chapterCount={chapterCount} /> : null}
        </View>
      </View>
    </Modal>
  );
};

const QueuePanel: React.FC<{model: AudioViewModel; palette: AudioPanelProps['palette']; onPlayIndex: (index: number) => void}> = ({model, palette, onPlayIndex}) => (
  <FlatList
    data={model.queue}
    keyExtractor={item => item.uri}
    ListEmptyComponent={<Text style={[styles.emptyPanel, {color: palette.secondary}]}>Your queue is empty. Add an item from a player or content page.</Text>}
    renderItem={({item, index}) => (
      <Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.title || 'audio item'}`} onPress={() => model.commands.onPlayQueueIndex(index)} style={({pressed}) => [styles.listRow, item.uri === model.fileUri && {backgroundColor: palette.accentWash}, pressed && styles.pressed]}>
        <AudioArtwork uri={item.artworkUri || ''} title={item.title || 'Audio'} size={52} accent={palette.accent} borderRadius={14} />
        <View style={styles.listCopy}><Text numberOfLines={1} style={[styles.listTitle, {color: palette.primary}]}>{item.title || 'Untitled audio'}</Text><Text numberOfLines={1} style={[styles.listMeta, {color: palette.secondary}]}>{item.artist || item.source || 'Audio'}</Text></View>
        {item.uri === model.fileUri ? <View style={[styles.nowDot, {backgroundColor: palette.accent}]} /> : <AudioIcon name="play" size={19} color={palette.secondary} />}
      </Pressable>
    )}
  />
);

const LyricsPanel: React.FC<{model: AudioViewModel; palette: AudioPanelProps['palette']}> = ({model, palette}) => (
  <ScrollView contentContainerStyle={styles.panelScroll}>
    {model.lyrics.length ? model.lyrics.map((line, index) => <Pressable key={`${line.time}-${index}`} accessibilityRole="button" accessibilityLabel={`Seek to ${line.text}`} onPress={() => model.commands.onSeekToLyric(line.time)} style={styles.lyricLine}><Text style={[styles.lyricText, {color: palette.primary}]}>{line.text}</Text></Pressable>) : <Text style={[styles.emptyPanel, {color: palette.secondary}]}>Lyrics are not available for this track yet.</Text>}
  </ScrollView>
);

const InfoPanel: React.FC<{model: AudioViewModel; palette: AudioPanelProps['palette']}> = ({model, palette}) => (
  <ScrollView contentContainerStyle={styles.panelScroll}>
    <View style={[styles.detailArtwork, {backgroundColor: palette.card}]}><AudioArtwork uri={model.artworkUri} title={model.title} size={112} accent={palette.accent} borderRadius={18} /><View style={styles.detailCopy}><Text style={[styles.detailTitle, {color: palette.primary}]}>{model.title}</Text><Text style={[styles.detailMeta, {color: palette.secondary}]}>{model.artist}</Text><Text style={[styles.detailMeta, {color: palette.muted}]}>{model.album}</Text></View></View>
    <DetailRow label="Source" value={model.sourceLabel || 'Audio'} palette={palette} />
    <DetailRow label="Length" value={model.duration > 0 ? formatAudioTime(model.duration) : 'Live / unknown'} palette={palette} />
    <DetailRow label="Position" value={formatAudioTime(model.position)} palette={palette} />
    <DetailRow label="Queue" value={`${model.queueCount} item${model.queueCount === 1 ? '' : 's'}`} palette={palette} />
  </ScrollView>
);

const DetailRow: React.FC<{label: string; value: string; palette: AudioPanelProps['palette']}> = ({label, value, palette}) => <View style={[styles.detailRow, {borderBottomColor: palette.line}]}><Text style={[styles.detailLabel, {color: palette.muted}]}>{label}</Text><Text style={[styles.detailValue, {color: palette.primary}]}>{value}</Text></View>;

const PlaylistPanel: React.FC<{model: AudioViewModel; palette: AudioPanelProps['palette']}> = ({model, palette}) => (
  <View>
    <Text style={[styles.emptyPanel, {color: palette.secondary}]}>Choose a saved audio playlist, or play one of the items already in the current playlist.</Text>
    {model.playlist.length > 0 ? model.playlist.map((item, index) => (
      <Pressable key={item.uri} accessibilityRole="button" accessibilityLabel={`Play ${item.title || 'audio item'}`} onPress={() => model.commands.onPlayIndex(index)} style={({pressed}) => [styles.listRow, pressed && styles.pressed]}>
        <AudioArtwork uri={item.artworkUri || ''} title={item.title || 'Audio'} size={48} accent={palette.accent} borderRadius={13} />
        <View style={styles.listCopy}><Text numberOfLines={1} style={[styles.listTitle, {color: palette.primary}]}>{item.title || 'Untitled audio'}</Text><Text numberOfLines={1} style={[styles.listMeta, {color: palette.secondary}]}>{item.artist || item.source || 'Audio'}</Text></View>
        <AudioIcon name="play" size={18} color={palette.secondary} />
      </Pressable>
    )) : null}
    <Pressable accessibilityRole="button" accessibilityLabel="Open playlist manager" onPress={model.commands.onOpenPlaylist} style={[styles.fullButton, {backgroundColor: palette.accent}]}><Text style={[styles.fullButtonText, {color: palette.page}]}>Manage playlists</Text></Pressable>
  </View>
);

const MorePanel: React.FC<{
  model: AudioViewModel;
  palette: AudioPanelProps['palette'];
  onShare: () => void;
  onOpenPanel: (next: Exclude<Panel, null>) => void;
  sleepTimerEndTime: number | null;
  sleepTimerMode: 'time' | 'track' | 'chapter';
  onArmCountdown: (minutes: number) => void;
  onArmEndOfTrack: () => void;
  onDisarm: () => void;
  playbackSpeed: number;
  onOpenSpeed: () => void;
  chapterCount: number;
  onOpenEqualizer?: () => void;
}> = ({model, palette, onShare, onOpenPanel, sleepTimerEndTime, sleepTimerMode, onArmCountdown, onArmEndOfTrack, onDisarm, playbackSpeed, onOpenSpeed, chapterCount, onOpenEqualizer}) => {
  const countdownArmed = sleepTimerEndTime !== null && sleepTimerMode === 'time';
  const remainingMin = countdownArmed && sleepTimerEndTime !== null
    ? Math.max(0, Math.round((sleepTimerEndTime - Date.now()) / 60000))
    : 0;
  const sectionLabelStyle = [styles.moreText, {color: palette.secondary, fontSize: 11, letterSpacing: 1.4, marginTop: 14, marginBottom: 6}];
  return (
    <View>
      <Text style={sectionLabelStyle}>SLEEP TIMER</Text>
      {countdownArmed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cancel sleep timer (${remainingMin} minutes remaining)`}
          onPress={onDisarm}
          style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}>
          <AudioIcon name="sleep" size={21} color={palette.accent} />
          <Text style={[styles.moreText, {color: palette.primary}]}>Cancel timer ({remainingMin}m left)</Text>
          <AudioIcon name="close" size={18} color={palette.muted} />
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Sleep timer 15 minutes" onPress={() => onArmCountdown(15)} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="sleep" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>15 minutes</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Sleep timer 30 minutes" onPress={() => onArmCountdown(30)} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="sleep" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>30 minutes</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Sleep timer 1 hour" onPress={() => onArmCountdown(60)} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="sleep" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>1 hour</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Sleep timer at end of current track" onPress={onArmEndOfTrack} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="sleep" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>End of track</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>

      <Text style={sectionLabelStyle}>MORE</Text>
      {chapterCount > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="View chapters" onPress={() => onOpenPanel('chapters')} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="playlist" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>Chapters ({chapterCount})</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
      ) : null}
      {onOpenEqualizer ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Open equalizer" onPress={onOpenEqualizer} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="more" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>Open equalizer</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Playback speed ${playbackSpeed}×. Tap to change.`} onPress={onOpenSpeed} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="playOnce" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>Playback speed · {playbackSpeed}×</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Share this track" onPress={onShare} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="share" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>Share this track</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Save a bookmark here" onPress={model.commands.onBookmark} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="bookmark" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>Save a bookmark here</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="View lyrics" onPress={() => onOpenPanel('lyrics')} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="lyrics" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>View lyrics</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="View track information" onPress={() => onOpenPanel('info')} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="info" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>View track information</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="View the queue" onPress={() => onOpenPanel('queue')} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="queue" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>View the queue</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Add to playlist" onPress={() => onOpenPanel('playlist')} style={({pressed}) => [styles.moreRow, pressed && styles.pressed]}><AudioIcon name="playlist" size={21} color={palette.accent} /><Text style={[styles.moreText, {color: palette.primary}]}>Add to playlist</Text><AudioIcon name="chevronDown" size={18} color={palette.muted} /></Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  safe: {flex: 1, paddingTop: 0},
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12},
  topTitle: {alignItems: 'center'},
  eyebrow: {fontSize: 10, fontWeight: '800', letterSpacing: 1.8},
  nowPlaying: {fontSize: 19, fontWeight: '700', marginTop: 2},
  content: {paddingHorizontal: 18, paddingTop: 8},
  statusRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14},
  statusDot: {width: 8, height: 8, borderRadius: 4},
  status: {fontSize: 11, fontWeight: '700', letterSpacing: 1.4},
  sourceBadge: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 4},
  sourceText: {fontSize: 9, fontWeight: '800', letterSpacing: 1},
  // A16: chapter caption directly under the progress bar. 1-line
  // truncate so a long chapter name doesn't push the time labels.
  chapterCaption: {fontSize: 12, fontWeight: '600', marginTop: 4, letterSpacing: 0.2},
  hero: {paddingHorizontal: 2, paddingVertical: 10},
  artworkShadow: {alignSelf: 'center', borderRadius: 28, shadowOpacity: 0.24, shadowRadius: 24, shadowOffset: {width: 0, height: 12}, elevation: 12},
  trackHeader: {flexDirection: 'row', alignItems: 'center', marginTop: 18},
  trackCopy: {flex: 1, paddingRight: 8},
  title: {fontSize: 23, lineHeight: 28, fontWeight: '800', letterSpacing: -0.3},
  artist: {fontSize: 15, fontWeight: '600', marginTop: 7},
  album: {fontSize: 13, marginTop: 4},
  transportRow: {marginTop: 4},
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
