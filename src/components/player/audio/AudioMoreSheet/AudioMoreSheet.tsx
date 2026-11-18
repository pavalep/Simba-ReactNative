/**
 * WAVE B15 — the AUDIO lane's more sheet.
 *
 * ## Why this file exists
 *
 * The audio lane had NO more sheet, while the video lane had one with
 * nine rows. That was the whole of the answer to "the audio player is
 * missing options the video player has": the sheet was written for the
 * video lane, named for it, and mounted inside the video lane's
 * transport bar. Nothing was ever REMOVED from the audio lane — the
 * options were never there.
 *
 * The chrome and the row grammar are shared
 * (`components/player/shared/MoreSheet/`); this file is the audio lane's
 * ROWS, and every row here is one a shipping audio player has:
 *
 *   - **Speed** — Spotify, Apple Music, YouTube Music, Pocket Casts and
 *     Audible all have it, and a spoken-word track at 1.5× is the
 *     difference between a 40-minute episode and a 27-minute one.
 *   - **Sleep timer** — Spotify, Apple Music, YouTube Music and Audible
 *     all have it, and it is the single most-used option in a podcast or
 *     audiobook player.
 *   - **Equalizer** — the app ALREADY HAS the screen
 *     (`screens/Equalizer`, reached today from Audio Settings and the
 *     Profile). VLC has "Effects and Filters", MX Player has "Audio
 *     Effects", Poweramp has its EQ in the player. Offering it in the
 *     audio lane is not a new idea; it is giving an existing screen the
 *     door the player has always been the natural place to reach it
 *     from.
 *
 * ## What is deliberately NOT here, and why
 *
 *   - **Quality** — mpv's `hwdec` and `profile` are picture settings.
 *     There is no audio analogue in the app's quality store, and a row
 *     that cannot act must not occupy space.
 *   - **Skip silence** — mpv's `scaletempo2` recipe compresses silence
 *     for the WHOLE session, including music, where it would eat the
 *     intro and the outro. Spotify offers it for podcasts only, and
 *     this app's toggle is a global player setting with no per-lane
 *     scope. Offered here, it would cut the silence out of the user's
 *     music. It stays in the video lane (where it was always available)
 *     until it can be scoped by KIND.
 *   - **Auto-play next** — the toggle controls the video lane's "Up
 *     next" COUNTDOWN. The audio lane's queue advances by itself; there
 *     is no countdown to auto-play, so the row would promise something
 *     that has no visible effect here.
 */

import * as React from 'react';
import {useTransport} from '../../../../infrastructure/player';
import {
  useSleepTimerStore,
  SLEEP_TIMER_OPTIONS,
} from '../../../../state/useSleepTimerStore';
import {startDownload} from '../../../../services/downloadService';
import {shareContent} from '../../../../services/shareService';
import {useToast} from '../../../feedback/Toast';
import {useQueueActions} from '../../../../hooks/useQueueActions';
import {isRemoteUri} from '../../../../utils/mediaUri';
import {
  MoreSheet,
  useMoreSheetExpansion,
} from '../../shared/MoreSheet/MoreSheet';
import {
  MoreSheetSection,
  ValueRow,
  ActionRow,
} from '../../shared/MoreSheet/MoreSheetRows';
import {SPEED_OPTIONS} from '../../shared/MoreSheet/speedOptions';
import {useCurrentPlaylistItem} from '../../shared/useCurrentPlaylistItem';

export type AudioMoreAction =
  | 'addToQueue'
  | 'addToPlaylist'
  | 'download'
  | 'trackInfo'
  | 'share'
  | 'setSpeed'
  | 'setSleep'
  | 'openEqualizer';

export interface AudioMoreSheetProps {
  visible: boolean;
  onAction: (action: AudioMoreAction) => void;
  onClose: () => void;
}

