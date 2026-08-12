import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {RepeatMode} from '../../types';
import {DEFAULT_SUBTITLE_COLOR} from '../../constants/subtitleColors';

interface MpvOption {
  key: string;
  value: string;
}

interface SettingsState {
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
  sampleRate: number; // Hz, 0 = system default
  replayGain: 'no' | 'track' | 'album';
  gaplessPlayback: boolean;
  audioDelay: number; // seconds, negative = delay audio
  eqEnabled: boolean;
  eqPreset: string;
  eqGains: number[]; // 10 band gains in dB

  // Linked folders (Phase 22)
  videoFolders: string[];
  audioFolders: string[];
  lastScanTimestamp: number | null;
  isScanning: boolean;

  // MPV advanced options (Phase 19)
  mpvOptions: MpvOption[];

  // App lifecycle
  hasLaunched: boolean;

  // Accessibility & misc (Phase 46)
  largerControls: boolean;
  highContrastSubtitles: boolean;
  scanOnLaunch: boolean;
  notificationsEnabled: boolean;
  appLanguage: string;
  /** 49.6: keep the last N completed downloads (0 = off). */
  autoDeleteDownloads: number;

  // P61: home greeting. Empty = use IP geolocation; non-empty =
  // user-override city (e.g. "Mumbai"). Persisted via redux-persist
  // so the choice survives a relaunch.
  homeCity: string;
}

