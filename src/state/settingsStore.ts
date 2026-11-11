import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import type {RepeatMode} from '../types';
import {DEFAULT_SUBTITLE_COLOR} from '../constants/subtitleColors';
import type {LinkedMediaFolder, MediaLane} from '../types/media';
import {linkedMediaFolderId} from '../types/media';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

/**
 * V17 Phase 79: replaces `settingsSlice` (Redux) with
 * `useSettingsStore` (Zustand + persist). State shape, action
 * semantics, and persist key (`'settings'`) are preserved. The
 * `resetAppState` extraReducer is now a per-store `reset()` action.
 */

interface MpvOption {
  key: string;
  value: string;
}

export interface SettingsState {
  themeMode: 'dark' | 'light' | 'system';
  repeatMode: RepeatMode;
  playbackSpeed: number;
  sleepTimerMinutes: number;
  isShuffleOn: boolean;
  rememberPlaybackPosition: boolean;

  // Preferences (Phase 3)
  isAudioNormalizationEnabled: boolean;
  isDialogueBoostEnabled: boolean;
  isHardwareAccelerationEnabled: boolean;
  isAutoLoadSubtitlesEnabled: boolean;
  preferredLanguages: string;
  externalSubtitleDirectories: string;

  // Subtitle appearance (Phase 22)
  subtitleFontSize: number;
  subtitleTextColor: string;
  subtitleBackgroundOpacity: number;

  // Playback extras (Phase 22)
  skipSilenceEnabled: boolean;

  // Audio settings (Phase 45)
  sampleRate: number;
  replayGain: 'no' | 'track' | 'album';
  gaplessPlayback: boolean;
  audioDelay: number;
  eqEnabled: boolean;
  eqPreset: string;
  eqGains: number[];

  // Linked folders (Phase 22)
  videoFolders: string[];
  audioFolders: string[];
  linkedFolders: LinkedMediaFolder[];
  lastScanTimestamp: number | null;
  isScanning: boolean;

  // MPV advanced options (Phase 19)
  mpvOptions: MpvOption[];

  // App lifecycle
  //
  // `hasLaunched` used to live here: it gated a JS `Splash` route that ran
  // on the first launch after install. That screen is gone (2026-11-11) —
  // the app's splash is the native `SplashActivity`, which needs no flag —
  // so the field is gone with it. The `merge` below drops the stale key out
  // of installs that still have it persisted.

  // Accessibility & misc (Phase 46)
  largerControls: boolean;
  highContrastSubtitles: boolean;
  scanOnLaunch: boolean;
  notificationsEnabled: boolean;
  appLanguage: string;
  /** 49.6: keep the last N completed downloads (0 = off). */
  autoDeleteDownloads: number;

  // P61: home greeting.
  homeCity: string;
}

/**
 * V17 Phase 79: action set for `useSettingsStore`. The action
 * shape is the same as the old `settingsSlice.actions` (one
 * setter per field) so existing consumer call sites migrate
 * with a search/replace from `dispatch(setX(v))` to
 * `useSettingsStore.getState().setX(v)`. The `reset()` action
 * replaces the old `resetToDefaults` + `resetPreferencesToDefaults`
 * pair; the per-store reset clears the whole state.
 */
export interface SettingsActions {
  setThemeMode: (mode: 'dark' | 'light' | 'system') => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSleepTimer: (minutes: number) => void;
  toggleShuffle: () => void;
  setRememberPlaybackPosition: (on: boolean) => void;

  setAudioNormalization: (on: boolean) => void;
  setDialogueBoost: (on: boolean) => void;
  setHardwareAcceleration: (on: boolean) => void;
  setAutoLoadSubtitles: (on: boolean) => void;
  setPreferredLanguages: (langs: string) => void;
  setExternalSubtitleDirectories: (dirs: string) => void;

  setSubtitleFontSize: (size: number) => void;
  setSubtitleTextColor: (color: string) => void;
  setSubtitleBackgroundOpacity: (opacity: number) => void;

  setSkipSilence: (on: boolean) => void;

  setSampleRate: (hz: number) => void;
  setReplayGain: (mode: 'no' | 'track' | 'album') => void;
  setGaplessPlayback: (on: boolean) => void;
  setAudioDelay: (seconds: number) => void;
  setEqEnabled: (on: boolean) => void;
  setEqPreset: (preset: string) => void;
  setEqGains: (gains: number[]) => void;

  addVideoFolder: (path: string) => void;
  removeVideoFolder: (path: string) => void;
  addAudioFolder: (path: string) => void;
  removeAudioFolder: (path: string) => void;
  syncLinkedFolders: (input: {
    videoFolders: string[];
    audioFolders: string[];
  }) => void;
  setLinkedFoldersLastScan: (input: {timestamp: number; paths: string[]}) => void;

  setScanning: (scanning: boolean) => void;
  setLastScanTimestamp: (timestamp: number) => void;

  setMpvOptions: (options: MpvOption[]) => void;

