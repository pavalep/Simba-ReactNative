import {getMpvPlayerModule} from '@simba-dev/react-native-media-player';
import {store} from '../store';

// ─── EQ constants (shared by player panels + Equalizer screen) ───

export const EQ_BANDS = [
  {freq: 31, label: '31'},
  {freq: 62, label: '62'},
  {freq: 125, label: '125'},
  {freq: 250, label: '250'},
  {freq: 500, label: '500'},
  {freq: 1000, label: '1K'},
  {freq: 2000, label: '2K'},
  {freq: 4000, label: '4K'},
  {freq: 8000, label: '8K'},
  {freq: 16000, label: '16K'},
];

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [5, 5, 3, 1, -1, 0, 1, 3, 4, 5],
  Pop: [-2, -1, 2, 4, 5, 4, 2, 0, -1, -2],
  Jazz: [3, 3, 2, 1, 0, 1, 2, 3, 3, 3],
  Classical: [4, 3, 2, 1, 0, 0, 1, 2, 3, 4],
  Dance: [6, 5, 3, 1, -1, -1, 0, 2, 4, 5],
};

/** Presence-region boost (2.5 kHz) used by Dialogue Boost. */
const DIALOGUE_BOOST_FILTER = 'equalizer=f=2500:t=h:w=1.0:g=6';

/**
 * Build the mpv audio-filter string from 10 EQ gain values and an optional
 * dialogue boost. Zero-gain bands are omitted; returns '' when nothing to do
 * (which clears the filter chain in mpv).
 */
export function buildAfFilter(
  gains: number[],
  dialogueBoost: boolean,
): string {
  const parts: string[] = [];
  gains.forEach((gain, i) => {
    if (gain !== 0) {
      parts.push(`equalizer=f=${EQ_BANDS[i]?.freq ?? 0}:t=h:w=1.0:g=${gain}`);
    }
  });
  if (dialogueBoost) {
    parts.push(DIALOGUE_BOOST_FILTER);
  }
  return parts.join(',');
}

/**
 * Push persisted playback preferences from Redux onto the live mpv instance.
 * Each option is guarded because native support varies by platform and mpv
 * may not yet be initialized when a preference changes.
 */
export function applyPlaybackSettingsToMpv(): void {
  const s = store.getState().settings;
  const properties: Array<[string, string | number]> = [
    ['hwdec', s.isHardwareAccelerationEnabled ? 'auto' : 'no'],
    ['sub-auto', s.isAutoLoadSubtitlesEnabled ? 'fuzzy' : 'no'],
    ['slang', s.preferredLanguages],
  ];
  for (const [name, value] of properties) {
    try {
      getMpvPlayerModule().setProperty(name, value);
    } catch {
      // Ignore unsupported properties; the player remains usable.
    }
  }
}

/**
 * Push the persisted audio settings from Redux onto the live mpv instance.

 * Every property is individually guarded: mpv may be uninitialized, and
 * unsupported properties must never crash the app.
 */
export function applyAudioSettingsToMpv(): void {
  const s = store.getState().settings;
  const bridge = getMpvPlayerModule();
  try {
    bridge.setProperty(
      'volume-max',
      s.isAudioNormalizationEnabled ? 100 : 130,
    );
  } catch {}
  try {
    bridge.setProperty('replaygain', s.replayGain);
  } catch {}
  try {
    bridge.setProperty('gapless-audio', s.gaplessPlayback ? 'yes' : 'no');
  } catch {}
  try {
    bridge.setProperty('audio-delay', s.audioDelay);
  } catch {}
  try {
    bridge.setProperty('audio-samplerate', s.sampleRate);
  } catch {}
  try {
    const gains = s.eqEnabled ? s.eqGains : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    bridge.setProperty('af', buildAfFilter(gains, s.isDialogueBoostEnabled));
  } catch {}
}