const initialState: SettingsState = {
  themeMode: 'system',
  repeatMode: 'off',
  playbackSpeed: 1.0,
  sleepTimerMinutes: 0,
  isShuffleOn: false,
  rememberPlaybackPosition: true,

  // Preferences defaults
  isAudioNormalizationEnabled: false,
  isDialogueBoostEnabled: false,
  isHardwareAccelerationEnabled: true,
  isAutoLoadSubtitlesEnabled: true,
  preferredLanguages: 'eng, jpn, und',
  externalSubtitleDirectories: './subs, ./subtitles',

  // Subtitle appearance defaults
  subtitleFontSize: 16,
  subtitleTextColor: DEFAULT_SUBTITLE_COLOR,
  subtitleBackgroundOpacity: 0.5,

  // Playback extras defaults
  skipSilenceEnabled: false,

  // Audio settings defaults
  sampleRate: 0,
  replayGain: 'no',
  gaplessPlayback: false,
  audioDelay: 0,
  eqEnabled: false,
  eqPreset: 'Flat',
  eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

  // Linked folders defaults
  videoFolders: [],
  audioFolders: [],
  lastScanTimestamp: null,
  isScanning: false,

  // MPV advanced options defaults
  mpvOptions: [],

  // App lifecycle defaults
  hasLaunched: false,

  // Accessibility & misc defaults
  largerControls: false,
  highContrastSubtitles: false,
  scanOnLaunch: false,
  notificationsEnabled: true,
  appLanguage: 'system',

  // Downloads defaults
  autoDeleteDownloads: 0,

  // Weather greeting defaults
  homeCity: '',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<'dark' | 'light' | 'system'>) {
      state.themeMode = action.payload;
    },
    setRepeatMode(state, action: PayloadAction<RepeatMode>) {
      state.repeatMode = action.payload;
    },
    setPlaybackSpeed(state, action: PayloadAction<number>) {
      state.playbackSpeed = action.payload;
    },
    setSleepTimer(state, action: PayloadAction<number>) {
      state.sleepTimerMinutes = action.payload;
    },
    toggleShuffle(state) {
      state.isShuffleOn = !state.isShuffleOn;
    },
    setRememberPlaybackPosition(state, action: PayloadAction<boolean>) {
      state.rememberPlaybackPosition = action.payload;
    },

    // Preferences toggles
    setAudioNormalization(state, action: PayloadAction<boolean>) {
      state.isAudioNormalizationEnabled = action.payload;
    },
    setDialogueBoost(state, action: PayloadAction<boolean>) {
      state.isDialogueBoostEnabled = action.payload;
    },
    setHardwareAcceleration(state, action: PayloadAction<boolean>) {
      state.isHardwareAccelerationEnabled = action.payload;
    },
    setAutoLoadSubtitles(state, action: PayloadAction<boolean>) {
      state.isAutoLoadSubtitlesEnabled = action.payload;
    },
    setPreferredLanguages(state, action: PayloadAction<string>) {
      state.preferredLanguages = action.payload;
    },
    setExternalSubtitleDirectories(state, action: PayloadAction<string>) {
      state.externalSubtitleDirectories = action.payload;
    },

    // ── Subtitle Appearance (Phase 22) ──
    setSubtitleFontSize(state, action: PayloadAction<number>) {
      state.subtitleFontSize = action.payload;
    },
    setSubtitleTextColor(state, action: PayloadAction<string>) {
      state.subtitleTextColor = action.payload;
    },
    setSubtitleBackgroundOpacity(state, action: PayloadAction<number>) {
      state.subtitleBackgroundOpacity = action.payload;
    },

    // ── Playback Extras (Phase 22) ──
    setSkipSilence(state, action: PayloadAction<boolean>) {
      state.skipSilenceEnabled = action.payload;
    },

    // ── Downloads (Phase 49) ──
    setAutoDeleteDownloads(state, action: PayloadAction<number>) {
      state.autoDeleteDownloads = Math.max(0, Math.floor(action.payload));
    },

    // ── Weather greeting (Phase 61) ──
    setHomeCity(state, action: PayloadAction<string>) {
      state.homeCity = action.payload;
    },

    // ── Audio Settings (Phase 45) ──
    setSampleRate(state, action: PayloadAction<number>) {
      state.sampleRate = action.payload;
    },
    setReplayGain(state, action: PayloadAction<'no' | 'track' | 'album'>) {
      state.replayGain = action.payload;
    },
    setGaplessPlayback(state, action: PayloadAction<boolean>) {
      state.gaplessPlayback = action.payload;
    },
    setAudioDelay(state, action: PayloadAction<number>) {
      state.audioDelay = action.payload;
    },
    setEqEnabled(state, action: PayloadAction<boolean>) {
      state.eqEnabled = action.payload;
    },
    setEqPreset(state, action: PayloadAction<string>) {
      state.eqPreset = action.payload;
    },
    setEqGains(state, action: PayloadAction<number[]>) {
      state.eqGains = action.payload;
    },

    // Linked folder management (Phase 22)
    addVideoFolder(state, action: PayloadAction<string>) {
      if (!state.videoFolders.includes(action.payload)) {
        state.videoFolders.push(action.payload);
      }
    },
    removeVideoFolder(state, action: PayloadAction<string>) {
      state.videoFolders = state.videoFolders.filter(f => f !== action.payload);
    },
    addAudioFolder(state, action: PayloadAction<string>) {
      if (!state.audioFolders.includes(action.payload)) {
        state.audioFolders.push(action.payload);
      }
    },
    removeAudioFolder(state, action: PayloadAction<string>) {
      state.audioFolders = state.audioFolders.filter(f => f !== action.payload);
    },
    setScanning(state, action: PayloadAction<boolean>) {
      state.isScanning = action.payload;
    },
    setLastScanTimestamp(state, action: PayloadAction<number>) {
      state.lastScanTimestamp = action.payload;
    },
    setMpvOptions(state, action: PayloadAction<MpvOption[]>) {
      state.mpvOptions = action.payload;
    },

    // ── App lifecycle ──
    markLaunched(state) {
      state.hasLaunched = true;
    },

    // ── Accessibility & misc (Phase 46) ──
    setLargerControls(state, action: PayloadAction<boolean>) {
      state.largerControls = action.payload;
    },
    setHighContrastSubtitles(state, action: PayloadAction<boolean>) {
      state.highContrastSubtitles = action.payload;
    },
    setScanOnLaunch(state, action: PayloadAction<boolean>) {
      state.scanOnLaunch = action.payload;
    },
    setNotificationsEnabled(state, action: PayloadAction<boolean>) {
      state.notificationsEnabled = action.payload;
    },
    setAppLanguage(state, action: PayloadAction<string>) {
      state.appLanguage = action.payload;
    },

    resetToDefaults() {
      return initialState;
    },
  },
});

export const {
  setThemeMode,
  setRepeatMode,
  setPlaybackSpeed,
  setSleepTimer,
  toggleShuffle,
  setRememberPlaybackPosition,

  setAudioNormalization,
  setDialogueBoost,
  setHardwareAcceleration,
  setAutoLoadSubtitles,
  setPreferredLanguages,
  setExternalSubtitleDirectories,

  setSubtitleFontSize,
  setSubtitleTextColor,
  setSubtitleBackgroundOpacity,

  setSkipSilence,

  setSampleRate,
  setReplayGain,
  setGaplessPlayback,
  setAudioDelay,
  setEqEnabled,
  setEqPreset,
  setEqGains,

  addVideoFolder,
  removeVideoFolder,
  addAudioFolder,
  removeAudioFolder,
  setScanning,
  setLastScanTimestamp,

  setMpvOptions,

  markLaunched,

  setLargerControls,
  setHighContrastSubtitles,
  setScanOnLaunch,
  setNotificationsEnabled,
  setAppLanguage,

  setAutoDeleteDownloads,
  setHomeCity,

  resetToDefaults,
} = settingsSlice.actions;
export default settingsSlice.reducer;
