import {getMpvPlayerModule, toMpvPropertyString} from '../infrastructure/player';
import {useSettingsStore} from '../state';
import {logger} from '../lib/logger';

/**
 * The single point where a JS value crosses into mpv as a property.
 *
 * `MpvBridgeModule.setProperty(name, value)` declares `value` as a Kotlin
 * `String`, and React Native's JS→native marshalling THROWS on a type
 * mismatch instead of coercing — `volume-max: 100` produced
 *
 *   Exception in HostFunction: Expected argument 1 of method
 *   "setProperty" to be a string, but got a number (100.000000)
 *
 * as a red-box that unmounts the React tree. Three of the properties
 * below are genuinely numeric (`volume-max`, `audio-delay`,
 * `audio-samplerate`), so this was reachable on every settings apply.
 *
 * Encoding goes through the lib's own `toMpvPropertyString` rather than a
 * local `String(value)`, so there is exactly one rule for how an mpv value
 * is spelled and this file cannot drift from the one `commands.setProperty`
 * uses.
 *
 * The guard is kept because mpv may not be initialised yet and an
 * unsupported property must not crash the app — but it now LOGS the
 * property name. The previous silent `catch {}` in
 * `applyPlaybackSettingsToMpv` is precisely what let a setting quietly
 * fail to apply for as long as it did.
 */
function setMpvProperty(name: string, value: string | number): void {
  try {
    getMpvPlayerModule().setProperty(name, toMpvPropertyString(value));
  } catch (e) {
    logger.warn('[audioSettingsService] setProperty failed:', name, e);
  }
}

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
  const s = useSettingsStore.getState();
  const properties: Array<[string, string | number]> = [
    ['hwdec', s.isHardwareAccelerationEnabled ? 'auto' : 'no'],
    ['sub-auto', s.isAutoLoadSubtitlesEnabled ? 'fuzzy' : 'no'],
    ['slang', s.preferredLanguages],
  ];
  for (const [name, value] of properties) {
    setMpvProperty(name, value);
  }
}

/**
 * Push the persisted audio settings from Redux onto the live mpv instance.

 * Every property is individually guarded: mpv may be uninitialized, and
 * unsupported properties must never crash the app.
 */
export function applyAudioSettingsToMpv(): void {
  const s = useSettingsStore.getState();
  // V16 Phase 73: every property is individually guarded AND logged if it
  // fails — mpv may be uninitialized and unsupported properties must never
  // crash the app, but the silent failure was hiding real configuration
  // problems. The guard + property-name log now live in the shared
  // `setMpvProperty` helper, which also encodes the value.
  setMpvProperty('volume-max', s.isAudioNormalizationEnabled ? 100 : 130);
  setMpvProperty('replaygain', s.replayGain);
  setMpvProperty('gapless-audio', s.gaplessPlayback ? 'yes' : 'no');
  setMpvProperty('audio-delay', s.audioDelay);
  setMpvProperty('audio-samplerate', s.sampleRate);
  setMpvProperty(
    'af',
    buildAfFilter(
      s.eqEnabled ? s.eqGains : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      s.isDialogueBoostEnabled,
    ),
  );
}
