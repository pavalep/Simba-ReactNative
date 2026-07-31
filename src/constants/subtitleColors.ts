// ────────────────────────────────────────────────────────
// Simba Player — Subtitle Color Presets (55.8 data)
// User-selectable mpv subtitle colors. This is DATA passed
// to the mpv `sub-color` property, not UI styling — kept
// out of src/screens & src/components so the color-literal
// gate (P55.8) only covers theme styling.
// ────────────────────────────────────────────────────────

export interface SubtitleColorPreset {
  hex: string;
  label: string;
}

export const SUBTITLE_COLOR_PRESETS: SubtitleColorPreset[] = [
  {hex: '#FFFFFF', label: 'White'},
  {hex: '#FFE066', label: 'Yellow'},
  {hex: '#66D9FF', label: 'Cyan'},
  {hex: '#66FF99', label: 'Green'},
  {hex: '#FF66B2', label: 'Pink'},
];

/** Default subtitle text color (mpv sub-color). */
export const DEFAULT_SUBTITLE_COLOR = SUBTITLE_COLOR_PRESETS[0].hex;
