import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {RepeatMode} from '../../types';

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

  // Linked folders (Phase 22)
  videoFolders: string[];
  audioFolders: string[];
  lastScanTimestamp: number | null;
  isScanning: boolean;

  // MPV advanced options (Phase 19)
  mpvOptions: MpvOption[];
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

  // Linked folders defaults
  videoFolders: [],
  audioFolders: [],
  lastScanTimestamp: null,
  isScanning: false,

  // MPV advanced options defaults
  mpvOptions: [],
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

  addVideoFolder,
  removeVideoFolder,
  addAudioFolder,
  removeAudioFolder,
  setScanning,
  setLastScanTimestamp,

  setMpvOptions,

  resetToDefaults,
} = settingsSlice.actions;
export default settingsSlice.reducer;
