/**
 * WAVE B15 — the playback SPEED list, with ONE owner.
 *
 * It used to live inside `VideoMoreSheet`, which meant the audio lane
 * could not offer a speed control without either importing a video-lane
 * file or copying the list. A list of speeds is a fact about the player,
 * not about a lane, so it lives here and both lanes read it.
 *
 * The values are the ones YouTube, Spotify, Apple Music and every podcast
 * app offer for spoken word, plus 2× for the "let me get through this"
 * case. mpv takes the rate directly, so there is no rounding to argue
 * about.
 */
export const SPEED_OPTIONS: ReadonlyArray<{value: number; label: string}> = [
  {value: 0.5, label: '0.5×'},
  {value: 1, label: '1×'},
  {value: 1.25, label: '1.25×'},
  {value: 1.5, label: '1.5×'},
  {value: 2, label: '2×'},
];
