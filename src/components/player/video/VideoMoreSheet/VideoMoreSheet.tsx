/**
 * WAVE B15 — the VIDEO lane's more sheet.
 *
 * ## What changed, and why
 *
 * **The sheet is no longer the video lane's.** Its chrome and its row
 * grammar were extracted into `components/player/shared/MoreSheet/`, and
 * the AUDIO lane now draws its own sheet from the same two pieces. The
 * video lane's sheet is now a LIST OF ROWS, not a component with a
 * grammar in it.
 *
 * **"Save" was renamed to "Download", and "Add to playlist" was renamed
 * to "Add to queue".** Both rows did something other than what they
 * said:
 *
 *   - "Save" called `startDownload` — it downloaded the file. The app
 *     calls that action "Download" everywhere else (`StreamingRow`'s
 *     menu, the Downloads screen), and "Save" in a media player means
 *     "keep this title" (Netflix's My List, YouTube's Watch later),
 *     which is the row below it. Two names for one action is how a
 *     control ends up meaning something the user did not ask for.
 *   - "Add to playlist" called `usePlayerStore.addToPlaylist`, which
 *     appends to the PLAYER'S RUN — the queue — and not to any user
 *     playlist. It said "Added to playlist" and meant "Added to queue".
 *
 * So the sheet now has BOTH: an honest "Add to queue" that uses the
 * app's one queue action, and a real "Add to playlist" that opens the
 * app's one playlist picker (`PlaylistSheet`), the same picker the Music
 * detail screen uses.
 *
 * ## "Download" is offered only for a remote item
 *
 * `startDownload` returns immediately for a local URI (`downloadService`
 * checks `isRemoteUri` first), so offering the row for a file that is
 * already on the device produced "Download started" for a download that
 * never happened. A local file needs no download, so the row is not
 * drawn for one.
 *
 * ## Where the volume control is NOT
 *
 * Volume lives in the transport bar (`VolumeControl`). It is
 * deliberately absent here: a second editor for the same lib property,
 * mounted at the same time, is two owners of one value and they will
 * drift. The same reasoning keeps Captions out — the transport bar's
 * captions pill already owns it.
 *
 * ## Why this sheet is still the ONLY more-menu surface
 *
 * SPEC §3.4: "no two paths to the same secondary action". Nothing else
 * in the chrome opens this sheet.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md`
 * §1.4 and §3.3; `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.10.
 */

import * as React from 'react';
import {useTransport, useSkipSilence} from '../../../../infrastructure/player';
import {
  useQualityStore,
  VIDEO_QUALITY_PRESETS,
  presetToMpv,
  type VideoQualityPreset,
} from '../../../../state/useQualityStore';
import {
  useSleepTimerStore,
  SLEEP_TIMER_OPTIONS,
} from '../../../../state/useSleepTimerStore';
import {useAutoPlayNextStore} from '../../../../state/useAutoPlayNextStore';
import {startDownload} from '../../../../services/downloadService';
import {shareContent} from '../../../../services/shareService';
import {useToast} from '../../../feedback/Toast';
import {useQueueActions} from '../../../sheets/MediaActionsSheet/useQueueActions';
import {isRemoteUri} from '../../../../utils/mediaUri';
import {
  MoreSheet,
  useMoreSheetExpansion,
  SHEET_MAX_HEIGHT,
  DISMISS_DRAG_PX,
  DISMISS_VELOCITY,
} from '../../shared/MoreSheet/MoreSheet';
import {
  MoreSheetSection,
  ValueRow,
  ToggleRow,
  ActionRow,
} from '../../shared/MoreSheet/MoreSheetRows';
import {SPEED_OPTIONS} from '../../shared/MoreSheet/speedOptions';
import {useCurrentPlaylistItem} from '../../shared/useCurrentPlaylistItem';

/* ─────────────────────────────────────────────────────────────────────────
 *                                CONSTANTS
 * ──────────────────────────────────────────────────────────────────────── */

// Re-exported so the sheet's public surface did not change for its
// consumers and its tests: the sheet's geometry and its speed list are
// the shared module's now, and this file is only the video lane's ROWS.
export {SHEET_MAX_HEIGHT, DISMISS_DRAG_PX, DISMISS_VELOCITY, SPEED_OPTIONS};

export type VideoMoreAction =
  | 'addToQueue'
  | 'addToPlaylist'
  | 'download'
  | 'trackInfo'
  | 'share'
  | 'setSpeed'
  | 'setQuality'
  | 'setSleep';

export interface VideoMoreSheetProps {
  visible: boolean;
  onAction: (action: VideoMoreAction) => void;
  onClose: () => void;
}

/* ─────────────────────────────────────────────────────────────────────────
 *                                 COMPONENT
 * ──────────────────────────────────────────────────────────────────────── */

