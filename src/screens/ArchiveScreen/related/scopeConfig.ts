// ─── Archive Screen — the media scope ──────────────────────────────────
//
// ONE scope, ONE owner.
//
// The screen used to draw TWO chip rows of its own, outside any shared
// shell: a row of quick-search PRESETS ("Old Time Radio", "Live
// Concerts", …) and a row of the MEDIA SCOPE (Audio / Video). The
// presets are gone (see the report: they are pre-typed SEARCH TERMS, and
// the shell's search field is the one way to search — a second control
// for the same action).
//
// The media scope is a real filter AXIS: it decides WHICH of the archive's
// two mediatypes the list is answering — `mediatype:(audio)` or
// `mediatype:(movies)` — and it is the screen's ONE filter group (see
// `related/browseConfig.ts`).
//
// THE KEYS ARE THE ROUTE PARAM'S VALUES
// ------------------------------------
// `ArchiveScreen`'s route param is `{initialTab?: 'audio' | 'video';
// query?: string}`. The shared `useSectionOptions` seeds a filter group
// from a route param only when the param's VALUE is one of that group's
// option keys — so 'audio' and 'video' have to BE the keys, and they are.
//
// (`initialTab` is a legacy name — the screen has had no tab bar since
// V18.11.3. The rename needs `src/navigation/types.ts`, which this
// screen does not own; it is filed as a SHARED CHANGE REQUESTED. The
// current name keeps working.)

/** Which of the archive's two mediatypes the list is answering. */
export type ArchiveMediaType = 'audio' | 'video';

/**
 * The media scope — the ONE filter group's options.
 *
 * `key` is the scope's id in the shell's option state (and the value the
 * route param carries); `label` is what the sheet's chip reads.
 */
export const ARCHIVE_MEDIA_SCOPES: Array<{
  key: ArchiveMediaType;
  label: string;
}> = [
  {key: 'audio', label: 'Audio'},
  {key: 'video', label: 'Video'},
];

/**
 * The scope's own BROWSE DEFAULT — the term the archive is asked for when
 * the user has not typed one.
 *
 * It exists because the archive's raw mediatype buckets are not browsable:
 *
 *   • `(*) AND mediatype:(movies)` — the whole movies bucket — measured
 *     on 2026-11-18: 17,735,977 rows, and the first page is user uploads
 *     and test files ("336d9cb9d3b5211ca65b6007cd1b4e1f.mp4",
 *     "32afaanoromoooromolanguageislamvideo"). It is also SLOW: the cold
 *     page 1 did not answer inside 45 s (and once inside 120 s), while the
 *     app's own client timeout for this endpoint is 30 s
 *     (`src/constants/api.ts`). A browse that times out on its first
 *     screen is not a browse.
 *   • `(*) AND mediatype:(audio)` — 14,320,987 rows; it answers (25 s
 *     cold) but it is the same raw bucket.
 *
 * The curated subjects do answer, and they answer with the material the
 * screen is for:
 *
 *   • `(classic films) AND mediatype:(movies)` — 6,809 rows, first page
 *     led with "Cavalcade Of America (1956)" and "His Girl Friday";
 *   • `(old time radio) AND mediatype:(audio)` — 52,794 rows, first page
 *     led with real old-time-radio shows.
 *
 * So the scope's default browse is a curated subject, and the scope chip
 * still states the mediatype truthfully ("Audio" really is audio).
 *
 * The default is used ONLY while the user has typed nothing: a term the
 * user typed always wins, so switching the scope never silently discards
 * what they searched for.
 */
export const ARCHIVE_SCOPE_DEFAULT_TERM: Record<ArchiveMediaType, string> = {
  audio: 'old time radio',
  video: 'classic films',
};

/**
 * The scope a route param names.
 *
 * `ArchiveScreen`'s param is `{initialTab?: 'audio' | 'video'}` — a
 * legacy tab name (the screen has had no tab bar since V18.11.3; the
 * rename needs `src/navigation/types.ts`, which this screen does not
 * own, so it is filed as a SHARED CHANGE REQUESTED).
 *
 * The param's VALUE is the scope's KEY, so it is read as one. Anything
 * else — including no param at all — is the default scope.
 */
export function archiveScopeFromParam(value: unknown): ArchiveMediaType {
  return value === 'video' ? 'video' : 'audio';
}