  setLargerControls: (on: boolean) => void;
  setHighContrastSubtitles: (on: boolean) => void;
  setScanOnLaunch: (on: boolean) => void;
  setNotificationsEnabled: (on: boolean) => void;
  setAppLanguage: (lang: string) => void;

  setAutoDeleteDownloads: (count: number) => void;
  setHomeCity: (city: string) => void;

  reset: () => void;

  /**
   * Restore every PREFERENCE to its default, and keep the folder links.
   *
   * `reset()` clears the whole state, and the whole state includes
   * `videoFolders`, `audioFolders` and `linkedFolders` — so the old
   * "Reset preferences" dialog, which promised that "Linked folders,
   * local media, downloads, and personal items will be preserved", was
   * promising something the code did not do: the linked folders were
   * dropped with everything else.
   *
   * A folder link is not a preference. It is where the user's files come
   * from, and unlinking them is not what a user tapping "Reset
   * preferences" is asking for. This action resets the preferences and
   * leaves the links alone.
   */
  resetPreferences: () => void;
}

const initialState: SettingsState = {
  themeMode: 'system',
  repeatMode: 'off',
  playbackSpeed: 1.0,
  sleepTimerMinutes: 0,
  isShuffleOn: false,
  rememberPlaybackPosition: true,

  isAudioNormalizationEnabled: false,
  isDialogueBoostEnabled: false,
  isHardwareAccelerationEnabled: true,
  isAutoLoadSubtitlesEnabled: true,
  preferredLanguages: 'eng, jpn, und',
  externalSubtitleDirectories: './subs, ./subtitles',

  subtitleFontSize: 16,
  subtitleTextColor: DEFAULT_SUBTITLE_COLOR,
  subtitleBackgroundOpacity: 0.5,

  skipSilenceEnabled: false,

  sampleRate: 0,
  replayGain: 'no',
  gaplessPlayback: false,
  audioDelay: 0,
  eqEnabled: false,
  eqPreset: 'Flat',
  eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

  videoFolders: [],
  audioFolders: [],
  linkedFolders: [],
  lastScanTimestamp: null,
  isScanning: false,

  mpvOptions: [],

  largerControls: false,
  highContrastSubtitles: false,
  scanOnLaunch: false,
  notificationsEnabled: true,
  appLanguage: 'system',

  autoDeleteDownloads: 0,

  homeCity: '',
};

/** Internal helper: upsert a LinkedMediaFolder. */
function upsertLinkedFolder(
  linkedFolders: LinkedMediaFolder[],
  path: string,
  mediaType: MediaLane,
): LinkedMediaFolder[] {
  if (linkedFolders.some(f => f.path === path && f.mediaType === mediaType)) {
    return linkedFolders;
  }
  return [
    ...linkedFolders,
    {
      id: linkedMediaFolderId(path, mediaType),
      path,
      mediaType,
      source: 'local',
      addedAt: Date.now(),
      lastScanAt: null,
    },
  ];
}

/**
 * True when the last rehydrate found a stale `hasLaunched` in the persisted
 * blob, and the store has not yet written the shed state back.
 *
 * zustand v5 does NOT write the merged state back to storage on rehydrate.
 * `hydrate()` calls `set(mergedState, true)` — the raw store `set`, not the
 * persisted `api.setState` — and only a `migrate` triggers a write-back, and
 * a `migrate` fires solely on a version mismatch. The `merge` below therefore
 * fixes the IN-MEMORY state, but the dead key would sit in the on-disk blob
 * until some unrelated write happened to rewrite it. This flag lets the
 * rehydrate callback force exactly one write, so an install really does shed
 * the key rather than merely ignoring it.
 */
