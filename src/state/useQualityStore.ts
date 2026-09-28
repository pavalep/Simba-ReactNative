/**
 * V19 W3.5.6 — `useQualityStore`.
 *
 * MMKV-backed Zustand store for the user's chosen "Video quality"
 * preset. The preset is the mapping the chrome renders into a 3-chip
 * group (Battery saver / Balanced / High quality) — it stores which
 * chip is active; the chip → mpv (`hwdec` + `profile`) translation
 * lives in `VideoMoreSheet.tsx` so the chrome never composes mpv
 * property strings directly.
 *
 * Why a store (and not just `useState` in the More menu):
 *   - Persists across app restarts via MMKV.
 *   - Matches `useCaptionSettingsStore` (the W3.6.2 reference).
 *   - The preset is also reflected in V7 acceptance matrix QA
 *     ("Quality preset survives app restart").
 *
 * Mapping (3 presets × 2 mpv properties):
 *
 *   ┌──────────────────┬────────────────────┬───────────────────────┐
 *   │ V19 preset       │ mpv `hwdec`        │ mpv `profile`         │
 *   ├──────────────────┼────────────────────┼───────────────────────┤
 *   │ battery-saver    │ `mediacodec`       │ `fast`                │
 *   │ balanced         │ `auto`             │ (empty / default)     │
 *   │ high-quality     │ `no`               │ `high-quality`        │
 *   └──────────────────┴────────────────────┴───────────────────────┘
 *
 * Persistence: MMKV via `sharedMMKVStorage`, key `player.qualityPreset`.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3.10 + audit doc + lib 1.6.0 added `setShuffle` + promoted
 * `setAudioFilter` / `setVideoFilter` (we use `commands.setProperty`
 * because W3.5.6's mapping doesn't need named filters).
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

export type VideoQualityPreset = 'battery-saver' | 'balanced' | 'high-quality';

export const VIDEO_QUALITY_PRESETS: ReadonlyArray<{
  value: VideoQualityPreset;
  label: string;
  description: string;
}> = [
  {
    value: 'battery-saver',
    label: 'Battery saver',
    description: 'Hardware decoding, lower quality rendering',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Auto-decoding, default rendering',
  },
  {
    value: 'high-quality',
    label: 'High quality',
    description: 'Software decoding, high-quality scaling',
  },
];

export interface QualityPresetActions {
  setPreset: (preset: VideoQualityPreset) => void;
  reset: () => void;
}

interface QualityState {
  preset: VideoQualityPreset;
}

export type QualityStore = QualityState & QualityPresetActions;

const DEFAULT_QUALITY_PRESET: VideoQualityPreset = 'balanced';

/**
 * Map V19 preset → mpv (hwdec, profile) tuple. Consumed by
 * VideoMoreSheet's quality chip handler:
 *
 *   const [hwdec, profile] = presetToMpv(preset);
 *   commands.setProperty('hwdec', hwdec);
 *   commands.setProperty('profile', profile);
 */
export function presetToMpv(
  preset: VideoQualityPreset,
): {hwdec: string; profile: string} {
  switch (preset) {
    case 'battery-saver':
      return {hwdec: 'mediacodec', profile: 'fast'};
    case 'high-quality':
      return {hwdec: 'no', profile: 'high-quality'};
    case 'balanced':
    default:
      return {hwdec: 'auto', profile: ''};
  }
}

export const useQualityStore = create<QualityStore>()(
  persist(
    set => ({
      preset: DEFAULT_QUALITY_PRESET,
      setPreset: (preset: VideoQualityPreset) => set({preset}),
      reset: () => set({preset: DEFAULT_QUALITY_PRESET}),
    }),
    {
      name: 'player.qualityPreset',
      storage: createJSONStorage(() => sharedMMKVStorage),
      version: CURRENT_PERSIST_VERSION,
    },
  ),
);

// Convenience alias used by VideoMoreSheet so consumers don't have
// to import `useQualityStore` AND destruct `preset` separately.
export function useQualityPreset(): VideoQualityPreset {
  return useQualityStore(s => s.preset);
}