export const AudioMoreSheet: React.FC<AudioMoreSheetProps> = ({
  visible,
  onAction,
  onClose,
}) => {
  const toast = useToast();
  const {state, commands} = useTransport();
  const title = state.title;
  const artist = state.artist;
  const currentUri = state.currentUri;
  const durationMs = state.durationMs;

  const {expanded, toggle, collapse} = useMoreSheetExpansion();

  const handleClose = React.useCallback(() => {
    collapse();
    onClose();
  }, [collapse, onClose]);

  const playlistItem = useCurrentPlaylistItem();

  const {addToQueue} = useQueueActions();

  const handleAddToQueue = React.useCallback(() => {
    if (!playlistItem) {
      toast.show('Nothing to add', 'info');
      return;
    }
    addToQueue({
      uri: playlistItem.fileUri,
      title: playlistItem.title,
      duration: playlistItem.duration,
      source: playlistItem.source,
      type: playlistItem.type,
      mediaType: playlistItem.mediaType,
      ...(playlistItem.provider ? {provider: playlistItem.provider} : {}),
    });
  }, [playlistItem, addToQueue, toast]);

  const handleDownload = React.useCallback(() => {
    if (!currentUri) {
      toast.show('Nothing to download', 'info');
      return;
    }
    startDownload({
      uri: currentUri,
      title: title || 'Untitled',
      mediaType: playlistItem?.mediaType ?? 'audio',
    })
      .then(() => {
        toast.show('Download started', 'success');
      })
      .catch((e: unknown) => {
        if (__DEV__) console.warn('[AudioMoreSheet] download failed', e);
        toast.show('Download failed', 'error');
      });
  }, [currentUri, title, playlistItem?.mediaType, toast]);

  const handleShare = React.useCallback(() => {
    if (!currentUri) {
      toast.show('Nothing to share', 'info');
      return;
    }
    shareContent({
      route: 'NowPlaying',
      params: {
        fileUri: currentUri,
        fileTitle: title || undefined,
      },
      title: title || 'Untitled',
      subtitle: artist || undefined,
    }).catch(() => {
      // Cancelled by the user, or no share target installed.
    });
    onAction('share');
  }, [currentUri, title, artist, toast, onAction]);

  const showTrackInfo = React.useCallback(() => {
    if (!currentUri) {
      toast.show('No track loaded', 'info');
      return;
    }
    const seconds = Math.round(durationMs / 1000);
    toast.show(
      [
        title || 'Untitled track',
        artist ? `Artist: ${artist}` : null,
        `Duration: ${seconds}s`,
        `Source: ${currentUri}`,
      ]
        .filter(Boolean)
        .join(' · '),
      'info',
    );
  }, [title, artist, durationMs, currentUri, toast]);

  const handleSpeed = React.useCallback(
    (rate: number) => {
      try {
        commands.setSpeed(rate);
      } catch {
        // The bridge refused the rate; the value row keeps showing the
        // rate mpv is actually running.
      }
      onAction('setSpeed');
      toggle('speed');
    },
    [commands, onAction, toggle],
  );

  const sleepMinutes = useSleepTimerStore(s => s.minutes);
  const setSleepMinutes = useSleepTimerStore(s => s.setMinutes);
  const handleSleep = React.useCallback(
    (minutes: number) => {
      setSleepMinutes(minutes);
      onAction('setSleep');
      toggle('sleep');
    },
    [setSleepMinutes, onAction, toggle],
  );

  const currentSpeed = state.speed ?? 1;
  const speedLabel =
    SPEED_OPTIONS.find(o => approxEqual(o.value, currentSpeed))?.label ??
    `${currentSpeed}×`;
  const sleepLabel =
    SLEEP_TIMER_OPTIONS.find(o => o.value === sleepMinutes)?.label ??
    (sleepMinutes > 0 ? `${sleepMinutes} min` : 'Off');

  // A local file is already on the device: there is nothing to download.
  const canDownload = !!currentUri && isRemoteUri(currentUri);

  return (
    <MoreSheet visible={visible} onClose={handleClose}>
      {/* ── PLAYBACK ─────────────────────────────────────────── */}
      <MoreSheetSection>Playback</MoreSheetSection>

      <ValueRow
        testID="audio-speed-row"
        label="Speed"
        value={speedLabel}
        expanded={expanded === 'speed'}
        onToggle={() => toggle('speed')}
        options={SPEED_OPTIONS.map(o => ({
          key: String(o.value),
          label: o.label,
          active: approxEqual(o.value, currentSpeed),
          onPress: () => handleSpeed(o.value),
        }))}
      />

      <ValueRow
        testID="audio-sleep-row"
        label="Sleep timer"
        value={sleepLabel}
        expanded={expanded === 'sleep'}
        onToggle={() => toggle('sleep')}
        options={SLEEP_TIMER_OPTIONS.map(o => ({
          key: String(o.value),
          label: o.label,
          active: o.value === sleepMinutes,
          onPress: () => handleSleep(o.value),
        }))}
      />

      <ActionRow
        testID="audio-equalizer-row"
        label="Equalizer"
        onPress={() => {
          onAction('openEqualizer');
        }}
      />

      {/* ── LIBRARY ──────────────────────────────────────────── */}
      <MoreSheetSection>Library</MoreSheetSection>

      <ActionRow
        testID="audio-add-to-queue"
        label="Add to queue"
        onPress={handleAddToQueue}
      />

      <ActionRow
        testID="audio-add-to-playlist"
        label="Add to playlist"
        onPress={() => {
          onAction('addToPlaylist');
        }}
      />

      {canDownload ? (
        <ActionRow
          testID="audio-download"
          label="Download"
          onPress={handleDownload}
        />
      ) : null}

      <ActionRow testID="audio-share" label="Share" onPress={handleShare} />

      <ActionRow
        testID="audio-track-info"
        label="Track info"
        onPress={() => {
          showTrackInfo();
          onAction('trackInfo');
        }}
        isLast
      />
    </MoreSheet>
  );
};

function approxEqual(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) < eps;
}
