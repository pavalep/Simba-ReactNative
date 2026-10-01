/**
 * V19 W3.6 Phase 3.6.2 — `useCaptionSettingsStore`.
 *
 * MMKV-backed Zustand store for caption style preferences:
 *
 *   - `fontSize`: small | medium | large | extra-large
 *   - `backgroundOpacity`: none | fifty | solid
 *   - `position`: bottom | top
 *
 * Persistence: MMKV via `sharedMMKVStorage` (matches the rest
 * of the app's persistence layer). The settings persist across
 * app restarts so the user's caption preferences follow them
 * everywhere.
 *
 * The lib receives the rendered preferences via mpv properties, pushed
 * by `useCaptionStyleBridge` (which owns the only writer — see that
 * hook for the property list and the re-apply rule).
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3 + TRACKER Phase 3.6.2.
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

export type CaptionFontSize = 'small' | 'medium' | 'large' | 'extra-large';
export type CaptionBackgroundOpacity = 'none' | 'fifty' | 'solid';
export type CaptionPosition = 'bottom' | 'top';
/** Outline weight around the glyphs. mpv's `sub-border-size` units. */
export type CaptionBorder = 'none' | 'thin' | 'thick';

export interface CaptionSettings {
  fontSize: CaptionFontSize;
  backgroundOpacity: CaptionBackgroundOpacity;
  position: CaptionPosition;
  border: CaptionBorder;
}

export interface CaptionSettingsActions {
  setFontSize: (size: CaptionFontSize) => void;
  setBackgroundOpacity: (opacity: CaptionBackgroundOpacity) => void;
  setPosition: (position: CaptionPosition) => void;
  setBorder: (border: CaptionBorder) => void;
  reset: () => void;
}

const DEFAULT_CAPTION_SETTINGS: CaptionSettings = {
  fontSize: 'medium',
  backgroundOpacity: 'fifty',
  position: 'bottom',
  border: 'thin',
};

/** Map V19 font-size vocab → lib mpv `--sub-font-size` px value. */
export function fontSizeToMpvPx(size: CaptionFontSize): number {
  switch (size) {
    case 'small':
      return 18;
    case 'medium':
      return 24;
    case 'large':
      return 32;
    case 'extra-large':
      return 42;
  }
}

/** Map V19 background-opacity vocab → lib mpv `--sub-back-color`. */
export function backgroundOpacityToMpvColor(opacity: CaptionBackgroundOpacity): string {
  switch (opacity) {
    case 'none':
      return '#00000000'; // transparent
    case 'fifty':
      return '#00000080'; // ~50% alpha black
    case 'solid':
      return '#FF000000'; // opaque black
  }
}

/** Map V19 position vocab → lib mpv `--sub-pos` (0..100, percent from top). */
export function positionToMpvPos(position: CaptionPosition): number {
  return position === 'top' ? 5 : 95;
}

/** Map V19 border vocab → lib mpv `--sub-border-size`. */
export function borderToMpvBorderSize(border: CaptionBorder): number {
  switch (border) {
    case 'none':
      return 0;
    case 'thin':
      return 2;
    case 'thick':
      return 5;
  }
}

/** Map V19 position vocab → lib mpv `--sub-align` (0 top, 10 bottom). */
export function positionToMpvAlign(position: CaptionPosition): number {
  // mpv's own default is 10, so `bottom` is the no-change case and the
  // zero value is spent on the setting a user is unlikely to pick.
  return position === 'top' ? 0 : 10;
}

export const useCaptionSettingsStore = create<
  CaptionSettings & CaptionSettingsActions
>()(
  persist(
    set => ({
      ...DEFAULT_CAPTION_SETTINGS,
      setFontSize: (fontSize: CaptionFontSize) => set({fontSize}),
      setBackgroundOpacity: (backgroundOpacity: CaptionBackgroundOpacity) =>
        set({backgroundOpacity}),
      setPosition: (position: CaptionPosition) => set({position}),
      setBorder: (border: CaptionBorder) => set({border}),
      reset: () => set(DEFAULT_CAPTION_SETTINGS),
    }),
    {
      name: 'player.captionStyle',
      storage: createJSONStorage(() => sharedMMKVStorage),
      version: CURRENT_PERSIST_VERSION,
      // Persisted payloads predate `border`, and zustand's default merge
      // is a shallow object spread — so a returning user would rehydrate
      // `border: undefined` and every consumer would have to defend
      // against it. Backfill the current defaults for any key the
      // payload is missing instead, which also makes adding a setting in
      // future a non-event for existing installs.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<CaptionSettings> | undefined),
      }),
    },
  ),
);
