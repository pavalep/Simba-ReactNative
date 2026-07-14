import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {RepeatMode} from '../../types';

interface SettingsState {
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
}

const initialState: SettingsState = {
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
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
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
    resetToDefaults() {
      return initialState;
    },
  },
});

export const {
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
  resetToDefaults,
} = settingsSlice.actions;
export default settingsSlice.reducer;
