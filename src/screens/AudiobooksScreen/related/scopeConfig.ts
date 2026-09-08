// V18.11.3: the 3-tab scope config (search/genres/recent) is gone —
// the v10+ Audiobooks screen uses a single search stream + a
// FilterChips row for the genre (data is `genre` strings, not
// scope keys). The export is kept for any other module that
// imports the genre list.
export const AUDIOBOOK_GENRE_OPTIONS: Array<{key: string; label: string}> = [];