export const VideoMoreSheet: React.FC<VideoMoreSheetProps> = ({
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

  /**
   * Which value row is expanded. Exactly ONE at a time — the rule lives
   * in the shared hook, so the two lanes cannot disagree about it.
   */
  const {expanded, toggle, collapse} = useMoreSheetExpansion();

  // Close and collapse together. A dismissed sheet that reopens still
  // showing an open row is a sheet that did not really close.
  const handleClose = React.useCallback(() => {
    collapse();
    onClose();
  }, [collapse, onClose]);

  // The playing item, as a playlist item — ONE derivation for both lanes.
  const playlistItem = useCurrentPlaylistItem();

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

  const handleDownload = React.useCallback(() => {
    if (!currentUri) {
      toast.show('Nothing to download', 'info');
      return;
    }
    startDownload({
      uri: currentUri,
      title: title || 'Untitled',
      mediaType: playlistItem?.mediaType ?? 'video',
    })
      .then(() => {
        toast.show('Download started', 'success');
      })
      .catch((e: unknown) => {
        if (__DEV__) console.warn('[VideoMoreSheet] download failed', e);
        toast.show('Download failed', 'error');
      });
  }, [currentUri, title, playlistItem?.mediaType, toast]);

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

  const qualityPreset = useQualityStore(s => s.preset);
  const setQualityPreset = useQualityStore(s => s.setPreset);
  const applyQuality = React.useCallback(
    (preset: VideoQualityPreset) => {
      const {hwdec, profile} = presetToMpv(preset);
      // **Order matters — write mpv FIRST, persist SECOND.**
      //
      // This used to persist the preset and then swallow any bridge
      // failure, so a rejected `hwdec` write still left the UI
      // showing the new preset while mpv kept running the old one: a
      // control that lies about the state of the player. Persisting
      // only after the bridge accepts means the stored preset always
      // reflects what mpv was actually told.
      try {
        commands.setProperty('hwdec', hwdec);
        commands.setProperty('profile', profile);
      } catch (e) {
        if (__DEV__) {
          console.warn(
            `[VideoMoreSheet] quality preset '${preset}' rejected by the bridge; stored preset unchanged.`,
            e,
          );
        }
        return;
      }
      setQualityPreset(preset);
      onAction('setQuality');
    },
    [setQualityPreset, commands, onAction],
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

  const skipSilence = useSkipSilence();

  const autoPlayNextEnabled = useAutoPlayNextStore(s => s.enabled);
  const setAutoPlayNextEnabled = useAutoPlayNextStore(s => s.setEnabled);

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

  const handleShare = React.useCallback(() => {
    // W7.4 fix: this hardcoded `route: 'SongScreen'` — an AUDIO
    // route — from a VIDEO player's share action, so sharing a
    // movie deep-linked the receiver into the audio song screen.
    //
    // `NowPlaying` is the correct target: it is lane-agnostic (both
    // lanes render the same player) and it takes the `fileUri` /
    // `fileTitle` path tokens that `src/navigation/linking.ts`
    // declares for it.
    //
    // Guarded on `currentUri`, not `title`: a URI is what the route
    // actually needs, and a file can legitimately have no title while
    // still being shareable.
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
      // Neither is an error worth surfacing from a menu row.
    });
    onAction('share');
  }, [currentUri, title, artist, toast, onAction]);

  const currentSpeed = state.speed ?? 1;
  const speedLabel =
    SPEED_OPTIONS.find(o => approxEqual(o.value, currentSpeed))?.label ??
    `${currentSpeed}×`;
  const qualityLabel =
    VIDEO_QUALITY_PRESETS.find(o => o.value === qualityPreset)?.label ??
    'Balanced';
  const qualityDescription =
    VIDEO_QUALITY_PRESETS.find(o => o.value === qualityPreset)?.description ??
    '';
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
        testID="speed-row"
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
        testID="quality-row"
        label="Quality"
        value={qualityLabel}
        description={qualityDescription}
        expanded={expanded === 'quality'}
        onToggle={() => toggle('quality')}
        options={VIDEO_QUALITY_PRESETS.map(o => ({
          key: o.value,
          label: o.label,
          active: o.value === qualityPreset,
          onPress: () => {
            applyQuality(o.value);
            toggle('quality');
          },
        }))}
      />

      {/* W7.4: was two chips, "Off" and "On", and BOTH called
          `skipSilence.toggle()` — so tapping the chip labelled "Off"
          while already off turned it ON. One row that sets an
          explicit boolean removes the possibility. */}
      <ToggleRow
        testID="skip-silence-row"
        label="Skip silence"
        description={
          skipSilence.enabled
            ? 'Silence is detected and skipped.'
            : 'Plays silence as-is.'
        }
        value={skipSilence.enabled}
        onPress={() => skipSilence.toggle()}
      />

      <ToggleRow
        testID="auto-play-next-row"
        label="Auto-play next"
        description={
          autoPlayNextEnabled
            ? 'The Up-next countdown plays automatically.'
            : 'Up next waits for Cancel or Play now.'
        }
        value={autoPlayNextEnabled}
        onPress={() => setAutoPlayNextEnabled(!autoPlayNextEnabled)}
      />

      <ValueRow
        testID="sleep-row"
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

      {/* ── LIBRARY ──────────────────────────────────────────── */}
      <MoreSheetSection>Library</MoreSheetSection>

      <ActionRow
        testID="add-to-queue"
        label="Add to queue"
        onPress={handleAddToQueue}
      />

      {/* The real "add to a playlist". The parent owns the picker —
          a second Modal inside this one would stack two panels, and
          the picker belongs with the player, not inside its menu. */}
      <ActionRow
        testID="add-to-playlist"
        label="Add to playlist"
        onPress={() => {
          onAction('addToPlaylist');
        }}
      />

      {canDownload ? (
        <ActionRow
          testID="download"
          label="Download"
          onPress={handleDownload}
        />
      ) : null}

      <ActionRow testID="share" label="Share" onPress={handleShare} />

      <ActionRow
        testID="track-info"
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

// re-export typed action enum so it shows in module exports at the path.
export type {VideoQualityPreset};