let staleLaunchFlagOnDisk = false;

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setThemeMode: (themeMode) => set({themeMode}),
      setRepeatMode: (repeatMode) => set({repeatMode}),
      setPlaybackSpeed: (playbackSpeed) => set({playbackSpeed}),
      setSleepTimer: (sleepTimerMinutes) => set({sleepTimerMinutes}),
      toggleShuffle: () =>
        set((s) => ({isShuffleOn: !s.isShuffleOn})),
      setRememberPlaybackPosition: (rememberPlaybackPosition) =>
        set({rememberPlaybackPosition}),

      setAudioNormalization: (isAudioNormalizationEnabled) =>
        set({isAudioNormalizationEnabled}),
      setDialogueBoost: (isDialogueBoostEnabled) =>
        set({isDialogueBoostEnabled}),
      setHardwareAcceleration: (isHardwareAccelerationEnabled) =>
        set({isHardwareAccelerationEnabled}),
      setAutoLoadSubtitles: (isAutoLoadSubtitlesEnabled) =>
        set({isAutoLoadSubtitlesEnabled}),
      setPreferredLanguages: (preferredLanguages) => set({preferredLanguages}),
      setExternalSubtitleDirectories: (externalSubtitleDirectories) =>
        set({externalSubtitleDirectories}),

      setSubtitleFontSize: (subtitleFontSize) => set({subtitleFontSize}),
      setSubtitleTextColor: (subtitleTextColor) => set({subtitleTextColor}),
      setSubtitleBackgroundOpacity: (subtitleBackgroundOpacity) =>
        set({subtitleBackgroundOpacity}),

      setSkipSilence: (skipSilenceEnabled) => set({skipSilenceEnabled}),

      setSampleRate: (sampleRate) => set({sampleRate}),
      setReplayGain: (replayGain) => set({replayGain}),
      setGaplessPlayback: (gaplessPlayback) => set({gaplessPlayback}),
      setAudioDelay: (audioDelay) => set({audioDelay}),
      setEqEnabled: (eqEnabled) => set({eqEnabled}),
      setEqPreset: (eqPreset) => set({eqPreset}),
      setEqGains: (eqGains) => set({eqGains}),

      addVideoFolder: (path) =>
        set((s) => {
          if (s.videoFolders.includes(path)) return s;
          return {
            videoFolders: [...s.videoFolders, path],
            linkedFolders: upsertLinkedFolder(s.linkedFolders, path, 'video'),
          };
        }),
      removeVideoFolder: (path) =>
        set((s) => ({
          videoFolders: s.videoFolders.filter((f) => f !== path),
          linkedFolders: s.linkedFolders.filter(
            (f) => !(f.path === path && f.mediaType === 'video'),
          ),
        })),
      addAudioFolder: (path) =>
        set((s) => {
          if (s.audioFolders.includes(path)) return s;
          return {
            audioFolders: [...s.audioFolders, path],
            linkedFolders: upsertLinkedFolder(s.linkedFolders, path, 'audio'),
          };
        }),
      removeAudioFolder: (path) =>
        set((s) => ({
          audioFolders: s.audioFolders.filter((f) => f !== path),
          linkedFolders: s.linkedFolders.filter(
            (f) => !(f.path === path && f.mediaType === 'audio'),
          ),
        })),
      syncLinkedFolders: ({videoFolders, audioFolders}) =>
        set((s) => {
          let next = s.linkedFolders;
          for (const path of videoFolders) {
            next = upsertLinkedFolder(next, path, 'video');
          }
          for (const path of audioFolders) {
            next = upsertLinkedFolder(next, path, 'audio');
          }
          const active = new Set([
            ...videoFolders.map((path) => `${path}:video`),
            ...audioFolders.map((path) => `${path}:audio`),
          ]);
          next = next.filter((f) => active.has(`${f.path}:${f.mediaType}`));
          return {linkedFolders: next};
        }),
      setLinkedFoldersLastScan: ({timestamp, paths}) =>
        set((s) => {
          const pathSet = new Set(paths);
          return {
            linkedFolders: s.linkedFolders.map((f) =>
              pathSet.has(f.path) ? {...f, lastScanAt: timestamp} : f,
            ),
          };
        }),

      setScanning: (isScanning) => set({isScanning}),
      setLastScanTimestamp: (lastScanTimestamp) => set({lastScanTimestamp}),

      setMpvOptions: (mpvOptions) => set({mpvOptions}),

      setLargerControls: (largerControls) => set({largerControls}),
      setHighContrastSubtitles: (highContrastSubtitles) =>
        set({highContrastSubtitles}),
      setScanOnLaunch: (scanOnLaunch) => set({scanOnLaunch}),
      setNotificationsEnabled: (notificationsEnabled) =>
        set({notificationsEnabled}),
      setAppLanguage: (appLanguage) => set({appLanguage}),

      setAutoDeleteDownloads: (autoDeleteDownloads) =>
        set({autoDeleteDownloads: Math.max(0, Math.floor(autoDeleteDownloads))}),

      setHomeCity: (homeCity) => set({homeCity}),

      reset: () => set({...initialState}),

      resetPreferences: () => {
        const {
          videoFolders,
          audioFolders,
          linkedFolders,
          lastScanTimestamp,
        } = get();
        set({
          ...initialState,
          videoFolders,
          audioFolders,
          linkedFolders,
          lastScanTimestamp,
        });
      },
    }),
    {
      name: 'settings',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
      /**
       * `hasLaunched` was persisted by the versions that still had a JS
       * splash screen. It is not part of the state any more, so it is
       * dropped on the way in — an install that still carries it sheds it
       * here rather than keeping a key nothing reads.
       */
      merge: (persisted, current) => {
        const {hasLaunched: _dropped, ...rest} = (persisted ?? {}) as Partial<SettingsState> & {
          hasLaunched?: boolean;
        };
        staleLaunchFlagOnDisk = _dropped !== undefined;
        return {...current, ...rest};
      },
      /**
       * Force one write when the merge shed a stale `hasLaunched`, so the
       * dead key leaves the persisted blob too — see the note on
       * `staleLaunchFlagOnDisk`. The write carries the merged state (the key
       * is already gone from it) and the flag is cleared, so this happens
       * once, on the launch that finds the key, and not on every launch.
       */
      onRehydrateStorage: () => () => {
        if (!staleLaunchFlagOnDisk) {
          return;
        }
        staleLaunchFlagOnDisk = false;
        useSettingsStore.setState({});
      },
    },
  ),
);
